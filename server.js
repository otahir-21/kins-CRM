const path = require('path');
// Load .env from app root so it works regardless of PM2/cwd
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const {
  getAllUsers,
  getUserById,
  getUserWithAuthData,
  getUserDocuments,
  getCompleteUserProfile,
  getAllUsersComplete,
  searchUsersByName,
  getUsersByGender,
  getUsersWithDocuments,
  updateUser,
  softDeleteUser,
  getUserStatistics
} = require('./data-helpers');

const {
  sendNotification,
  sendBulkNotifications,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationStats,
  saveFCMToken,
  getFCMToken
} = require('./notifications-helpers');

const {
  createSurvey,
  getAllSurveys,
  getSurveyById,
  getActiveHomePageSurvey,
  updateSurvey,
  deleteSurvey,
  submitSurveyResponse,
  getUserSurveyResponse,
  getSurveyAnalytics,
  getUserSurveyResponses
} = require('./surveys-helpers');

const {
  getPostsPaginated,
  getPostById,
  deletePost,
  hardDeletePost,
  getReportedPostsPaginated
} = require('./posts-helpers');

const {
  getOnboardingSteps,
  getOnboardingStepById,
  createOnboardingStep,
  updateOnboardingStep,
  deleteOnboardingStep
} = require('./onboarding-helpers');

const compression = require('compression');
const crypto = require('crypto');
const { uploadToBunnyCDN } = require('./upload-helpers');
const authRoutes = require('./auth-routes');
const Ad = require('./models/Ad');
const BunnyService = require('./services/BunnyService');
// Load config/db so optional query timing is applied; it re-exports connectDB from lib/mongodb
const { connectDB } = require('./config/db');
const { ensureMongo } = require('./middleware/ensureMongoMiddleware');
const { requestTimingMiddleware } = require('./middleware/requestTimingMiddleware');
const interestsMongoRoutes = require('./routes/interestsMongoRoutes');
const v1Routes = require('./routes/v1');

if (process.env.MONGODB_URI) {
  connectDB().catch((err) => console.error('MongoDB connection failed:', err.message));
}

const app = express();

// Multer: in-memory storage for uploads (no disk write)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error('Only images (JPEG, PNG, GIF, WebP) are allowed'), false);
  },
});

// Middleware
app.use(cors());
app.use(compression()); // gzip responses – smaller payloads, faster over network
app.use(express.json());

// Request timing: log total request duration (ms) for performance auditing
app.use(requestTimingMiddleware);

// Ensure MongoDB connection for all routes (critical for Vercel serverless)
app.use(ensureMongo);

// Performance logging: log duration before routes run
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[PERF] ${req.method} ${req.originalUrl} - ${Date.now() - start}ms`);
  });
  next();
});

// Auth routes (Twilio Verify + JWT)
app.use('/auth', authRoutes);

// Interests master list (MongoDB, no Firebase)
app.use('/interests', interestsMongoRoutes.dashboard);
app.use('/api/interests', interestsMongoRoutes.dashboard);

// API v1: JWT auth, profile, interests — use this for mobile app (MongoDB only)
app.use('/api/v1', v1Routes);

// API information (moved from / so GET / can serve the CRM frontend)
app.get('/api-info', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    success: true,
    service: 'KINS CRM API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: `${baseUrl}/health`,
      auth: {
        sendOtp: { method: 'POST', url: `${baseUrl}/auth/send-otp`, body: { phone: '+1234567890' } },
        verifyOtp: { method: 'POST', url: `${baseUrl}/auth/verify-otp`, body: { phone: '+1234567890', code: '123456' } }
      },
      users: {
        all: `${baseUrl}/api/users`,
        allComplete: `${baseUrl}/api/users?complete=true`,
        byId: `${baseUrl}/api/users/:userId`,
        byIdComplete: `${baseUrl}/api/users/:userId?complete=true`,
        documents: `${baseUrl}/api/users/:userId/documents`,
        search: `${baseUrl}/api/users/search/:term`,
        filterByGender: `${baseUrl}/api/users/filter/gender/:gender`,
        withDocuments: `${baseUrl}/api/users/with-documents`
      },
      statistics: `${baseUrl}/api/statistics`,
      updateUser: {
        method: 'PUT',
        url: `${baseUrl}/api/users/:userId`
      },
      interests: {
        getAll: `${baseUrl}/interests`,
        create: { method: 'POST', url: `${baseUrl}/interests`, body: { name: 'Sleep' } },
        update: { method: 'PUT', url: `${baseUrl}/interests/:id` },
        delete: { method: 'DELETE', url: `${baseUrl}/interests/:id` }
      },
      v1: {
        base: `${baseUrl}/api/v1`,
        authLogin: { method: 'POST', url: `${baseUrl}/api/v1/auth/login` },
        me: { method: 'GET', url: `${baseUrl}/api/v1/me` },
        meAbout: { method: 'PUT', url: `${baseUrl}/api/v1/me/about` },
        meDelete: { method: 'DELETE', url: `${baseUrl}/api/v1/me` },
        meInterests: { method: 'GET', url: `${baseUrl}/api/v1/me/interests` },
        meInterestsSet: { method: 'POST', url: `${baseUrl}/api/v1/me/interests` },
        meFcmToken: { method: 'POST', url: `${baseUrl}/api/v1/me/fcm-token`, body: { fcmToken: '...' } },
        meFirebaseToken: { method: 'GET', url: `${baseUrl}/api/v1/me/firebase-token` },
        interests: `${baseUrl}/api/v1/interests`,
        postsCreate: { method: 'POST', url: `${baseUrl}/api/v1/posts`, note: 'multipart/form-data for media' },
        postsGet: { method: 'GET', url: `${baseUrl}/api/v1/posts/:id` },
        postsDelete: { method: 'DELETE', url: `${baseUrl}/api/v1/posts/:id` },
        feed: { method: 'GET', url: `${baseUrl}/api/v1/feed?page=1&limit=20` },
        postSave: { method: 'POST', url: `${baseUrl}/api/v1/posts/:postId/save`, note: 'Save (bookmark) post (JWT)' },
        postUnsave: { method: 'DELETE', url: `${baseUrl}/api/v1/posts/:postId/save`, note: 'Unsave post (JWT)' },
        postSaveStatus: { method: 'GET', url: `${baseUrl}/api/v1/posts/:postId/save/status`, note: 'Check if post is saved (JWT)' },
        meSavedPosts: { method: 'GET', url: `${baseUrl}/api/v1/me/saved-posts?page=1&limit=20`, note: 'List saved posts, same shape as feed (JWT)' },
        suggestions: { method: 'GET', url: `${baseUrl}/api/v1/users/suggestions?limit=20`, note: 'Suggested for you (automatic: shared interests + popular)' },
        nearby: { method: 'GET', url: `${baseUrl}/api/v1/users/nearby?latitude=25.2&longitude=55.3&radiusKm=50&limit=100`, note: 'Nearby kins for map pins (locationIsVisible: true)' },
        adsActive: { method: 'GET', url: `${baseUrl}/api/v1/ads/active`, note: 'Public: active ads for app (no auth)' },
        adsList: { method: 'GET', url: `${baseUrl}/api/v1/ads`, note: 'CRM: list ads (JWT)' },
        adsCreate: { method: 'POST', url: `${baseUrl}/api/v1/ads`, body: 'multipart: image, link, title?, isActive?, order?', note: 'CRM: create ad (JWT)' },
        adsUpdate: { method: 'PUT', url: `${baseUrl}/api/v1/ads/:id`, note: 'CRM: update ad (JWT)' },
        adsDelete: { method: 'DELETE', url: `${baseUrl}/api/v1/ads/:id`, note: 'CRM: delete ad (JWT)' },
        surveysForMe: { method: 'GET', url: `${baseUrl}/api/v1/surveys/for-me`, note: 'App: surveys not yet answered (JWT)' },
        surveyById: { method: 'GET', url: `${baseUrl}/api/v1/surveys/:surveyId` },
        surveyRespond: { method: 'POST', url: `${baseUrl}/api/v1/surveys/:surveyId/respond`, body: { responses: [{ questionId: 'q0', optionId: 'opt0' }] }, note: 'App: submit response (JWT)' },
        chatNotify: { method: 'POST', url: `${baseUrl}/api/v1/chat/notify`, body: 'type, recipientIds, senderId, senderName, messagePreview, conversationId|groupId+groupName', note: 'See docs/CHAT_NOTIFICATIONS.md' }
      },
      surveys: {
        create: { method: 'POST', url: `${baseUrl}/api/surveys` },
        getAll: `${baseUrl}/api/surveys`,
        getActive: `${baseUrl}/api/surveys/active`,
        getById: `${baseUrl}/api/surveys/:surveyId`,
        update: { method: 'PUT', url: `${baseUrl}/api/surveys/:surveyId` },
        delete: { method: 'DELETE', url: `${baseUrl}/api/surveys/:surveyId` },
        submitResponse: { method: 'POST', url: `${baseUrl}/api/surveys/:surveyId/respond` },
        analytics: `${baseUrl}/api/surveys/:surveyId/analytics`
      },
      onboarding: {
        getSteps: `${baseUrl}/api/onboarding`,
        getStepsForApp: `${baseUrl}/api/onboarding?activeOnly=true`,
        getById: `${baseUrl}/api/onboarding/:stepId`,
        create: { method: 'POST', url: `${baseUrl}/api/onboarding` },
        update: { method: 'PUT', url: `${baseUrl}/api/onboarding/:stepId` },
        delete: { method: 'DELETE', url: `${baseUrl}/api/onboarding/:stepId` }
      },
      upload: {
        image: { method: 'POST', url: `${baseUrl}/api/upload/image`, body: 'multipart/form-data, field: image' }
      }
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'KINS CRM API'
  });
});

// Get all users (basic)
app.get('/api/users', async (req, res) => {
  try {
    const { complete } = req.query;
    
    if (complete === 'true') {
      const users = await getAllUsersComplete();
      return res.json({ success: true, count: users.length, data: users });
    }
    
    const users = await getAllUsers();
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user by ID
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { complete } = req.query;
    
    if (complete === 'true') {
      const user = await getCompleteUserProfile(userId);
      if (!user.firestore && !user.auth) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      return res.json({ success: true, data: user });
    }
    
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error in GET /api/users/:userId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user documents
app.get('/api/users/:userId/documents', async (req, res) => {
  try {
    const { userId } = req.params;
    const documents = await getUserDocuments(userId);
    res.json({ success: true, count: documents.length, data: documents });
  } catch (error) {
    console.error('Error in GET /api/users/:userId/documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search users by name
app.get('/api/users/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const users = await searchUsersByName(term);
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Error in GET /api/users/search/:term:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Filter users by gender
app.get('/api/users/filter/gender/:gender', async (req, res) => {
  try {
    const { gender } = req.params;
    const users = await getUsersByGender(gender);
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Error in GET /api/users/filter/gender/:gender:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get users with documents
app.get('/api/users/with-documents', async (req, res) => {
  try {
    const users = await getUsersWithDocuments();
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Error in GET /api/users/with-documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const stats = await getUserStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in GET /api/statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user
app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    
    // Validate that user exists
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Allowed fields for update
    const allowedFields = ['name', 'gender', 'documentUrl'];
    const filteredData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });
    
    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid fields to update. Allowed fields: name, gender, documentUrl' 
      });
    }
    
    const updatedUser = await updateUser(userId, filteredData);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error in PUT /api/users/:userId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== NOTIFICATIONS ====================

// Send notification to a user
app.post('/api/notifications/send', async (req, res) => {
  try {
    console.log('POST /api/notifications/send called');
    console.log('Request body:', req.body);
    const {
      userId,
      senderId,
      senderName,
      senderProfilePicture,
      type,
      action,
      relatedPostId,
      postThumbnail,
    } = req.body;

    // Validate required fields
    if (!userId || !senderId || !senderName || !type || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, senderId, senderName, type, action',
      });
    }

    const result = await sendNotification(userId, {
      senderId,
      senderName,
      senderProfilePicture,
      type,
      action,
      relatedPostId,
      postThumbnail,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in POST /api/notifications/send:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('FCM token') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

// Send bulk notifications
app.post('/api/notifications/send-bulk', async (req, res) => {
  try {
    const {
      userIds,
      senderId,
      senderName,
      senderProfilePicture,
      type,
      action,
      relatedPostId,
      postThumbnail,
    } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userIds must be a non-empty array',
      });
    }

    if (!senderId || !senderName || !type || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: senderId, senderName, type, action',
      });
    }

    const result = await sendBulkNotifications(userIds, {
      senderId,
      senderName,
      senderProfilePicture,
      type,
      action,
      relatedPostId,
      postThumbnail,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in POST /api/notifications/send-bulk:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get user's notifications
app.get('/api/users/:userId/notifications', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit, unreadOnly } = req.query;

    const options = {};
    if (limit) options.limit = parseInt(limit);
    if (unreadOnly === 'true') options.unreadOnly = true;

    const notifications = await getUserNotifications(userId, options);
    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error('Error in GET /api/users/:userId/notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get notification statistics
app.get('/api/users/:userId/notifications/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await getNotificationStats(userId);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error in GET /api/users/:userId/notifications/stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Mark notification as read
app.put('/api/users/:userId/notifications/:notificationId/read', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    await markNotificationAsRead(userId, notificationId);
    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error in PUT /api/users/:userId/notifications/:notificationId/read:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Mark all notifications as read
app.put('/api/users/:userId/notifications/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await markAllNotificationsAsRead(userId);
    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      count,
    });
  } catch (error) {
    console.error('Error in PUT /api/users/:userId/notifications/read-all:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Save FCM token
app.post('/api/users/:userId/fcm-token', async (req, res) => {
  try {
    const { userId } = req.params;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        error: 'FCM token is required',
      });
    }

    const user = await saveFCMToken(userId, fcmToken);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error in POST /api/users/:userId/fcm-token:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get FCM token
app.get('/api/users/:userId/fcm-token', async (req, res) => {
  try {
    const { userId } = req.params;
    const token = await getFCMToken(userId);
    res.json({
      success: true,
      data: {
        fcmToken: token,
        hasToken: !!token,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/users/:userId/fcm-token:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==================== ADMIN: WARN & DELETE USER ====================

// Admin: send warning to user (in-app notification + push; email not implemented, see docs)
app.post('/api/users/:userId/warn', async (req, res) => {
  try {
    const { userId } = req.params;
    const { message, title } = req.body || {};
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    const result = await sendNotification(userId, {
      type: 'warning',
      title: title || 'Warning from KINS',
      body: message || 'You have received a warning from the KINS team. Please review our community guidelines.',
      senderId: 'admin',
      senderName: 'KINS Admin',
    });
    res.status(200).json({
      success: true,
      message: 'Warning sent. User will see it in-app and receive a push if they have notifications enabled.',
      notificationId: result.notificationId,
    });
  } catch (error) {
    console.error('Error in POST /api/users/:userId/warn:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: soft-delete user (user cannot log in; data retained)
app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    const updated = await softDeleteUser(userId);
    res.status(200).json({
      success: true,
      message: 'User has been deactivated. They can no longer log in.',
      data: updated,
    });
  } catch (error) {
    console.error('Error in DELETE /api/users/:userId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== POSTS MODERATION ====================

// Get posts (paginated - cost effective)
app.get('/api/posts', async (req, res) => {
  try {
    const { limit = 20, startAfter, status = 'active' } = req.query;
    const result = await getPostsPaginated({
      limit: Math.min(parseInt(limit) || 20, 50),
      startAfterDocId: startAfter || null,
      status,
    });
    res.json({
      success: true,
      data: result.posts,
      nextPageToken: result.nextPageToken,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error('Error in GET /api/posts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get reported posts only (paginated)
app.get('/api/posts/reported', async (req, res) => {
  try {
    const { limit = 20, startAfter } = req.query;
    const result = await getReportedPostsPaginated({
      limit: Math.min(parseInt(limit) || 20, 50),
      startAfterDocId: startAfter || null,
    });
    res.json({
      success: true,
      data: result.posts,
      nextPageToken: result.nextPageToken,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error('Error in GET /api/posts/reported:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single post
app.get('/api/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await getPostById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Error in GET /api/posts/:postId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete post (soft delete - status = 'deleted')
app.delete('/api/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { hard } = req.query;
    if (hard === 'true') {
      await hardDeletePost(postId);
      return res.json({ success: true, message: 'Post permanently deleted' });
    }
    const post = await deletePost(postId);
    res.json({ success: true, data: post, message: 'Post deleted (hidden from feed)' });
  } catch (error) {
    console.error('Error in DELETE /api/posts/:postId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ONBOARDING (Walkthrough) ====================

// Get onboarding steps – app: ?activeOnly=true (default); CRM: ?activeOnly=false for all
app.get('/api/onboarding', async (req, res) => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const steps = await getOnboardingSteps({ activeOnly });
    res.json({ success: true, count: steps.length, data: steps });
  } catch (error) {
    console.error('Error in GET /api/onboarding:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single onboarding step
app.get('/api/onboarding/:stepId', async (req, res) => {
  try {
    const { stepId } = req.params;
    const step = await getOnboardingStepById(stepId);
    if (!step) return res.status(404).json({ success: false, error: 'Onboarding step not found' });
    res.json({ success: true, data: step });
  } catch (error) {
    console.error('Error in GET /api/onboarding/:stepId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create onboarding step
app.post('/api/onboarding', async (req, res) => {
  try {
    const step = await createOnboardingStep(req.body);
    res.status(201).json({ success: true, data: step });
  } catch (error) {
    console.error('Error in POST /api/onboarding:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update onboarding step
app.put('/api/onboarding/:stepId', async (req, res) => {
  try {
    const { stepId } = req.params;
    const step = await updateOnboardingStep(stepId, req.body);
    res.json({ success: true, data: step });
  } catch (error) {
    console.error('Error in PUT /api/onboarding/:stepId:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete onboarding step
app.delete('/api/onboarding/:stepId', async (req, res) => {
  try {
    const { stepId } = req.params;
    await deleteOnboardingStep(stepId);
    res.json({ success: true, message: 'Onboarding step deleted' });
  } catch (error) {
    console.error('Error in DELETE /api/onboarding/:stepId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== UPLOAD (Bunny CDN) ====================

// GET /api/upload/image → 405 (use POST with multipart form field "image")
app.get('/api/upload/image', (req, res) => {
  res.status(405).json({
    success: false,
    error: 'Method not allowed. Use POST with multipart/form-data and field name: image',
    uploadEndpoint: '/api/upload/image',
    method: 'POST',
  });
});

// Upload image to Bunny CDN; returns public URL for use in onboarding or profile picture
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'No image file provided. Use field name: image' });
    }
    const ext = (req.file.originalname && req.file.originalname.split('.').pop()) || 'jpg';
    const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext : 'jpg';
    const filename = `onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
    const contentType = req.file.mimetype || 'application/octet-stream';
    const { url } = await uploadToBunnyCDN(req.file.buffer, filename, 'onboarding', contentType);
    res.json({ success: true, url });
  } catch (error) {
    console.error('Error in POST /api/upload/image:', error);
    const isConfigMissing = error.message && (error.message.includes('Bunny CDN config missing') || error.message.includes('not configured'));
    const status = isConfigMissing ? 503 : 500;
    res.status(status).json({ success: false, error: error.message || 'Image upload failed.' });
  }
});

// ==================== ADS (legacy for CRM dashboard) ====================
// Redirect trailing slash so /api/ads/ and /api/ads both work
app.get('/api/ads/', (req, res) => res.redirect(301, '/api/ads'));
app.get('/api/ads/active/', (req, res) => res.redirect(301, '/api/ads/active'));

function toAdResponse(doc) {
  if (!doc || !doc._id) return null;
  return {
    id: doc._id.toString(),
    imageUrl: doc.imageUrl,
    link: doc.link,
    title: doc.title ?? null,
    isActive: doc.isActive ?? true,
    order: doc.order ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

app.get('/api/ads/active', async (req, res) => {
  try {
    const ads = await Ad.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, ads: ads.map(toAdResponse) });
  } catch (err) {
    console.error('GET /api/ads/active:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/ads', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const [ads, total] = await Promise.all([
      Ad.find({}).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ad.countDocuments({}),
    ]);
    res.json({ success: true, ads: ads.map(toAdResponse), pagination: { page, limit, total, hasMore: skip + ads.length < total } });
  } catch (err) {
    console.error('GET /api/ads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/ads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ad ID.' });
    }
    const ad = await Ad.findById(id).lean();
    if (!ad) return res.status(404).json({ success: false, error: 'Ad not found.' });
    res.json({ success: true, ad: toAdResponse(ad) });
  } catch (err) {
    console.error('GET /api/ads/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const adsUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/ads', adsUpload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'Image file is required (field: image).' });
    }
    const link = (req.body.link || '').trim();
    if (!link) return res.status(400).json({ success: false, error: 'link is required.' });
    if (!BunnyService.isConfigured()) {
      return res.status(503).json({ success: false, error: 'Image upload not configured (Bunny CDN).' });
    }
    const ext = (req.file.originalname || '').split('.').pop() || 'jpg';
    const fileName = `ad_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const { cdnUrl } = await BunnyService.upload(req.file.buffer, fileName, 'ads');
    const title = (req.body.title || '').trim() || null;
    const isActive = req.body.isActive !== undefined ? (req.body.isActive === true || req.body.isActive === 'true') : true;
    const order = parseInt(req.body.order, 10);
    const ad = await Ad.create({
      imageUrl: cdnUrl,
      link,
      title,
      isActive,
      order: Number.isNaN(order) ? 0 : order,
    });
    res.status(201).json({ success: true, ad: toAdResponse(ad.toObject()) });
  } catch (err) {
    console.error('POST /api/ads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/ads/:id', adsUpload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ad ID.' });
    }
    const ad = await Ad.findById(id);
    if (!ad) return res.status(404).json({ success: false, error: 'Ad not found.' });
    if (req.file && req.file.buffer && BunnyService.isConfigured()) {
      const ext = (req.file.originalname || '').split('.').pop() || 'jpg';
      const fileName = `ad_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const { cdnUrl } = await BunnyService.upload(req.file.buffer, fileName, 'ads');
      ad.imageUrl = cdnUrl;
    }
    if (req.body.link !== undefined) ad.link = String(req.body.link).trim();
    if (req.body.title !== undefined) ad.title = String(req.body.title).trim() || null;
    if (req.body.isActive !== undefined) ad.isActive = req.body.isActive === true || req.body.isActive === 'true';
    const orderNum = parseInt(req.body.order, 10);
    if (!Number.isNaN(orderNum)) ad.order = orderNum;
    await ad.save();
    res.json({ success: true, ad: toAdResponse(ad.toObject()) });
  } catch (err) {
    console.error('PUT /api/ads/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/ads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ad ID.' });
    }
    const ad = await Ad.findByIdAndDelete(id);
    if (!ad) return res.status(404).json({ success: false, error: 'Ad not found.' });
    res.json({ success: true, message: 'Ad deleted.' });
  } catch (err) {
    console.error('DELETE /api/ads/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== SURVEYS ====================

// Create survey
app.post('/api/surveys', async (req, res) => {
  try {
    console.log('POST /api/surveys called');
    const survey = await createSurvey(req.body);
    res.status(201).json({ success: true, data: survey });
  } catch (error) {
    console.error('Error in POST /api/surveys:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get all surveys
app.get('/api/surveys', async (req, res) => {
  try {
    const { isActive, showOnHomePage } = req.query;
    const filters = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (showOnHomePage !== undefined) filters.showOnHomePage = showOnHomePage === 'true';
    
    const surveys = await getAllSurveys(filters);
    res.json({ success: true, count: surveys.length, data: surveys });
  } catch (error) {
    console.error('Error in GET /api/surveys:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get active home page survey
app.get('/api/surveys/active', async (req, res) => {
  try {
    const survey = await getActiveHomePageSurvey();
    if (!survey) {
      return res.json({ success: true, data: null, message: 'No active survey' });
    }
    res.json({ success: true, data: survey });
  } catch (error) {
    console.error('Error in GET /api/surveys/active:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get survey by ID
app.get('/api/surveys/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const survey = await getSurveyById(surveyId);
    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }
    res.json({ success: true, data: survey });
  } catch (error) {
    console.error('Error in GET /api/surveys/:surveyId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update survey
app.put('/api/surveys/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const updatedSurvey = await updateSurvey(surveyId, req.body);
    res.json({ success: true, data: updatedSurvey });
  } catch (error) {
    console.error('Error in PUT /api/surveys/:surveyId:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete survey (soft delete)
app.delete('/api/surveys/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const deletedSurvey = await deleteSurvey(surveyId);
    res.json({ success: true, data: deletedSurvey, message: 'Survey deactivated' });
  } catch (error) {
    console.error('Error in DELETE /api/surveys/:surveyId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit survey response (legacy: userId + selectedOptionId for single question, or userId + responses[] for multi)
app.post('/api/surveys/:surveyId/respond', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const { userId, selectedOptionId, responses } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const payload = Array.isArray(responses) && responses.length > 0 ? responses : selectedOptionId;
    if (payload == null) {
      return res.status(400).json({ success: false, error: 'selectedOptionId or responses array is required' });
    }
    const response = await submitSurveyResponse(userId, surveyId, payload);
    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error('Error in POST /api/surveys/:surveyId/respond:', error);
    const statusCode = error.message.includes('already responded') ? 409 : (error.message.includes('Invalid') || error.message.includes('Missing') ? 400 : 500);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Get survey analytics
app.get('/api/surveys/:surveyId/analytics', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const analytics = await getSurveyAnalytics(surveyId);
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error in GET /api/surveys/:surveyId/analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's survey responses
app.get('/api/users/:userId/survey-responses', async (req, res) => {
  try {
    const { userId } = req.params;
    const responses = await getUserSurveyResponses(userId);
    res.json({ success: true, count: responses.length, data: responses });
  } catch (error) {
    console.error('Error in GET /api/users/:userId/survey-responses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's response to specific survey
app.get('/api/users/:userId/survey-responses/:surveyId', async (req, res) => {
  try {
    const { userId, surveyId } = req.params;
    const response = await getUserSurveyResponse(userId, surveyId);
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error in GET /api/users/:userId/survey-responses/:surveyId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const isMulter = err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_UNEXPECTED_FILE' || err.name === 'MulterError';
  const isUploadConfig = err.message && (err.message.includes('Bunny CDN config missing') || err.message.includes('not configured'));
  if (isMulter) {
    return res.status(400).json({ success: false, error: err.message || 'Invalid file. Use field name: image, max 5MB.' });
  }
  if (isUploadConfig) {
    return res.status(503).json({ success: false, error: err.message || 'Upload service not configured.' });
  }
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Serve frontend (when built: frontend/dist) so one deployment = API + CRM UI
const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => { if (err) next(); });
  });
}

// 404 handler (include path/method so client can see what failed)
app.use((req, res) => {
  const path = req.path || req.url?.split('?')[0] || req.originalUrl?.split('?')[0];
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    method: req.method,
    path: path || req.url,
    hint: 'Check the path above. Legacy CRM: /api/ads, /api/users, /api/statistics, etc. App: /api/v1/...',
  });
});

// Start server (skip on Vercel — they attach the handler)
const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 KINS CRM API Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
    console.log(`📈 Statistics: http://localhost:${PORT}/api/statistics`);
  });
}

module.exports = app;

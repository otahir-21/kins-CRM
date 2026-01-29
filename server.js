const express = require('express');
const cors = require('cors');
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
  getUserStatistics,
  getUserInterests,
  addUserInterest,
  removeUserInterest,
  updateUserInterests
} = require('./data-helpers');

const {
  createInterest,
  getAllInterests,
  getInterestById,
  updateInterest,
  deleteInterest,
  hardDeleteInterest
} = require('./interests-helpers');

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

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint - API information
app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    success: true,
    service: 'KINS CRM API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: `${baseUrl}/health`,
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
        create: { method: 'POST', url: `${baseUrl}/api/interests` },
        getAll: `${baseUrl}/api/interests`,
        getById: `${baseUrl}/api/interests/:interestId`,
        update: { method: 'PUT', url: `${baseUrl}/api/interests/:interestId` },
        delete: { method: 'DELETE', url: `${baseUrl}/api/interests/:interestId` }
      },
      userInterests: {
        getUserInterests: `${baseUrl}/api/users/:userId/interests`,
        addInterest: { method: 'POST', url: `${baseUrl}/api/users/:userId/interests` },
        removeInterest: { method: 'DELETE', url: `${baseUrl}/api/users/:userId/interests/:interestId` },
        updateInterests: { method: 'PUT', url: `${baseUrl}/api/users/:userId/interests` }
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

// ==================== INTERESTS CRUD ====================

// Create interest
app.post('/api/interests', async (req, res) => {
  try {
    console.log('POST /api/interests called with body:', req.body);
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Interest name is required' });
    }

    const interest = await createInterest({ name });
    console.log('Interest created successfully:', interest.id);
    res.status(201).json({ success: true, data: interest });
  } catch (error) {
    console.error('Error in POST /api/interests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all interests
app.get('/api/interests', async (req, res) => {
  try {
    const { isActive, limit } = req.query;
    
    const filters = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    if (limit) {
      filters.limit = parseInt(limit);
    }

    const interests = await getAllInterests(filters);
    res.json({ success: true, count: interests.length, data: interests });
  } catch (error) {
    console.error('Error in GET /api/interests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get interest by ID
app.get('/api/interests/:interestId', async (req, res) => {
  try {
    const { interestId } = req.params;
    const interest = await getInterestById(interestId);
    
    if (!interest) {
      return res.status(404).json({ success: false, error: 'Interest not found' });
    }
    
    res.json({ success: true, data: interest });
  } catch (error) {
    console.error('Error in GET /api/interests/:interestId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update interest
app.put('/api/interests/:interestId', async (req, res) => {
  try {
    const { interestId } = req.params;
    const updateData = req.body;
    
    const updatedInterest = await updateInterest(interestId, updateData);
    res.json({ success: true, data: updatedInterest });
  } catch (error) {
    console.error('Error in PUT /api/interests/:interestId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete interest (soft delete)
app.delete('/api/interests/:interestId', async (req, res) => {
  try {
    const { interestId } = req.params;
    const { hard } = req.query;
    
    if (hard === 'true') {
      await hardDeleteInterest(interestId);
      res.json({ success: true, message: 'Interest permanently deleted' });
    } else {
      const deletedInterest = await deleteInterest(interestId);
      res.json({ success: true, data: deletedInterest, message: 'Interest deactivated' });
    }
  } catch (error) {
    console.error('Error in DELETE /api/interests/:interestId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== USER INTERESTS ====================

// Get user's interests
app.get('/api/users/:userId/interests', async (req, res) => {
  try {
    const { userId } = req.params;
    const interestIds = await getUserInterests(userId);
    
    // Optionally fetch full interest details
    const { details } = req.query;
    if (details === 'true') {
      const interests = [];
      for (const interestId of interestIds) {
        const interest = await getInterestById(interestId);
        if (interest) {
          interests.push(interest);
        }
      }
      return res.json({ success: true, count: interests.length, data: interests });
    }
    
    res.json({ success: true, count: interestIds.length, data: interestIds });
  } catch (error) {
    console.error('Error in GET /api/users/:userId/interests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add interest to user
app.post('/api/users/:userId/interests', async (req, res) => {
  try {
    const { userId } = req.params;
    const { interestId } = req.body;
    
    if (!interestId) {
      return res.status(400).json({ success: false, error: 'Interest ID is required' });
    }

    // Verify interest exists
    const interest = await getInterestById(interestId);
    if (!interest || !interest.isActive) {
      return res.status(404).json({ success: false, error: 'Interest not found or inactive' });
    }

    const updatedUser = await addUserInterest(userId, interestId);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error in POST /api/users/:userId/interests:', error);
    const statusCode = error.message.includes('Maximum') || error.message.includes('already') ? 400 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Remove interest from user
app.delete('/api/users/:userId/interests/:interestId', async (req, res) => {
  try {
    const { userId, interestId } = req.params;
    const updatedUser = await removeUserInterest(userId, interestId);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error in DELETE /api/users/:userId/interests/:interestId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user's interests (bulk)
app.put('/api/users/:userId/interests', async (req, res) => {
  try {
    const { userId } = req.params;
    const { interestIds } = req.body;
    
    if (!Array.isArray(interestIds)) {
      return res.status(400).json({ success: false, error: 'Interest IDs must be an array' });
    }

    // Verify all interests exist and are active
    for (const interestId of interestIds) {
      const interest = await getInterestById(interestId);
      if (!interest || !interest.isActive) {
        return res.status(400).json({ 
          success: false, 
          error: `Interest ${interestId} not found or inactive` 
        });
      }
    }

    const updatedUser = await updateUserInterests(userId, interestIds);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error in PUT /api/users/:userId/interests:', error);
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

// Submit survey response
app.post('/api/surveys/:surveyId/respond', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const { userId, selectedOptionId } = req.body;
    
    if (!userId || !selectedOptionId) {
      return res.status(400).json({
        success: false,
        error: 'userId and selectedOptionId are required',
      });
    }

    const response = await submitSurveyResponse(userId, surveyId, selectedOptionId);
    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error('Error in POST /api/surveys/:surveyId/respond:', error);
    const statusCode = error.message.includes('already responded') ? 400 : 500;
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
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    path: req.path 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 KINS CRM API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
  console.log(`📈 Statistics: http://localhost:${PORT}/api/statistics`);
});

module.exports = app;

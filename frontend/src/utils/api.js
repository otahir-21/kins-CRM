import axios from 'axios';

// Same-origin when frontend is served by the same app (e.g. Vercel single deploy); override with VITE_API_URL for separate frontend
// Path-only (e.g. /api) would cause double /api prefix; use same-origin instead so requests stay /api/...
const raw = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3000');
const API_BASE_URL = (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) ? '' : raw;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15s so production never hangs on loading
});

// API functions
export const apiService = {
  // Users
  getAllUsers: (complete = false) => {
    return api.get(`/api/users${complete ? '?complete=true' : ''}`);
  },
  
  getUserById: (userId, complete = false) => {
    return api.get(`/api/users/${userId}${complete ? '?complete=true' : ''}`);
  },
  
  getUserDocuments: (userId) => {
    return api.get(`/api/users/${userId}/documents`);
  },
  
  searchUsers: (term) => {
    return api.get(`/api/users/search/${term}`);
  },
  
  filterUsersByGender: (gender) => {
    return api.get(`/api/users/filter/gender/${gender}`);
  },
  
  getUsersWithDocuments: () => {
    return api.get('/api/users/with-documents');
  },
  
  updateUser: (userId, data) => {
    return api.put(`/api/users/${userId}`, data);
  },
  
  // Statistics
  getStatistics: () => {
    return api.get('/api/statistics');
  },
  
  // Interests (tags) and Categories
  getAllInterests: (isActive = null, grouped = true) => {
    const params = new URLSearchParams();
    if (isActive !== null) params.set('active', isActive);
    if (!grouped) params.set('grouped', 'false');
    const q = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/api/interests${q}`);
  },
  createInterest: (data) => {
    return api.post('/api/interests', data);
  },
  getInterestById: (interestId) => {
    return api.get(`/api/interests/${interestId}`);
  },
  updateInterest: (interestId, data) => {
    return api.put(`/api/interests/${interestId}`, data);
  },
  deleteInterest: (interestId, hard = false) => {
    return api.delete(`/api/interests/${interestId}${hard ? '?hard=true' : ''}`);
  },
  getCategories: () => api.get('/api/interests/categories'),
  createCategory: (data) => api.post('/api/interests/categories', data),
  updateCategory: (categoryId, data) => api.put(`/api/interests/categories/${categoryId}`, data),
  deleteCategory: (categoryId) => api.delete(`/api/interests/categories/${categoryId}`),
  
  // User Interests
  getUserInterests: (userId, details = false) => {
    return api.get(`/api/users/${userId}/interests${details ? '?details=true' : ''}`);
  },
  
  addUserInterest: (userId, interestId) => {
    return api.post(`/api/users/${userId}/interests`, { interestId });
  },
  
  removeUserInterest: (userId, interestId) => {
    return api.delete(`/api/users/${userId}/interests/${interestId}`);
  },
  
  updateUserInterests: (userId, interestIds) => {
    return api.put(`/api/users/${userId}/interests`, { interestIds });
  },
  
  // Notifications
  sendNotification: (data) => {
    return api.post('/api/notifications/send', data);
  },
  
  sendBulkNotifications: (data) => {
    return api.post('/api/notifications/send-bulk', data);
  },
  
  getUserNotifications: (userId, options = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.unreadOnly) params.append('unreadOnly', 'true');
    return api.get(`/api/users/${userId}/notifications?${params.toString()}`);
  },
  
  getNotificationStats: (userId) => {
    return api.get(`/api/users/${userId}/notifications/stats`);
  },
  
  markNotificationAsRead: (userId, notificationId) => {
    return api.put(`/api/users/${userId}/notifications/${notificationId}/read`);
  },
  
  markAllNotificationsAsRead: (userId) => {
    return api.put(`/api/users/${userId}/notifications/read-all`);
  },

  // Admin: warn user (in-app + push notification)
  warnUser: (userId, data) => {
    return api.post(`/api/users/${userId}/warn`, data);
  },

  // Admin: soft-delete user (cannot log in again)
  deleteUser: (userId) => {
    return api.delete(`/api/users/${userId}`);
  },
  
  saveFCMToken: (userId, fcmToken) => {
    return api.post(`/api/users/${userId}/fcm-token`, { fcmToken });
  },
  
  getFCMToken: (userId) => {
    return api.get(`/api/users/${userId}/fcm-token`);
  },
  
  // Surveys
  createSurvey: (data) => {
    return api.post('/api/surveys', data);
  },
  
  getAllSurveys: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    if (filters.showOnHomePage !== undefined) params.append('showOnHomePage', filters.showOnHomePage);
    return api.get(`/api/surveys?${params.toString()}`);
  },
  
  getActiveHomePageSurvey: () => {
    return api.get('/api/surveys/active');
  },
  
  getSurveyById: (surveyId) => {
    return api.get(`/api/surveys/${surveyId}`);
  },
  
  updateSurvey: (surveyId, data) => {
    return api.put(`/api/surveys/${surveyId}`, data);
  },
  
  deleteSurvey: (surveyId) => {
    return api.delete(`/api/surveys/${surveyId}`);
  },
  
  submitSurveyResponse: (surveyId, userId, selectedOptionId) => {
    return api.post(`/api/surveys/${surveyId}/respond`, { userId, selectedOptionId });
  },
  
  getSurveyAnalytics: (surveyId) => {
    return api.get(`/api/surveys/${surveyId}/analytics`);
  },
  
  getUserSurveyResponses: (userId) => {
    return api.get(`/api/users/${userId}/survey-responses`);
  },
  
  // Onboarding (walkthrough)
  getOnboardingSteps: (activeOnly = false) => {
    return api.get(`/api/onboarding?activeOnly=${activeOnly}`);
  },
  getOnboardingStepById: (stepId) => {
    return api.get(`/api/onboarding/${stepId}`);
  },
  createOnboardingStep: (data) => {
    return api.post('/api/onboarding', data);
  },
  updateOnboardingStep: (stepId, data) => {
    return api.put(`/api/onboarding/${stepId}`, data);
  },
  deleteOnboardingStep: (stepId) => {
    return api.delete(`/api/onboarding/${stepId}`);
  },

  // Upload image to Bunny CDN (returns { url })
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/api/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Posts moderation
  getPosts: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.startAfter) searchParams.append('startAfter', params.startAfter);
    if (params.status) searchParams.append('status', params.status);
    return api.get(`/api/posts?${searchParams.toString()}`);
  },
  
  getReportedPosts: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.startAfter) searchParams.append('startAfter', params.startAfter);
    return api.get(`/api/posts/reported?${searchParams.toString()}`);
  },
  
  getPostById: (postId) => {
    return api.get(`/api/posts/${postId}`);
  },
  
  deletePost: (postId, hard = false) => {
    return api.delete(`/api/posts/${postId}${hard ? '?hard=true' : ''}`);
  },
  
  // Health check
  healthCheck: () => {
    return api.get('/health');
  },

  // Ads (CRM dashboard). List uses v1 so it works when only /api/v1 is exposed; create/update/delete use legacy (no JWT).
  getAds: (params = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.append('page', params.page);
    if (params.limit) sp.append('limit', params.limit);
    return api.get(`/api/v1/ads?${sp.toString()}`);
  },
  getAdById: (id) => api.get(`/api/ads/${id}`),
  createAd: (formData) => api.post('/api/ads', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateAd: (id, formData) => api.put(`/api/ads/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteAd: (id) => api.delete(`/api/ads/${id}`),
};

export default api;

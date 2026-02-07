import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
  
  // Interests
  createInterest: (data) => {
    return api.post('/api/interests', data);
  },
  
  getAllInterests: (isActive = null) => {
    const params = isActive !== null ? `?isActive=${isActive}` : '';
    return api.get(`/api/interests${params}`);
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
};

export default api;

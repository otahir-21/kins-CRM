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
  
  // Health check
  healthCheck: () => {
    return api.get('/health');
  },
};

export default api;

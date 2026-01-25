import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Calendar, FileText, Download, Edit, Tag, Bell, Send } from 'lucide-react';
import { apiService } from '../utils/api';
import { formatFirestoreDateTime } from '../utils/dateHelpers';

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userInterests, setUserInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    type: 'system',
    action: '',
    relatedPostId: '',
    postThumbnail: '',
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [fcmToken, setFcmToken] = useState('');
  const [showFCMTokenModal, setShowFCMTokenModal] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  useEffect(() => {
    if (user && user.interests && user.interests.length > 0) {
      fetchUserInterests();
    }
    if (user) {
      fetchFCMToken();
    }
  }, [user]);

  const fetchFCMToken = async () => {
    try {
      const response = await apiService.getFCMToken(userId);
      setFcmToken(response.data.data?.fcmToken || '');
    } catch (error) {
      console.error('Error fetching FCM token:', error);
    }
  };

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserById(userId, true);
      setUser(response.data.data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Dummy data for demo
      setUser({
        id: userId,
        name: 'John Doe',
        gender: 'male',
        phoneNumber: '+971507276823',
        documentUrl: 'https://example.com/doc.pdf',
        interests: [],
        auth: {
          phoneNumber: '+971507276823',
          creationTime: '2024-01-15T10:30:00Z',
          lastSignInTime: '2024-01-23T15:00:00Z'
        },
        documents: [
          {
            id: '1',
            url: 'https://example.com/doc.pdf',
            fileName: 'emirates_id.pdf',
            uploadedAt: '2024-01-15T10:30:00Z',
            size: 245678
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInterests = async () => {
    try {
      const response = await apiService.getUserInterests(userId, true);
      setUserInterests(response.data.data || []);
    } catch (error) {
      console.error('Error fetching user interests:', error);
      setUserInterests([]);
    }
  };

  // formatDate is now handled by formatFirestoreDateTime utility

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  const getGenderColor = (gender) => {
    switch (gender) {
      case 'male':
        return 'bg-blue-100 text-blue-800';
      case 'female':
        return 'bg-pink-100 text-pink-800';
      case 'other':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <button
        onClick={() => navigate('/users')}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Users
      </button>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{user.name || 'N/A'}</h1>
            <p className="text-gray-600 mt-2">User ID: {user.id}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowNotificationModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Bell className="w-4 h-4 mr-2" />
              Send Notification
            </button>
            {!fcmToken && (
              <button
                onClick={() => setShowFCMTokenModal(true)}
                className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                title="User has no FCM token. Click to add one for testing."
              >
                <Bell className="w-4 h-4 mr-2" />
                Add FCM Token
              </button>
            )}
            <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Edit className="w-4 h-4 mr-2" />
              Edit User
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="text-gray-900 font-medium">{user.name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="text-gray-900 font-medium">{user.phoneNumber || user.auth?.phoneNumber || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 mr-3"></div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getGenderColor(user.gender)}`}>
                    {user.gender || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Information</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Account Created</p>
                  <p className="text-gray-900 font-medium">
                    {formatFirestoreDateTime(user.auth?.creationTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Last Sign In</p>
                  <p className="text-gray-900 font-medium">
                    {formatFirestoreDateTime(user.auth?.lastSignInTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 mr-3"></div>
                <div>
                  <p className="text-sm text-gray-500">Account Status</p>
                  <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Interests */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Interests</h2>
              <button
                onClick={() => navigate(`/users/${userId}/notifications`)}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
              >
                <Bell className="w-4 h-4 mr-1" />
                View Notifications
              </button>
            </div>
            {userInterests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {userInterests.map((interest) => (
                  <span
                    key={interest.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                  >
                    <Tag className="w-4 h-4 mr-1" />
                    {interest.name}
                  </span>
                ))}
              </div>
            ) : user.interests && user.interests.length > 0 ? (
              <div className="text-sm text-gray-500">
                Loading interests...
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No interests selected</p>
              </div>
            )}
            {user.interests && (
              <p className="text-xs text-gray-500 mt-3">
                {user.interests.length} of 10 interests selected
              </p>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Documents</h2>
            {user.documents && user.documents.length > 0 ? (
              <div className="space-y-3">
                {user.documents.map((doc, index) => (
                  <div key={doc.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <FileText className="w-8 h-8 text-primary-600 mr-4" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.fileName || 'Document'}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(doc.size)} • Uploaded {formatFirestoreDateTime(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={doc.url || user.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : user.documentUrl ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-primary-600 mr-4" />
                  <div>
                    <p className="font-medium text-gray-900">Document</p>
                    <p className="text-sm text-gray-500">Click to view</p>
                  </div>
                </div>
                <a
                  href={user.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No documents uploaded</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Documents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {user.documents?.length || (user.documentUrl ? 1 : 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Interests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {user.interests?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Age</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.auth?.creationTime
                    ? (() => {
                        const creationTime = user.auth.creationTime;
                        let creationDate;
                        if (creationTime.seconds) {
                          creationDate = new Date(creationTime.seconds * 1000);
                        } else if (creationTime._seconds) {
                          creationDate = new Date(creationTime._seconds * 1000);
                        } else if (typeof creationTime === 'string') {
                          creationDate = new Date(creationTime);
                        } else {
                          creationDate = new Date(creationTime);
                        }
                        return `${Math.floor((new Date() - creationDate) / (1000 * 60 * 60 * 24))} days`;
                      })()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Send Notification</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSendingNotification(true);
                try {
                  const response = await apiService.sendNotification({
                    userId: user.id,
                    senderId: 'admin', // You can get this from auth
                    senderName: 'KINS Admin',
                    senderProfilePicture: null,
                    type: notificationForm.type,
                    action: notificationForm.action,
                    relatedPostId: notificationForm.relatedPostId || null,
                    postThumbnail: notificationForm.postThumbnail || null,
                  });
                  
                  if (response.data.data?.warning) {
                    alert(`Notification saved! ${response.data.data.warning}`);
                  } else {
                    alert('Notification sent successfully!');
                  }
                  
                  setShowNotificationModal(false);
                  setNotificationForm({
                    type: 'system',
                    action: '',
                    relatedPostId: '',
                    postThumbnail: '',
                  });
                } catch (error) {
                  alert(error.response?.data?.error || 'Error sending notification');
                } finally {
                  setSendingNotification(false);
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Type
                  </label>
                  <select
                    value={notificationForm.type}
                    onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="system">System</option>
                    <option value="liked_post">Liked Post</option>
                    <option value="commented_post">Commented Post</option>
                    <option value="followed_you">Followed You</option>
                    <option value="message">Message</option>
                    <option value="document_approved">Document Approved</option>
                    <option value="interest_match">Interest Match</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action Message *
                  </label>
                  <input
                    type="text"
                    value={notificationForm.action}
                    onChange={(e) => setNotificationForm({ ...notificationForm, action: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="e.g., Your document has been approved"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Related Post ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={notificationForm.relatedPostId}
                    onChange={(e) => setNotificationForm({ ...notificationForm, relatedPostId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Post ID if applicable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post Thumbnail URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={notificationForm.postThumbnail}
                    onChange={(e) => setNotificationForm({ ...notificationForm, postThumbnail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <button
                  type="submit"
                  disabled={sendingNotification}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {sendingNotification ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Notification
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationModal(false);
                    setNotificationForm({
                      type: 'system',
                      action: '',
                      relatedPostId: '',
                      postThumbnail: '',
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FCM Token Modal */}
      {showFCMTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Add FCM Token</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add FCM token for testing. In production, this token comes from the mobile app when user logs in.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiService.saveFCMToken(userId, fcmToken);
                  alert('FCM token saved successfully!');
                  setShowFCMTokenModal(false);
                  fetchFCMToken();
                } catch (error) {
                  alert(error.response?.data?.error || 'Error saving FCM token');
                }
              }}
            >
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FCM Token
                </label>
                <input
                  type="text"
                  value={fcmToken}
                  onChange={(e) => setFcmToken(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Enter FCM token from mobile app"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Get this token from Firebase Console or mobile app logs
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Save Token
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFCMTokenModal(false);
                    setFcmToken('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetail;

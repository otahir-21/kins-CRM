import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Calendar, Edit, Tag, Bell, Send, AlertTriangle, Trash2, Image as ImageIcon } from 'lucide-react';
import { apiService } from '../utils/api';
import { formatFirestoreDateTime } from '../utils/dateHelpers';

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userInterests, setUserInterests] = useState([]);
  const [interestNameById, setInterestNameById] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    type: 'system',
    action: '',
    relatedPostId: '',
    postThumbnail: '',
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState({ name: '', gender: '', documentUrl: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [warnMessage, setWarnMessage] = useState('');
  const [warnTitle, setWarnTitle] = useState('Warning from KINS');
  const [sendingWarn, setSendingWarn] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsNextToken, setPostsNextToken] = useState(null);

  useEffect(() => {
    setUser(null);
    setUserPosts([]);
    setPostsNextToken(null);
    setPostsHasMore(false);
    fetchUserDetails();
  }, [userId]);

  useEffect(() => {
    if (user) {
      fetchUserPosts();
    }
  }, [user, userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.getAllInterests(true, true);
        if (cancelled) return;
        const map = {};
        const flat = res.data?.interests || res.data?.tags || res.data?.data;
        const categories = res.data?.categories || res.data?.data?.categories || [];
        const uncategorized = res.data?.uncategorized || res.data?.data?.uncategorized || [];
        if (Array.isArray(flat) && flat.length > 0) {
          flat.forEach((item) => {
            if (item && item.id != null) map[String(item.id)] = item.name || 'Interest';
          });
        } else {
          categories.forEach((cat) => {
            (cat.tags || []).forEach((item) => {
              if (item && item.id != null) map[String(item.id)] = item.name || 'Interest';
            });
          });
          uncategorized.forEach((item) => {
            if (item && item.id != null) map[String(item.id)] = item.name || 'Interest';
          });
        }
        if (!cancelled) setInterestNameById(map);
      } catch {
        if (!cancelled) setInterestNameById({});
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user?.id || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.getUserInterests(userId, true);
        if (cancelled) return;
        const list = res.data?.data || [];
        if (Array.isArray(list) && list.length > 0) setUserInterests(list);
      } catch {
        // ignore; we use interestNameById from getAllInterests
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, userId]);

  const fetchUserPosts = async (append = false) => {
    const targetUserId = userId; // from URL – only show this user's posts
    if (!targetUserId) return;
    if (!append) setLoadingPosts(true);
    try {
      const res = await apiService.getPosts({
        userId: targetUserId,
        limit: 10,
        status: 'active',
        startAfter: append ? postsNextToken : undefined,
      });
      const raw = res.data?.data || [];
      const idStr = String(targetUserId);
      const data = raw.filter((p) => (p.userId && String(p.userId) === idStr) || (p.authorId && String(p.authorId) === idStr));
      const next = res.data?.nextPageToken || null;
      const hasMore = !!res.data?.hasMore;
      setUserPosts((prev) => (append ? [...prev, ...data] : data));
      setPostsNextToken(next);
      setPostsHasMore(hasMore);
    } catch (err) {
      console.error('Error fetching user posts:', err);
      if (!append) setUserPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post? It will be hidden from the feed.')) return;
    try {
      await apiService.deletePost(postId);
      setUserPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete post');
    }
  };

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserById(userId, true);
      const data = response.data?.data;
      if (!data) {
        setUser(null);
        return;
      }
      // Normalize: support both flat response and legacy { firestore, auth } shape
      const flat = data.firestore
        ? {
            ...data.firestore,
            id: data.id || data.firestore.id,
            auth: {
              phoneNumber: data.auth?.phoneNumber ?? data.firestore.phoneNumber,
              creationTime: data.auth?.creationTime ?? data.firestore.createdAt,
              lastSignInTime: data.auth?.lastSignInTime ?? data.firestore.updatedAt,
            },
          }
        : data;
      setUser(flat);
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Dummy data for demo
      setUser({
        id: userId,
        name: 'John Doe',
        email: null,
        phoneNumber: '+971507276823',
        interests: [],
        auth: {
          phoneNumber: '+971507276823',
          creationTime: '2024-01-15T10:30:00Z',
          lastSignInTime: '2024-01-23T15:00:00Z'
        },
      });
    } finally {
      setLoading(false);
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
            <a
              href={user.email ? `mailto:${user.email}` : '#'}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${user.email ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              title={user.email ? 'Open email client' : 'No email set'}
              onClick={(e) => !user.email && e.preventDefault()}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send email
            </a>
            <button
              type="button"
              onClick={() => {
                setEditUserForm({
                  name: user.name ?? '',
                  gender: user.gender ?? '',
                  documentUrl: user.documentUrl ?? '',
                });
                setShowEditUserModal(true);
              }}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit User
            </button>
          </div>
        </div>
      </div>

      {/* Admin: Warn & Delete */}
      {user && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h2 className="text-lg font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Admin actions
          </h2>
          <p className="text-sm text-amber-800 mb-3">
            Send a warning (in-app + push) and/or deactivate the user. Deactivated users cannot log in.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { setWarnMessage(''); setWarnTitle('Warning from KINS'); setShowWarnModal(true); }}
              className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Bell className="w-4 h-4 mr-2" />
              Send warning
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Deactivate this user? They will no longer be able to log in. Data is retained.')) return;
                setDeletingUser(true);
                try {
                  await apiService.deleteUser(user.id);
                  alert('User deactivated.');
                  fetchUserDetails();
                } catch (e) {
                  alert(e.response?.data?.error || 'Failed to deactivate user');
                } finally {
                  setDeletingUser(false);
                }
              }}
              disabled={user.deletedAt || deletingUser}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {user.deletedAt ? 'Deactivated' : deletingUser ? 'Deactivating...' : 'Delete user'}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Send a warning and then deactivate this user?')) return;
                setSendingWarn(true);
                try {
                  await apiService.warnUser(user.id, { message: 'Your account has been deactivated due to a policy violation.', title: 'Account deactivated' });
                  await apiService.deleteUser(user.id);
                  alert('Warning sent and user deactivated.');
                  fetchUserDetails();
                } catch (e) {
                  alert(e.response?.data?.error || 'Failed to warn or deactivate');
                } finally {
                  setSendingWarn(false);
                }
              }}
              disabled={user.deletedAt || sendingWarn}
              className="flex items-center px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Warn & delete
            </button>
          </div>
        </div>
      )}

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
                  <p className="text-gray-900 font-medium">{user.name != null && user.name !== '' ? user.name : '—'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="text-gray-900 font-medium">{user.phoneNumber || user.auth?.phoneNumber || '—'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900 font-medium">{user.email != null && user.email !== '' ? user.email : '—'}</p>
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
                    {formatFirestoreDateTime(user.auth?.creationTime ?? user.createdAt) || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-gray-900 font-medium">
                    {formatFirestoreDateTime(user.auth?.lastSignInTime ?? user.updatedAt) || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 mr-3"></div>
                <div>
                  <p className="text-sm text-gray-500">Account Status</p>
                  <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${user.deletedAt ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {user.deletedAt ? 'Deactivated' : 'Active'}
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
            {(() => {
              const hasIds = user.interests && user.interests.length > 0;
              const displayList = userInterests.length > 0
                ? userInterests
                : (hasIds ? user.interests.map((id) => ({ id: String(id), name: interestNameById[String(id)] || 'Interest' })) : []);
              if (displayList.length > 0) {
                return (
                  <div className="flex flex-wrap gap-2">
                    {displayList.map((interest) => (
                      <span
                        key={interest.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                      >
                        <Tag className="w-4 h-4 mr-1" />
                        {interest.name}
                      </span>
                    ))}
                  </div>
                );
              }
              return (
                <div className="text-center py-4 text-gray-500">
                  <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No interests selected</p>
                </div>
              );
            })()}
            {user.interests && user.interests.length > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                {user.interests.length} of 10 interests selected
              </p>
            )}
          </div>

          {/* User's own posts only */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              User&apos;s posts {!loadingPosts && (userPosts.length > 0 || postsHasMore) && (
                <span className="text-sm font-normal text-gray-500">
                  ({userPosts.length}{postsHasMore ? '+' : ''} post{userPosts.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
            {loadingPosts ? (
              <div className="text-center py-8 text-gray-500">Loading posts…</div>
            ) : userPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No posts yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-sm whitespace-pre-wrap break-words line-clamp-3">
                        {(post.text || post.content || '—').slice(0, 200)}
                        {((post.text || post.content || '').length > 200) && '…'}
                      </p>
                      <p className="text-gray-500 text-xs mt-2">
                        {formatFirestoreDateTime(post.createdAt)} • {post.type || 'post'}
                        {post.reportCount > 0 && (
                          <span className="ml-2 text-red-600">• {post.reportCount} report(s)</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 flex-shrink-0">
                      {(post.mediaUrl || post.imageUrl) && (
                        <a
                          href={post.mediaUrl || post.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200"
                        >
                          <img
                            src={post.mediaUrl || post.imageUrl}
                            alt="Post"
                            className="w-full h-full object-cover"
                          />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete post"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {postsHasMore && (
                  <button
                    type="button"
                    onClick={() => fetchUserPosts(true)}
                    className="w-full py-2 text-sm text-primary-600 hover:bg-gray-100 rounded-lg"
                  >
                    Load more posts
                  </button>
                )}
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
                <p className="text-sm text-gray-500">Posts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingPosts ? '…' : userPosts.length}
                  {postsHasMore && '+'}
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
                  {(() => {
                    const creationTime = user.auth?.creationTime ?? user.createdAt;
                    if (!creationTime) return '—';
                    let creationDate;
                    if (creationTime?.seconds != null) {
                      creationDate = new Date(creationTime.seconds * 1000);
                    } else if (creationTime?._seconds != null) {
                      creationDate = new Date(creationTime._seconds * 1000);
                    } else {
                      creationDate = new Date(creationTime);
                    }
                    if (isNaN(creationDate.getTime())) return '—';
                    const days = Math.floor((new Date() - creationDate) / (1000 * 60 * 60 * 24));
                    return days <= 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`;
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date joined</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatFirestoreDateTime(user.auth?.creationTime ?? user.createdAt) || '—'}
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

      {/* Send Warning Modal (Admin) */}
      {showWarnModal && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Send warning</h2>
            <p className="text-sm text-gray-600 mb-4">The user will see this in-app and get a push notification if they have notifications enabled.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSendingWarn(true);
                try {
                  await apiService.warnUser(user.id, { message: warnMessage.trim() || 'You have received a warning from the KINS team.', title: warnTitle.trim() || 'Warning from KINS' });
                  alert('Warning sent.');
                  setShowWarnModal(false);
                  setWarnMessage('');
                  setWarnTitle('Warning from KINS');
                } catch (err) {
                  alert(err.response?.data?.error || 'Failed to send warning');
                } finally {
                  setSendingWarn(false);
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title (optional)</label>
                  <input
                    type="text"
                    value={warnTitle}
                    onChange={(e) => setWarnTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Warning from KINS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea
                    value={warnMessage}
                    onChange={(e) => setWarnMessage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="e.g. Please review our community guidelines..."
                    rows={4}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" disabled={sendingWarn} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
                  {sendingWarn ? 'Sending...' : 'Send warning'}
                </button>
                <button type="button" onClick={() => { setShowWarnModal(false); setWarnMessage(''); setWarnTitle('Warning from KINS'); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit User</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSavingUser(true);
                try {
                  const payload = {};
                  if (editUserForm.name !== (user.name ?? '')) payload.name = editUserForm.name.trim() || null;
                  if (editUserForm.gender !== (user.gender ?? '')) payload.gender = editUserForm.gender || null;
                  if (editUserForm.documentUrl !== (user.documentUrl ?? '')) payload.documentUrl = editUserForm.documentUrl.trim() || null;
                  if (Object.keys(payload).length === 0) {
                    setShowEditUserModal(false);
                    return;
                  }
                  await apiService.updateUser(user.id, payload);
                  await fetchUserDetails();
                  setShowEditUserModal(false);
                } catch (err) {
                  alert(err.response?.data?.error || 'Failed to update user');
                } finally {
                  setSavingUser(false);
                }
              }}
            >
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={editUserForm.gender}
                    onChange={(e) => setEditUserForm((f) => ({ ...f, gender: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document URL (optional)</label>
                  <input
                    type="url"
                    value={editUserForm.documentUrl}
                    onChange={(e) => setEditUserForm((f) => ({ ...f, documentUrl: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingUser}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {savingUser ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  disabled={savingUser}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
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

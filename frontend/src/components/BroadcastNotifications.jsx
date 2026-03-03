import { useState } from 'react';
import { Send, Bell } from 'lucide-react';
import { apiService } from '../utils/api';

const BroadcastNotifications = () => {
  const [form, setForm] = useState({
    type: 'system',
    action: '',
    relatedPostId: '',
    postThumbnail: '',
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const usersRes = await apiService.getAllUsers(true);
      const users = usersRes.data?.data || [];
      const userIds = users.map((u) => u.id).filter(Boolean);
      if (userIds.length === 0) {
        setResult({ success: false, message: 'No users found to send to.' });
        setSending(false);
        return;
      }
      await apiService.sendBulkNotifications({
        userIds,
        senderId: 'admin',
        senderName: 'KINS Admin',
        senderProfilePicture: null,
        type: form.type,
        action: form.action,
        relatedPostId: form.relatedPostId || null,
        postThumbnail: form.postThumbnail || null,
      });
      setResult({
        success: true,
        message: `Notification sent to ${userIds.length} user${userIds.length !== 1 ? 's' : ''}. They will see it in-app and may receive a push if they have notifications enabled.`,
      });
      setForm({ type: 'system', action: '', relatedPostId: '', postThumbnail: '' });
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.error || err.message || 'Failed to send broadcast.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <Bell className="w-7 h-7 mr-2 text-primary-600" />
          Broadcast Notification
        </h1>
        <p className="text-gray-600 mt-1">
          Send one notification to all users. They will see it in the app and may get a push notification if enabled.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notification Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
            <input
              type="text"
              value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="e.g., New feature: check out the updated feed!"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Related Post ID (optional)</label>
            <input
              type="text"
              value={form.relatedPostId}
              onChange={(e) => setForm({ ...form, relatedPostId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Post ID if applicable"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Post Thumbnail URL (optional)</label>
            <input
              type="url"
              value={form.postThumbnail}
              onChange={(e) => setForm({ ...form, postThumbnail: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {result && (
            <div
              className={`p-3 rounded-lg text-sm ${
                result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {result.message}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={sending}
              className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending to all users...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to all users
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BroadcastNotifications;

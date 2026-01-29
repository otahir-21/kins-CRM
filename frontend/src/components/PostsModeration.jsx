import { useEffect, useState } from 'react';
import { FileText, Trash2, User, Image, AlertTriangle, Loader, ChevronDown } from 'lucide-react';
import { apiService } from '../utils/api';
import { formatFirestoreDateTime } from '../utils/dateHelpers';

const PAGE_SIZE = 20;

const PostsModeration = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState('active'); // active | reported | deleted
  const [error, setError] = useState(null);

  const loadPosts = async (append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setPosts([]);
      setNextPageToken(null);
    }
    setError(null);

    try {
      if (filter === 'reported') {
        const res = await apiService.getReportedPosts({
          limit: PAGE_SIZE,
          startAfter: append ? nextPageToken : undefined,
        });
        setPosts(append ? (p) => [...p, ...(res.data.data || [])] : res.data.data || []);
        setNextPageToken(res.data.nextPageToken || null);
        setHasMore(!!res.data.hasMore);
      } else {
        const res = await apiService.getPosts({
          limit: PAGE_SIZE,
          startAfter: append ? nextPageToken : undefined,
          status: filter,
        });
        setPosts(append ? (p) => [...p, ...(res.data.data || [])] : res.data.data || []);
        setNextPageToken(res.data.nextPageToken || null);
        setHasMore(!!res.data.hasMore);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load posts');
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [filter]);

  const handleDelete = async (postId) => {
    if (!confirm('Delete this post? It will be hidden from the feed.')) return;
    try {
      await apiService.deletePost(postId);
      setPosts((p) => p.filter((post) => post.id !== postId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete post');
    }
  };

  const formatContent = (text) => {
    if (!text) return '—';
    return text.length > 120 ? text.slice(0, 120) + '…' : text;
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Posts Moderation</h1>
        <p className="text-gray-600 mt-2">
          Review and remove inappropriate posts. Only {PAGE_SIZE} posts load per page to reduce cost.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'active', label: 'Active Posts' },
          { key: 'reported', label: 'Reported' },
          { key: 'deleted', label: 'Deleted' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-800">
          <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="w-10 h-10 text-primary-600 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No posts found</p>
          <p className="text-gray-500 text-sm mt-2">
            {filter === 'reported'
              ? 'No reported posts. If your app adds reportCount to posts, they will appear here.'
              : 'Posts from your app will appear here once the posts collection exists in Firestore.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex flex-col sm:flex-row gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium truncate">{post.userName || post.userId || 'Unknown'}</span>
                    </div>
                    {post.reportCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                        {post.reportCount} report{post.reportCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 text-sm whitespace-pre-wrap break-words">
                    {formatContent(post.content)}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    {formatFirestoreDateTime(post.createdAt)} • ID: {post.id}
                  </p>
                </div>
                <div className="flex items-start gap-2 flex-shrink-0">
                  {post.imageUrl && (
                    <a
                      href={post.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200"
                    >
                      <img
                        src={post.imageUrl}
                        alt="Post"
                        className="w-full h-full object-cover"
                      />
                    </a>
                  )}
                  {filter === 'active' && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete post"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => loadPosts(true)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Load next {PAGE_SIZE}
                    <ChevronDown className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PostsModeration;

import { useEffect, useState, useCallback } from 'react';
import { FileText, Trash2, User, AlertTriangle, Loader, ChevronDown, Search, Flag, Plus, Settings2 } from 'lucide-react';
import { apiService } from '../utils/api';
import { formatFirestoreDateTime } from '../utils/dateHelpers';

const PAGE_SIZE = 20;
const MAX_KEYWORDS = 200;

const PostsModeration = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState('active'); // active | reported | deleted | flagged
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState(''); // controlled input; submit on Enter or button
  const [error, setError] = useState(null);

  // Moderation keywords (CRM-managed)
  const [keywords, setKeywords] = useState([]);
  const [loadingKeywords, setLoadingKeywords] = useState(true);
  const [savingKeywords, setSavingKeywords] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [showKeywordPanel, setShowKeywordPanel] = useState(false);
  const [keywordsError, setKeywordsError] = useState(null);
  const [keywordsSaved, setKeywordsSaved] = useState(false);

  const loadPosts = useCallback(async (append = false, cursor = null) => {
    const startAfter = append ? (cursor ?? nextPageToken) : undefined;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setPosts([]);
      setNextPageToken(null);
    }
    setError(null);

    try {
      if (filter === 'flagged') {
        const res = await apiService.getFlaggedPosts({
          limit: PAGE_SIZE,
          startAfter,
        });
        setPosts(append ? (p) => [...p, ...(res.data.data || [])] : res.data.data || []);
        setNextPageToken(res.data.nextPageToken || null);
        setHasMore(!!res.data.hasMore);
      } else if (filter === 'reported') {
        const res = await apiService.getReportedPosts({
          limit: PAGE_SIZE,
          startAfter,
        });
        setPosts(append ? (p) => [...p, ...(res.data.data || [])] : res.data.data || []);
        setNextPageToken(res.data.nextPageToken || null);
        setHasMore(!!res.data.hasMore);
      } else {
        const res = await apiService.getPosts({
          limit: PAGE_SIZE,
          startAfter,
          status: filter,
          q: searchQuery || undefined,
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
  }, [filter, searchQuery]);

  useEffect(() => {
    loadPosts();
  }, [filter, searchQuery]);

  const loadKeywords = useCallback(async () => {
    setLoadingKeywords(true);
    setKeywordsError(null);
    try {
      const res = await apiService.getModerationKeywords();
      setKeywords(Array.isArray(res.data?.keywords) ? res.data.keywords : []);
    } catch (err) {
      setKeywordsError(err.response?.data?.error || err.message || 'Failed to load keywords');
      setKeywords([]);
    } finally {
      setLoadingKeywords(false);
    }
  }, []);

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const handleAddKeyword = () => {
    const term = newKeyword.trim();
    if (!term) return;
    if (keywords.length >= MAX_KEYWORDS) return;
    if (keywords.some((k) => k.toLowerCase() === term.toLowerCase())) return;
    setKeywords((prev) => [...prev, term]);
    setNewKeyword('');
    setKeywordsSaved(false);
  };

  const handleRemoveKeyword = (index) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index));
    setKeywordsSaved(false);
  };

  const handleSaveKeywords = async () => {
    setSavingKeywords(true);
    setKeywordsError(null);
    setKeywordsSaved(false);
    try {
      await apiService.updateModerationKeywords(keywords);
      setKeywordsSaved(true);
      setTimeout(() => setKeywordsSaved(false), 3000);
    } catch (err) {
      setKeywordsError(err.response?.data?.error || err.message || 'Failed to save keywords');
    } finally {
      setSavingKeywords(false);
    }
  };

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
    if (text == null || text === '') return '—';
    const s = String(text);
    return s.length > 120 ? s.slice(0, 120) + '…' : s;
  };

  // Support both app schema (authorName, text, mediaUrl) and legacy (userName, content, imageUrl)
  const getAuthor = (post) => post.authorName ?? post.userName ?? post.authorId ?? post.userId ?? 'Unknown';
  const getContent = (post) => post.text ?? post.content ?? '';
  const getImageUrl = (post) => post.mediaUrl ?? post.thumbnailUrl ?? post.imageUrl;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Posts Moderation</h1>
        <p className="text-gray-600 mt-2">
          Search for bad terms, review flagged and reported posts. Only {PAGE_SIZE} posts load per page.
        </p>
      </div>

      {/* Search bar — applies to Active / Deleted tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search posts by keyword (e.g. abusive terms)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Search
        </button>
        {searchQuery && (
          <span className="text-sm text-gray-500">
            Showing results for &quot;{searchQuery}&quot;
          </span>
        )}
      </div>

      {/* Manage moderation keywords */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowKeywordPanel(!showKeywordPanel)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2 font-medium text-gray-800">
            <Settings2 className="w-5 h-5 text-primary-600" />
            Manage flagging keywords ({keywords.length} of {MAX_KEYWORDS})
          </span>
          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showKeywordPanel ? 'rotate-180' : ''}`} />
        </button>
        {showKeywordPanel && (
          <div className="px-6 pb-6 pt-0 border-t border-gray-100">
            {loadingKeywords ? (
              <div className="flex items-center gap-2 py-4 text-gray-500">
                <Loader className="w-5 h-5 animate-spin" />
                Loading keywords…
              </div>
            ) : (
              <>
                {keywordsError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {keywordsError}
                  </div>
                )}
                <p className="text-sm text-gray-600 mb-4">
                  Posts containing any of these terms (case-insensitive) appear in the <strong>Flagged</strong> tab.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {keywords.length === 0 ? (
                    <span className="text-gray-400 text-sm">No keywords yet. Add below.</span>
                  ) : (
                    keywords.map((k, i) => (
                      <span
                        key={`${k}-${i}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg text-sm"
                      >
                        {k}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(i)}
                          className="p-0.5 hover:bg-amber-200 rounded"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add keyword…"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none w-48"
                    disabled={keywords.length >= MAX_KEYWORDS}
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    disabled={!newKeyword.trim() || keywords.length >= MAX_KEYWORDS}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveKeywords}
                    disabled={savingKeywords}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {savingKeywords ? (
                      <Loader className="w-4 h-4 animate-spin inline" />
                    ) : keywordsSaved ? (
                      'Saved'
                    ) : (
                      'Save keywords'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'active', label: 'Active Posts' },
          { key: 'reported', label: 'Reported' },
          { key: 'flagged', label: `Flagged (${keywords.length} keywords)` },
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
              : filter === 'flagged'
                ? 'No posts contain any of your moderation keywords. Add keywords above to flag posts.'
                : searchQuery
                  ? 'No posts match your search. Try a different term.'
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
                      <span className="font-medium truncate">{getAuthor(post)}</span>
                    </div>
                    {post.reportCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                        {post.reportCount} report{post.reportCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {filter === 'flagged' && Array.isArray(post.matchedKeywords) && post.matchedKeywords.length > 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        {post.matchedKeywords.join(', ')}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 text-sm whitespace-pre-wrap break-words">
                    {formatContent(getContent(post))}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    {formatFirestoreDateTime(post.createdAt)} • ID: {post.id}
                  </p>
                </div>
                <div className="flex items-start gap-2 flex-shrink-0">
                  {getImageUrl(post) && (
                    <a
                      href={getImageUrl(post)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200"
                    >
                      <img
                        src={getImageUrl(post)}
                        alt="Post"
                        className="w-full h-full object-cover"
                      />
                    </a>
                  )}
                  {(filter === 'active' || filter === 'reported' || filter === 'flagged') && (
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
                onClick={() => loadPosts(true, nextPageToken)}
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

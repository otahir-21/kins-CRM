const { getSelectedBackend, isFullFirebaseMigration } = require('../services/data/backendSelector');

/**
 * When DATA_BACKEND_DEFAULT=firebase but some scoped domains are still mongo,
 * return empty CRM-safe payloads so the dashboard does not show "Database unavailable".
 * Disabled entirely when every scoped domain is firebase (see isFullFirebaseMigration).
 */
function firebaseCrmFallback(req, res, next) {
  if (getSelectedBackend() !== 'firebase') return next();
  if (isFullFirebaseMigration()) return next();

  const method = req.method || 'GET';
  const path = req.path || '';

  const b = {
    feed: getSelectedBackend('feed'),
    users: getSelectedBackend('users'),
    groups: getSelectedBackend('groups'),
    ads: getSelectedBackend('ads'),
    marketplace: getSelectedBackend('marketplace'),
    surveys: getSelectedBackend('surveys'),
    onboarding: getSelectedBackend('onboarding'),
    interests: getSelectedBackend('interests'),
    posts: getSelectedBackend('posts'),
    moderation: getSelectedBackend('moderation'),
    verification: getSelectedBackend('verification'),
    notifications: getSelectedBackend('notifications'),
  };

  const rules = [
    {
      match: () => b.feed !== 'firebase' && method === 'GET' && path === '/api/v1/feed',
      respond: (req) => {
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
        return {
          status: 200,
          body: {
            success: true,
            feed: [],
            pagination: { page, limit, total: 0, hasMore: false },
          },
        };
      },
    },
    {
      match: () => b.feed !== 'firebase' && method === 'GET' && (path === '/api/v1/posts' || path === '/api/v1/posts/my'),
      respond: (req) => {
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
        return { status: 200, body: { success: true, posts: [], pagination: { page, limit, total: 0, hasMore: false } } };
      },
    },
    {
      match: () => b.users !== 'firebase' && method === 'GET' && path === '/api/users',
      respond: () => ({ status: 200, body: { success: true, count: 0, data: [] } }),
    },
    {
      match: () => b.users !== 'firebase' && method === 'GET' && /^\/api\/users\/[^/]+$/.test(path),
      respond: () => ({ status: 404, body: { success: false, error: 'User not found in Firebase migration mode.' } }),
    },
    {
      match: () => b.users !== 'firebase' && method === 'GET' && /^\/api\/users\/[^/]+\/documents$/.test(path),
      respond: () => ({ status: 200, body: { success: true, count: 0, data: [] } }),
    },
    {
      match: () => b.notifications !== 'firebase' && method === 'GET' && /^\/api\/users\/[^/]+\/notifications$/.test(path),
      respond: () => ({ status: 200, body: { success: true, count: 0, data: [] } }),
    },
    {
      match: () => b.notifications !== 'firebase' && method === 'GET' && /^\/api\/users\/[^/]+\/notifications\/stats$/.test(path),
      respond: () => ({ status: 200, body: { success: true, data: { total: 0, unread: 0 } } }),
    },
    {
      match: () => b.surveys !== 'firebase' && method === 'GET' && /^\/api\/users\/[^/]+\/survey-responses(\/[^/]+)?$/.test(path),
      respond: () => ({ status: 200, body: { success: true, count: 0, data: [] } }),
    },
    {
      match: () => b.groups !== 'firebase' && method === 'GET' && path === '/api/groups',
      respond: (req) => ({
        status: 200,
        body: {
          success: true,
          groups: [],
          pagination: { page: Number(req.query.page || 1), limit: Number(req.query.limit || 20), total: 0, hasMore: false },
        },
      }),
    },
    {
      match: () => b.groups !== 'firebase' && method === 'GET' && /^\/api\/groups\/[^/]+$/.test(path),
      respond: () => ({ status: 404, body: { success: false, error: 'Group not found in Firebase migration mode.' } }),
    },
    {
      match: () => b.ads !== 'firebase' && method === 'GET' && (path === '/api/v1/ads' || path === '/api/ads' || path === '/api/ads/active'),
      respond: () => ({ status: 200, body: { success: true, ads: [], pagination: { page: 1, limit: 20, total: 0, hasMore: false } } }),
    },
    {
      match: () => b.marketplace !== 'firebase' && method === 'GET' && path === '/api/marketplace/listings',
      respond: (req) => ({
        status: 200,
        body: {
          success: true,
          listings: [],
          pagination: { page: Number(req.query.page || 1), limit: Number(req.query.limit || 20), total: 0, hasMore: false },
        },
      }),
    },
    {
      match: () => b.interests !== 'firebase' && method === 'GET' && path === '/api/interests',
      respond: () => ({ status: 200, body: { success: true, count: 0, data: [], groups: [] } }),
    },
    {
      match: () => b.interests !== 'firebase' && method === 'GET' && path === '/api/interests/categories',
      respond: () => ({ status: 200, body: { success: true, count: 0, data: [] } }),
    },
    {
      match: () => b.users !== 'firebase' && method === 'GET' && path === '/api/user-interests',
      respond: () => ({ status: 200, body: { success: true, count: 0, data: [] } }),
    },
    {
      match: () => b.surveys !== 'firebase' && method === 'GET' && path === '/api/surveys',
      respond: () => ({ status: 200, body: { success: true, count: 0, data: [] } }),
    },
    {
      match: () => b.surveys !== 'firebase' && method === 'GET' && path === '/api/surveys/active',
      respond: () => ({ status: 200, body: { success: true, data: null, message: 'No active survey in Firebase migration mode.' } }),
    },
    {
      match: () => b.surveys !== 'firebase' && method === 'GET' && /^\/api\/surveys\/[^/]+\/analytics$/.test(path),
      respond: () => ({ status: 200, body: { success: true, data: { responses: 0, completionRate: 0, breakdown: [] } } }),
    },
    {
      match: () => b.posts !== 'firebase' && method === 'GET' && path === '/api/posts',
      respond: () => ({ status: 200, body: { success: true, data: [], nextPageToken: null, hasMore: false } }),
    },
    {
      match: () => b.posts !== 'firebase' && method === 'GET' && (path === '/api/posts/reported' || path === '/api/posts/flagged'),
      respond: () => ({ status: 200, body: { success: true, data: [], nextPageToken: null, hasMore: false } }),
    },
    {
      match: () => b.moderation !== 'firebase' && method === 'GET' && path === '/api/moderation/keywords',
      respond: () => ({ status: 200, body: { success: true, keywords: [] } }),
    },
    {
      match: () => b.moderation !== 'firebase' && method === 'GET' && path === '/api/moderation/settings',
      respond: () => ({ status: 200, body: { success: true, keywords: [], marketplaceRequiresApproval: false } }),
    },
    {
      match: () => b.onboarding !== 'firebase' && method === 'GET' && path === '/api/onboarding',
      respond: () => ({ status: 200, body: { success: true, count: 0, data: [] } }),
    },
    {
      match: () => b.onboarding !== 'firebase' && method === 'GET' && /^\/api\/onboarding\/[^/]+$/.test(path),
      respond: () => ({ status: 404, body: { success: false, error: 'Onboarding step not found in Firebase migration mode.' } }),
    },
    {
      match: () => b.verification !== 'firebase' && method === 'GET' && path === '/api/brands/verification',
      respond: (req) => ({
        status: 200,
        body: {
          success: true,
          requests: [],
          pagination: { page: Number(req.query.page || 1), limit: Number(req.query.limit || 20), total: 0, hasMore: false },
        },
      }),
    },
    {
      match: () => b.notifications !== 'firebase' && method === 'POST' && (path === '/api/notifications/send' || path === '/api/notifications/send-bulk'),
      respond: () => ({ status: 200, body: { success: true, data: { queued: 0, sent: 0, failed: 0, isFallback: true } } }),
    },
  ];

  for (const rule of rules) {
    if (rule.match()) {
      const { status, body } = rule.respond(req);
      return res.status(status).json(body);
    }
  }

  return next();
}

module.exports = { firebaseCrmFallback };

function normalizeBackend(raw) {
  return String(raw || '').trim().toLowerCase();
}

function getSelectedBackend(scope) {
  const scoped = scope ? process.env[`DATA_BACKEND_${String(scope).toUpperCase()}`] : null;
  const raw = scoped || process.env.DATA_BACKEND_DEFAULT || 'mongo';
  const normalized = normalizeBackend(raw);
  return normalized === 'firebase' ? 'firebase' : 'mongo';
}

/** All domains that have a dedicated DATA_BACKEND_* flag (CRM + auth bridge). */
const FULL_FIREBASE_MIGRATION_SCOPES = [
  'auth',
  'me',
  'feed',
  'interests',
  'users',
  'groups',
  'ads',
  'marketplace',
  'surveys',
  'onboarding',
  'posts',
  'moderation',
  'verification',
  'notifications',
];

function isFullFirebaseMigration() {
  return FULL_FIREBASE_MIGRATION_SCOPES.every((scope) => getSelectedBackend(scope) === 'firebase');
}

module.exports = {
  getSelectedBackend,
  isFullFirebaseMigration,
};

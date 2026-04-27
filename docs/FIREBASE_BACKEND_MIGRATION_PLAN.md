# Firebase Backend Migration Plan (Frontend Unchanged)

This plan keeps all existing frontend API calls and response shapes unchanged while migrating backend internals from MongoDB to Firebase.

## Goals

- Keep current REST contracts stable (`/api/v1/*` and active legacy routes).
- Migrate backend data/auth/storage in phases with rollback at each phase.
- Avoid big-bang rewrite; use feature flags and adapters.

## Product constraints (your direction)

- **Do not change design:** no CRM layout, styling, or navigation redesign. Same screens and routes; only backend storage and env flags change.
- **Backend order:** **(1) Groups** — finish and harden the groups domain on Firebase first (`/api/groups*`, Firestore `groups`, parity with the app). **(2) Chats** — then migrate chat-related APIs (`/api/v1/chat/*` and related persistence/notify flows) without changing how the Groups or group chat UI looks.

## Current State Snapshot

- API runtime: Express monolith (`server.js`, `api/index.js`)
- Data layer: MongoDB + Mongoose (`models/*`, controllers with direct model access)
- Auth: JWT middleware + provider login (`controllers/v1/authController.js`)
- Firebase today: Admin SDK for custom token + FCM (`services/firebaseAdmin.js`)
- Storage: Bunny CDN (`services/BunnyService.js`, `upload-helpers.js`)
- High-complexity domain: feed aggregation (`controllers/v1/feedController.js`)

## Target Architecture

- Keep Express as compatibility facade (same endpoints).
- Introduce data provider adapters per domain:
  - `mongo` provider (current behavior)
  - `firebase` provider (new behavior)
- Gradually move domains to Firestore/Firebase Auth behind feature flags.

## Feature Flag Strategy

- `DATA_BACKEND_DEFAULT=mongo|firebase`
- `DATA_BACKEND_AUTH=mongo|firebase`
- `DATA_BACKEND_ME=mongo|firebase`
- `DATA_BACKEND_FEED=mongo|firebase` (mobile feed + v1 posts CRUD on Firestore)
- `DATA_BACKEND_POSTS=mongo|firebase` (CRM `/api/posts*` moderation; separate from v1 feed flag)

Unset flags default to `mongo` during migration.

## Phased Execution

### Phase 0 - Contract Freeze (Now)

- Record canonical API contracts for frontend-critical endpoints.
- Add/extend regression tests for status code + payload shape parity.
- Define rollback switch per domain before first cutover.

### Phase 1 - Adapter Scaffolding (Now)

- Add data provider interfaces and env-based selector.
- Move auth controller reads/writes through provider interface first.
- Keep Mongo provider as default and behavior baseline.

### Phase 2 - Auth Migration

- Implement Firebase-backed auth provider with Firestore users collection.
- Keep existing JWT payload/claims and response body shape.
- Keep Mongo shadow user sync during bridge period for compatibility.
- During bridge, canonical Firebase user document id should match Mongo/JWT user id.
- Run canary with `DATA_BACKEND_AUTH=firebase`.

### Phase 3 - Low-Risk Collections

- Migrate simple domains first (profile metadata, interests, notifications metadata).
- Validate read/write parity via dual-run checks and reconciliation scripts.

### Phase 4 - Feed and Posts Redesign

- Replace Mongo aggregation patterns with denormalized Firestore projections.
- Build fanout/counter logic with Functions or background workers.
- Validate feed ranking/pagination parity before rollout.

### Phase 5 - Cutover and Cleanup

- Progressive rollout per domain with monitoring and rollback path.
- Remove obsolete Mongo code only after stable release windows.

## Domain Tracker

| Domain | Current backend | Firebase target | Complexity | Status | Rollback |
|---|---|---|---|---|---|
| Auth login/token | Mongo + JWT | Firestore users + same JWT contract | Medium | In progress (adapter added) | `DATA_BACKEND_AUTH=mongo` |
| Profile (`/me`) | Mongo | Firestore docs | Medium | In progress (adapter added) | `DATA_BACKEND_ME=mongo` |
| Interests | Mongo | Firestore docs | Low | In progress (Firebase CRUD live) | `DATA_BACKEND_INTERESTS=mongo` |
| Users (CRM) | Mongo | Firestore docs | Medium | In progress (Firebase reads/writes live) | `DATA_BACKEND_USERS=mongo` |
| Groups (CRM) | Mongo | Firestore docs | Medium | In progress (Firebase reads live) | `DATA_BACKEND_GROUPS=mongo` |
| Ads (CRM) | Mongo | Firestore docs | Medium | In progress (Firebase CRUD live) | `DATA_BACKEND_ADS=mongo` |
| Marketplace (CRM) | Mongo | Firestore docs | High | In progress (Firebase CRUD live) | `DATA_BACKEND_MARKETPLACE=mongo` |
| Surveys (CRM) | Mongo | Firestore docs | Medium | In progress (Firebase CRUD live) | `DATA_BACKEND_SURVEYS=mongo` |
| Onboarding (CRM) | Mongo | Firestore docs | Medium | In progress (Firebase CRUD live) | `DATA_BACKEND_ONBOARDING=mongo` |
| Posts CRUD | Mongo | Firestore + denormalized refs | High | In progress (Firebase CRUD/read live for CRM moderation) | `DATA_BACKEND_POSTS=mongo` |
| Feed + v1 posts | Mongo aggregation | Firestore `posts` + denormalized reads | Very high | In progress (read/create/delete/report on Firestore; likes/comments still Mongo) | `DATA_BACKEND_FEED=mongo` |
| Comments/Likes/Polls | Mongo | Firestore subcollections/counters | High | Planned | Domain flag |
| Group/chat notify | Mongo + Firebase FCM | Keep FCM, migrate metadata incrementally | Medium | Planned | Domain flag |
| Media uploads | Bunny | Keep Bunny first, optional Firebase Storage later | Medium | Planned | Keep Bunny |
| Moderation settings | Mongo | Firestore moderation settings doc | Low | In progress (Firebase settings/keywords live) | `DATA_BACKEND_MODERATION=mongo` |
| Brand verification | Mongo | Firestore verification requests | Medium | In progress (Firebase list/detail/approve/reject live) | `DATA_BACKEND_VERIFICATION=mongo` |
| Notifications (broadcast + user inbox) | Mongo | Firestore notifications + Firebase push tokens | Medium | In progress (Firebase send/list/read/stats + bulk live) | `DATA_BACKEND_NOTIFICATIONS=mongo` |

## Data Migration Rules

- Keep stable external IDs exposed to clients.
- For migrated entities, store source mapping (`mongoId`) if needed.
- Use one-way backfill script first, then optional dual-write window.
- Run reconciliation reports (counts + sampled records + invariants).

## API Compatibility Checklist

- No endpoint path changes.
- No required request field changes.
- No response shape changes.
- Preserve pagination keys and booleans (`hasMore`, etc.).
- Preserve auth token semantics for existing clients.

## Operational Checklist

- Add dashboards for: 4xx/5xx, auth failures, latency p95, write errors.
- Add alerting for provider mismatch and fallback frequency.
- Keep migration logs for every cutover/revert.

## CRM fallback middleware (partial migration only)

When `DATA_BACKEND_DEFAULT=firebase` but any scoped `DATA_BACKEND_*` is still `mongo`, `middleware/firebaseCrmFallbackMiddleware.js` returns empty CRM-safe JSON for unmigrated GET routes so the dashboard does not surface Mongo connection errors.

When **every** scoped domain in `services/data/backendSelector.js` (`isFullFirebaseMigration`) is `firebase`, this middleware becomes a no-op and all traffic is handled by real route handlers.

## Firestore indexes

Composite indexes used by the Firebase-backed API are declared in `firestore.indexes.json` at the repo root (including `notifications` by `userId` + `createdAt` and `userId` + `read`). Deploy with Firebase CLI after changes.

## Immediate Next Steps

1. Migrate mobile feed (`DATA_BACKEND_FEED`) and v1 posts off Mongo when ready (highest complexity).
2. Optional: remove Mongo shadow user bridge after all clients use Firebase-aligned IDs.
3. Run `firebase deploy --only firestore:indexes` whenever `firestore.indexes.json` changes.


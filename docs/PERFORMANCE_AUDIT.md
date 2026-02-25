# Backend Performance Audit Report

**Date:** 2025-02-25  
**Scope:** MongoDB connection, request timing, query patterns, indexes, and latency breakdown.

---

## 1. mongoose.connect() in route handlers

**Finding:** ✅ **None detected.**

- `mongoose.connect()` is **not** called inside any route handler.
- Connection is centralized in `config/db.js` and invoked from:
  - `server.js` at startup (when `MONGODB_URI` is set).
  - `middleware/ensureMongoMiddleware.js` (ensures connection before each request).
- One-off scripts (`scripts/delete-all-*.js`, `scripts/seed-*.js`) call `mongoose.connect()` directly; this is acceptable for CLI usage.

---

## 2. MongoDB connection caching (Vercel serverless)

**Finding:** ⚠️ **Previously not cached globally** → **Fixed.**

- **Before:** `config/db.js` used a module-level `let cachedConnection`. In Vercel serverless, each invocation can load a fresh module, so the connection was not reliably reused across cold starts.
- **After:** Connection is cached on `global` (or `globalThis`) so it persists across serverless invocations:
  - `global.mongoose = { conn: null, promise: null }`
  - Same connection and promise are reused; new connections are only created when the previous one is gone (e.g. after a cold start).

**File:** `config/db.js`

---

## 3. Global MongoDB connection caching (global.mongoose)

**Status:** ✅ **Implemented.**

- `config/db.js` now uses `globalForMongoose.mongoose` (backed by `globalThis` or `global`) to store `promise` and `conn`.
- `connectMongo()` returns the existing connection if `readyState === 1`, or awaits the cached promise if a connection is in progress.

---

## 4. Request timing middleware

**Status:** ✅ **Added.**

- **File:** `middleware/requestTimingMiddleware.js`
- Logs each request as: `[timing] METHOD path STATUS durationMs`
- Mounted in `server.js` after `express.json()`, before `ensureMongo`, so total request time (including DB wait) is measured.
- **Example:** `[timing] GET /api/v1/me 200 45ms`

---

## 5. console.time logs (Mongo, bcrypt, jwt.sign)

**Status:** ✅ **Implemented where applicable.**

| Target           | Location | Notes |
|------------------|----------|--------|
| **Mongo queries** | `config/db.js` | Optional: set `MONGODB_QUERY_TIMING=1` to enable. Wraps `Query.prototype.exec` and `Aggregate.prototype.exec`; each query logs e.g. `mongo:User:findOne: 12ms`. |
| **bcrypt.compare** | N/A | Not used in this codebase (auth is Twilio OTP + JWT). |
| **jwt.sign**       | `controllers/v1/authController.js`, `auth-service.js` | `console.time('jwt.sign')` / `console.timeEnd('jwt.sign')` around token creation. |

---

## 6. Sequential awaits → Promise.all

**Status:** ✅ **Refactored where safe.**

Parallelized the following (independent queries run in parallel):

| File | Handler | Change |
|------|---------|--------|
| `followController.js` | `getFollowers` | `Follow.find` + `Follow.countDocuments` → `Promise.all` |
| `followController.js` | `getFollowing` | Same pattern |
| `followController.js` | `getFollowStatus` | `User.findById` + `Follow.findOne` → `Promise.all` |
| `followController.js` | `getPublicProfile` | Same as getFollowStatus |
| `likesController.js` | `getPostLikes` | `Like.find` + `Like.countDocuments` → `Promise.all` |
| `commentsController.js` | `getPostComments` | `Comment.find` + `Comment.countDocuments` → `Promise.all` |
| `commentsController.js` | `getCommentReplies` | Same pattern |
| `postsController.js` | `getMyPosts` | `Post.find` + `Post.countDocuments` → `Promise.all` |
| `sharesController.js` | `getPostShares` | `Share.find` + `Share.countDocuments` → `Promise.all` |

Sequential awaits left intentional (e.g. create follow then update counters, or need result of first query for second).

---

## 7. .lean() on read-only queries

**Status:** ✅ **Applied.**

- Added `.lean()` (and where appropriate `.select(...)`) to read-only paths that previously returned full Mongoose documents:
  - **likesController:** `Post.findById`, `Like.findOne` (existence checks), `Like.findOne` (status).
  - **commentsController:** `Post.findById`, `Comment.findById` (parent check).
  - **sharesController:** `Post.findById` (existence), getPostShares already had `.lean()`.
  - **interestsMongoController:** `Interest.findOne` (duplicate checks) with `.select('_id').lean()`.
- Write paths (e.g. `post.save()`, `ad.save()`, `interest.save()`) correctly do **not** use `.lean()`.

---

## 8. Indexes (phoneNumber, email, userId, createdAt)

**Status:** ✅ **Checked and gaps fixed.**

### User model (`models/User.js`)

| Field / use | Before | After |
|-------------|--------|--------|
| `provider` + `providerUserId` | ✅ Unique compound | (unchanged) |
| `phoneNumber` | ❌ | ✅ `{ phoneNumber: 1 }` sparse |
| `email` | ❌ | ✅ `{ email: 1 }` sparse |
| `createdAt` (sort) | ❌ | ✅ `{ createdAt: -1 }` |

### Other models

- **userId:** Already indexed where used (e.g. Follow, Like, Comment, Share, UserFeed, SurveyResponse, PollVote).
- **createdAt:** Already used in compound indexes (e.g. Post, Comment, Follow, Like, Share, UserFeed).
- No additional indexes required for this audit.

---

## 9. Where delay happens – ms breakdown

Approximate contribution of each part of a typical request (for understanding, not from a single trace):

| Phase | Typical range | Notes |
|-------|----------------|--------|
| **Middleware (cors, compression, json, timing)** | &lt; 1 ms | Negligible. |
| **ensureMongo** | 0–30+ ms | 0 if connection already warm; 30+ ms on cold start (Vercel) or first request. Now reduced by global connection cache. |
| **JWT verify (protected routes)** | 1–3 ms | One `User.findById` in `verifyJwt`; `.lean()` and index on `_id` keep it fast. |
| **Mongo read queries** | 2–20 ms each | Depends on index usage and document size. `.lean()` reduces work; parallel `Promise.all` reduces total wall time. |
| **Mongo write (create/update)** | 5–30 ms | Usually higher than reads. |
| **jwt.sign (login/verify-otp)** | &lt; 5 ms | Logged via `console.time('jwt.sign')`. |
| **Response send** | &lt; 1 ms | After `res.json()`. |

**Total request duration** is logged by the new timing middleware as `[timing] METHOD path STATUS Xms`. To get a real ms breakdown for a specific endpoint:

1. Set `MONGODB_QUERY_TIMING=1` and run the app.
2. Trigger the endpoint; check logs for:
   - `[timing] ... Xms` (total)
   - `mongo:Model:op: Yms` (per query)
   - `jwt.sign: Zms` (when applicable).
3. Approximate breakdown: **ensureMongo** (once per cold start) + sum of **mongo** times + **jwt.sign** (if any) + small overhead ≈ total.

**Recommendations:**

- Keep the global MongoDB cache; avoid creating new connections per request.
- Rely on request timing middleware and optional query timing to find slow endpoints and slow queries.
- Ensure indexes are used (e.g. `phoneNumber`, `email`, `createdAt` on User) for filters and sorts used in your routes.

---

## Summary

| # | Item | Status |
|---|------|--------|
| 1 | mongoose.connect in route handlers | ✅ None found |
| 2 | MongoDB connection not cached globally | ✅ Fixed (global.mongoose) |
| 3 | Global MongoDB connection caching | ✅ Implemented |
| 4 | Request timing middleware | ✅ Added |
| 5 | console.time (Mongo, bcrypt, jwt.sign) | ✅ Mongo optional, jwt.sign added; bcrypt N/A |
| 6 | Sequential awaits → Promise.all | ✅ Refactored where safe |
| 7 | .lean() on read-only queries | ✅ Applied |
| 8 | Indexes (phoneNumber, email, userId, createdAt) | ✅ User indexes added; others already present |
| 9 | Delay / ms breakdown | ✅ Documented above; use middleware + MONGODB_QUERY_TIMING for real numbers |

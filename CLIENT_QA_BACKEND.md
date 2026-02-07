# KINS App — Client Q&A (Backend)

Answers for client questions, **backend only**. Use alongside the frontend Q&A for a complete picture.

---

## Backend answers

### 1. What is the backend tech stack (language, framework)?

- **Language:** JavaScript (Node.js)
- **Runtime:** Node.js (v14+)
- **Framework:** Express.js
- **Key libraries:** `firebase-admin` (Firebase Auth + Firestore), `cors`, `dotenv`, `multer` (file uploads)

The API is a single Node.js process that serves REST endpoints and talks to Firebase and Bunny CDN.

---

### 2. Describe the database (SQL / NoSQL)?

**NoSQL — Google Cloud Firestore.**

- **Type:** Document database (Firestore), managed by Google as part of Firebase.
- **Structure:** Collections and documents (e.g. `users`, `interests`, `surveys`, `onboarding`, `posts`; subcollections like `users/{id}/documents`, `users/{id}/notifications`).
- **Indexes:** Composite indexes are defined in `firestore.indexes.json` (e.g. for onboarding steps, posts by status and date).
- **Auth:** User identity is in Firebase Authentication; profile and app data live in Firestore.

So: no SQL database; all persistent app data is in Firestore.

---

### 3. Describe the hosting structure (AWS, GCP, Azure, etc.)?

**Firebase/Google Cloud for data and push; API hosting is flexible.**

- **Firebase / GCP:** Firestore, Firebase Authentication, and Firebase Cloud Messaging (FCM) run on Google Cloud. The project uses Firebase project `kins-b4afb` and its Firestore/Storage/Auth.
- **API server:** The Node.js/Express API is not tied to a specific cloud in the repo. It can be hosted on any Node-friendly platform, for example:
  - **GCP:** Cloud Run, App Engine, or a VM
  - **Other:** Railway, Render, Heroku, AWS (EC2, ECS, Lambda), etc.
- **File/CDN:** Onboarding images (and similar uploads) are stored on **Bunny CDN** (storage zone + pull zone), not on Firebase Storage for that use case. Config is via env vars (`BUNNY_STORAGE_ZONE`, `BUNNY_CDN_URL`, etc.).

So: **data and push = Firebase/GCP**; **API = any Node host**; **static/media = Bunny CDN**.

---

### 4. What are all the third-party backend tools (cloud storage, image/video processing, notifications, logins, etc.)?

| Purpose | Service / tool | Notes |
|--------|----------------|--------|
| **Database** | Firestore (Firebase / GCP) | All app data (users, interests, surveys, onboarding, posts, etc.) |
| **Authentication** | Firebase Authentication | User identity (e.g. phone/email); backend uses Admin SDK |
| **Push notifications** | Firebase Cloud Messaging (FCM) | Send push to devices; FCM tokens stored in Firestore |
| **File storage / CDN** | Bunny CDN | Onboarding (and other) image uploads; public URLs via pull zone |
| **Upload handling** | Multer | In-memory multipart handling (e.g. 5 MB image limit) before sending to Bunny |
| **API** | Express, CORS, dotenv | Express for REST API; no separate API gateway in repo |

**Not in backend (handled elsewhere):** Image/video processing (resize, transcode) is not implemented in this codebase; uploads go to Bunny as received. Any such processing would be an additional service (e.g. Cloud Functions, separate worker, or Bunny/other pipeline).

---

### 5. Is the backend monolithic or modular/microservices?

**Monolithic and modular within the monolith.**

- **Single deployable:** One Node.js app (`server.js`) and one process.
- **Modular by domain:** Logic is split into helper modules (e.g. `data-helpers`, `interests-helpers`, `notifications-helpers`, `surveys-helpers`, `posts-helpers`, `onboarding-helpers`, `upload-helpers`), each focused on one area. Routes in `server.js` call these helpers.
- **No microservices:** There are no separate services (e.g. separate auth service or notification service); everything runs in one API server.

So: one service, but organized so features can be maintained and extended without rewriting the whole backend.

---

### 6. How many users can the current tech handle before crashing? (e.g. 1k / 100k / 1M)?

**Rough order-of-magnitude (backend API + Firebase):**

- **Firestore / FCM / Auth:** These are managed services and scale with usage (quotas and pricing apply). They are not the first bottleneck.
- **API server:** A single Node/Express instance on a typical small-to-medium host (e.g. 1 vCPU, 1–2 GB RAM) can often handle on the order of **hundreds to low thousands of concurrent users** (depending on request mix and latency to Firestore). So in terms of “total users” the system could support **tens of thousands of registered users** with moderate, spread-out traffic.
- **“Crashing”** in practice would most likely come from: (1) the single API process running out of memory or CPU under a spike, or (2) hitting Firestore/FCM rate limits or cost limits if traffic is very high.

So: **current design is suitable for small-to-medium scale (e.g. up to roughly tens of thousands of users with moderate concurrency)**. Exact numbers depend on deployment (CPU/memory), traffic patterns, and Firebase quotas.

---

### 7. What needs to change to allow the platform to handle 100k+ or 1M+ users?

To scale toward **100k+** and **1M+** users, the backend would typically need:

1. **API scaling**
   - Run multiple instances of the Node API behind a load balancer (horizontal scaling).
   - Use a platform that supports this (e.g. Cloud Run, App Engine, ECS, Kubernetes) or multiple VMs/containers.

2. **Caching**
   - Add a cache (e.g. Redis, or managed cache) for frequently read data (e.g. interests, onboarding steps, hot user profiles) to reduce Firestore reads and latency.

3. **Rate limiting and protection**
   - Rate limiting and (optionally) API keys or auth for the CRM/backend API to avoid abuse and traffic spikes taking down a single process.

4. **Firestore usage**
   - Rely on Firestore’s scaling; ensure queries use indexes and avoid unbounded or heavy reads. Consider pagination and limits on large collections (already partially in place, e.g. posts).

5. **Background work**
   - Move heavy or batch work (e.g. bulk notifications, reports) to queues and workers (e.g. Cloud Tasks, SQS, Bull) so the API stays responsive.

6. **Monitoring and ops**
   - Logging, metrics, and alerts (e.g. GCP Monitoring, Datadog) to detect and fix bottlenecks and failures.

7. **Cost and quotas**
   - Review Firebase (Firestore, FCM, Auth) quotas and pricing at target scale; plan for possible sharding or additional GCP services if needed.

None of this requires a full rewrite; the current modular monolith can be scaled out and augmented with caching, queues, and better hosting.

---

*Backend Q&A based on current KINS CRM codebase. Frontend Q&A is separate.*

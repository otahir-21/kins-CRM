# Speed optimization – data feels slow to the frontend

## What was added (backend)

- **Response compression (gzip):** `compression` middleware is enabled. JSON and text responses are compressed so less data is sent over the network. The frontend will receive smaller payloads and decode them automatically.

---

## Backend (Node / Vercel)

1. **Cold starts (Vercel serverless)**  
   First request after idle can be 1–3+ seconds. Options:
   - Use a **cron or monitoring** to hit a lightweight endpoint every few minutes (e.g. GET /health) so the function stays warm.
   - Or accept cold start for first load and optimize the rest.

2. **MongoDB region**  
   If your API runs on Vercel (e.g. US) and MongoDB Atlas is in another region (e.g. EU), each request has extra latency. Create the Atlas cluster in the **same region** as your deployment (e.g. us-east-1) to reduce round-trip time.

3. **Indexes**  
   Ensure indexes exist for what you query:
   - Feed/posts: `isActive`, `createdAt`, `userId`, `interests`.
   - Groups: `members`, `updatedAt`, `nameLower`.
   - Users: `provider` + `providerUserId`, and for search consider a text index on name/username if you use it.
   Run queries in Atlas or with `.explain()` to confirm they use indexes.

4. **Limit payload size**  
   Return only fields the app needs (e.g. `.select()` in Mongoose, or trim objects before `res.json()`). Avoid sending large arrays (e.g. cap list lengths and paginate).

5. **Avoid N+1**  
   Prefer one aggregated query or `.populate()` in a single call instead of many small queries per item.

---

## Frontend (Flutter / React)

1. **Parallel requests**  
   If you need feed + user + groups, call them in **parallel** (e.g. `Future.wait` / `Promise.all`) instead of one after the other so total time ≈ slowest request, not the sum.

2. **Show something first**  
   Show a skeleton or cached data immediately; then refresh with the latest. Avoid “blank until everything loads.”

3. **Cache**  
   Cache list/data in memory or local storage and show it while revalidating in the background (stale-while-revalidate). So the user sees data quickly and it updates when the request returns.

4. **Pagination**  
   Load the first page only (e.g. 20 items). Load more on scroll. Don’t fetch hundreds of items on first load.

5. **Optimistic UI**  
   For actions (e.g. like, send message), update the UI immediately and revert if the request fails. The app feels faster.

---

## Quick checklist

| Area            | Action |
|-----------------|--------|
| Backend         | Compression enabled (done). Same region for MongoDB and Vercel. Add indexes for hot queries. |
| Frontend        | Parallel API calls. Show cached/skeleton first. Paginate lists. |
| Infra           | Keep server warm (cron to /health). Consider CDN for static assets. |

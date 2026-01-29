# Post Moderation – Cost-Effective Design

## The problem
- All users can upload posts.
- CRM needs to show posts so moderators can delete inappropriate ones.
- **Firebase/Firestore charges per document read** – loading all posts in CRM would be expensive at scale.

## Recommended approach (minimize reads & cost)

### 1. **Pagination (required)**
- **Never** load all posts at once.
- Load **20–30 posts per page** (configurable).
- Use **cursor-based pagination** with `startAfter(lastDoc)` so each request reads only one page.
- **Cost:** 20–30 reads per CRM page load instead of thousands.

### 2. **Optional: “Reported first” (recommended)**
- When a user reports a post, increment `reportCount` on the post (or add to a `reportedPosts` list).
- CRM has a filter: **“Reported posts”** (or “Flagged”).
- Moderators focus on reported content first; only those posts are read when that filter is on.
- **Cost:** Reads only for posts that need attention, not the whole feed.

### 3. **Optional: Time range**
- Add filter: “Last 7 days” / “Last 30 days”.
- Query posts where `createdAt >= startOfRange`.
- Reduces reads by not scanning old posts unless needed.

### 4. **No real-time listener in CRM**
- Use **one-time reads** (e.g. “Load next 20”) instead of Firestore `onSnapshot` in CRM.
- **Cost:** One read per document per request, not continuous reads.

### 5. **Optional: Backend cache**
- Backend caches “recent posts” (e.g. last 100) for 5–10 minutes.
- CRM calls your API; API serves from cache when possible and refetches from Firestore when cache expires.
- **Cost:** Many CRM page views = one Firestore read per post per cache period instead of per view.

---

## Firestore structure (assumed)

Your app may use one of these; we assume a **global posts collection**:

```
/posts/{postId}
{
  "userId": "string",
  "userName": "string",
  "userProfileImage": "string | null",
  "content": "string",
  "imageUrl": "string | null",
  "createdAt": "timestamp",
  "status": "active" | "deleted" | "hidden",
  "reportCount": 0,
  "reportedBy": ["userId1", "userId2"]  // optional
}
```

If your app uses **user-scoped posts** instead:

```
/users/{userId}/posts/{postId}
```

then the backend would need to query across users (e.g. collection group query `posts`), which Firestore supports.

---

## What we implement

1. **Backend**
   - `getPostsPaginated(limit, startAfterDocId, options)` – optional filters: status, reported only, time range.
   - `getPostById(postId)`.
   - `deletePost(postId)` – soft delete (set `status: 'deleted'`) or hard delete.
   - Optional: `getReportedPosts(limit, startAfter)` for “reported only” tab.

2. **API**
   - `GET /api/posts?limit=20&startAfter=docId&status=active&reportedOnly=false`
   - `GET /api/posts/reported?limit=20&startAfter=docId`
   - `GET /api/posts/:postId`
   - `DELETE /api/posts/:postId`

3. **CRM**
   - “Posts” or “Moderation” page.
   - Table/cards: author, content preview, image thumbnail, date, report count (if any), actions.
   - **Pagination:** “Load more” or “Next page” using `startAfter`.
   - **Filter:** All | Reported only.
   - **Action:** Delete (soft delete so client can undo or sync to app).

---

## Cost comparison (example)

- 10,000 posts in Firestore.
- **Without pagination:** 10,000 reads every time CRM opens the page.
- **With pagination (20 per page):** 20 reads per page; 500 pages total if they browse everything.
- **With “Reported only”:** e.g. 50 reported posts → 50 reads when viewing that tab.
- **With cache (e.g. 5 min):** 20 reads per 5 min for “recent 20”, regardless of how often the client refreshes.

So: **pagination + optional “reported first” + optional cache** keeps cost low while letting the client delete inappropriate posts from the CRM.

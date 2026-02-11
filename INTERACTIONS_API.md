# Interactions API - Quick Reference

**Base URL:** `https://kins-crm.vercel.app/api/v1`

All endpoints require: `Authorization: Bearer YOUR_JWT_TOKEN`

---

## 👍 LIKES

### Like a Post
```
POST /posts/:postId/like
```
**Response:** `{ "success": true, "message": "Post liked successfully." }`

### Unlike a Post
```
DELETE /posts/:postId/like
```

### Get Who Liked a Post
```
GET /posts/:postId/likes?page=1&limit=20
```
**Returns:** List of users who liked + pagination

### Check if I Liked a Post
```
GET /posts/:postId/like/status
```
**Returns:** `{ "success": true, "isLiked": true, "likedAt": "..." }`

### Like a Comment
```
POST /comments/:commentId/like
```

### Unlike a Comment
```
DELETE /comments/:commentId/like
```

---

## 💬 COMMENTS

### Create Comment or Reply
```
POST /posts/:postId/comments
```
**Body:**
```json
{
  "content": "Great post!",
  "parentCommentId": "commentId" // Optional, for replies
}
```

- **Top-level comment:** Omit `parentCommentId`
- **Reply:** Include `parentCommentId`
- Max 2000 characters

### Get Comments for a Post
```
GET /posts/:postId/comments?page=1&limit=20
```
**Returns:** Top-level comments only (newest first)

### Get Replies for a Comment
```
GET /comments/:commentId/replies?page=1&limit=10
```
**Returns:** Nested replies (oldest first)

### Delete Comment
```
DELETE /comments/:commentId
```
*(Only author can delete)*

---

## 🔄 SHARES

### Share a Post
```
POST /posts/:postId/share
```
**Body:**
```json
{
  "shareType": "external", // "repost" | "external" | "direct_message"
  "caption": "Optional caption"
}
```

**Share Types:**
- `repost` - Share to your own feed (with optional caption)
- `external` - Share outside the app (track external shares)
- `direct_message` - Share via direct message

### Get Who Shared a Post
```
GET /posts/:postId/shares?page=1&limit=20
```

---

## 👁️ VIEWS

### Increment View Count
```
POST /posts/:postId/view
```
- Call when post appears on screen (50%+ visible for 1+ second)
- Idempotent (no duplicate check needed)
- Returns: `{ "success": true, "message": "View recorded." }`

---

## 📊 Post Object with Engagement

When fetching posts (via feed or single post), engagement data is included:

```json
{
  "_id": "postId",
  "userId": {...},
  "type": "text",
  "content": "Post content",
  "likesCount": 42,
  "commentsCount": 15,
  "sharesCount": 8,
  "viewsCount": 1234,
  "createdAt": "2026-02-11T08:26:21.674Z"
}
```

---

## 📱 Mobile App UI Flow

### Like Button

1. Show heart icon (filled if liked, outline if not)
2. Display `likesCount` next to icon
3. On tap:
   - If liked: `DELETE /posts/:postId/like`
   - If not liked: `POST /posts/:postId/like`
4. Update UI optimistically (don't wait for response)
5. On error: Revert UI change

### Comment Section

1. **Load comments:** `GET /posts/:postId/comments`
2. **Display each comment** with:
   - User profile pic + name
   - Comment text
   - Like count + like button
   - Reply count + "View replies" button (if > 0)
   - Timestamp
3. **"View replies" button:** `GET /comments/:commentId/replies`
4. **Create comment form:** `POST /posts/:postId/comments`
5. **Reply button:** `POST /posts/:postId/comments` with `parentCommentId`

### Share Dialog

1. Show bottom sheet with share options
2. On selection: `POST /posts/:postId/share` with `shareType`
3. For "repost": Show caption input field
4. Show success message after share

### View Tracking

```dart
// Pseudo-code
onPostVisible(postId) {
  if (visibilityPercentage > 50 && visibleFor > 1second) {
    api.incrementView(postId);
  }
}
```

---

## 🔧 Error Handling

**Common errors:**
- `400` - Already liked / Not liked / Invalid data
- `403` - Not authorized (e.g., delete someone else's comment)
- `404` - Post/Comment not found
- `500` - Server error

**Example error response:**
```json
{
  "success": false,
  "error": "You already liked this post."
}
```

---

## 🚀 Performance Tips

1. **Optimistic UI Updates:**
   - Update UI immediately when user interacts
   - Revert on error
   - Improves perceived performance

2. **Pagination:**
   - Load comments/likes in batches (20 per page)
   - Implement infinite scroll
   - Show "Load more" button

3. **Caching:**
   - Cache like status for viewed posts
   - Cache comments for recently viewed posts
   - Invalidate on user actions

4. **Batching:**
   - Don't call view endpoint for every post
   - Batch view increments (e.g., every 10 posts)

---

## 📊 Complete Endpoint List

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Post Likes** |
| POST | `/posts/:postId/like` | Like a post |
| DELETE | `/posts/:postId/like` | Unlike a post |
| GET | `/posts/:postId/likes` | Get users who liked |
| GET | `/posts/:postId/like/status` | Check if I liked |
| **Comments** |
| POST | `/posts/:postId/comments` | Create comment/reply |
| GET | `/posts/:postId/comments` | Get top-level comments |
| GET | `/comments/:commentId/replies` | Get replies |
| DELETE | `/comments/:commentId` | Delete comment |
| **Comment Likes** |
| POST | `/comments/:commentId/like` | Like a comment |
| DELETE | `/comments/:commentId/like` | Unlike a comment |
| **Shares** |
| POST | `/posts/:postId/share` | Share a post |
| GET | `/posts/:postId/shares` | Get users who shared |
| **Views** |
| POST | `/posts/:postId/view` | Increment view count |

---

## 🎯 Example Requests

### Like a Post
```bash
curl -X POST https://kins-crm.vercel.app/api/v1/posts/POST_ID/like \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Comment
```bash
curl -X POST https://kins-crm.vercel.app/api/v1/posts/POST_ID/comments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Great post!"}'
```

### Reply to Comment
```bash
curl -X POST https://kins-crm.vercel.app/api/v1/posts/POST_ID/comments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "I agree!", "parentCommentId": "COMMENT_ID"}'
```

### Share Post as Repost
```bash
curl -X POST https://kins-crm.vercel.app/api/v1/posts/POST_ID/share \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shareType": "repost", "caption": "Check this out!"}'
```

---

## 📖 Full Documentation

- **Architecture & Scalability:** See `INTERACTIONS_SYSTEM.md`
- **Complete API Docs:** See `API_V1.md`
- **Mobile Integration Guide:** See `MOBILE_ENDPOINTS.md`

---

**Last Updated:** February 11, 2026  
**Status:** Production Ready ✅  
**Scalability:** Designed for millions of users 🚀

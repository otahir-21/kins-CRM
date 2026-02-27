# Save Post (Bookmark) API

Base: **`/api/v1`**. All endpoints require **JWT** (`Authorization: Bearer <token>`).

---

## Save a post

**POST** `/api/v1/posts/:postId/save`

- **Response:** `{ "success": true, "message": "Post saved.", "isSaved": true }`
- **400** if post is already saved.

---

## Unsave a post

**DELETE** `/api/v1/posts/:postId/save`

- **Response:** `{ "success": true, "message": "Post removed from saved.", "isSaved": false }`
- **400** if post was not saved.

---

## Check if post is saved

**GET** `/api/v1/posts/:postId/save/status`

- **Response:** `{ "success": true, "isSaved": true }` or `{ "isSaved": false }`

---

## List my saved posts

**GET** `/api/v1/me/saved-posts?page=1&limit=20`

- **Query:** `page` (default 1), `limit` (default 20, max 100).
- **Response:** Same shape as feed items so the app can reuse the same post card. Each post includes author in several forms so the app never shows "Anonymous":
  - `author`: `{ _id, id, name, username, profilePictureUrl }` (both `_id` and `id` for compatibility)
  - `authorName`, `authorUsername`, `authorPhotoUrl`: top-level fallbacks
  - `posts`: array of post objects; `pagination`: `{ page, limit, total, hasMore }`

---

## Summary

| Action        | Method | URL |
|---------------|--------|-----|
| Save post     | POST   | `/api/v1/posts/:postId/save` |
| Unsave post   | DELETE | `/api/v1/posts/:postId/save` |
| Save status   | GET    | `/api/v1/posts/:postId/save/status` |
| List saved    | GET    | `/api/v1/me/saved-posts?page=1&limit=20` |

# Tag users in posts (mentions)

Users can tag/mention other users in a post. The backend stores `taggedUserIds` and returns `taggedUsers` (id, name, username, profilePictureUrl) in post responses.

---

## Create post with tags

**POST** `/api/v1/posts`

- **Body:** Include `taggedUserIds` (optional): array of user IDs to mention, e.g. `["userId1", "userId2"]`.
- If the request is **multipart/form-data**, `taggedUserIds` can be sent as a **JSON string**, e.g. `"[\"id1\",\"id2\"]"`.
- **Rules:** Max **30** tagged users per post. Only IDs that exist in the User collection are stored; invalid IDs are ignored.
- **Response:** The created post includes `taggedUserIds` (array of IDs) and `taggedUsers` (array of `{ id, name, username, profilePictureUrl }`).

---

## Where tagged users appear

- **POST /api/v1/posts** (create) – response `post.taggedUserIds` and `post.taggedUsers`
- **GET /api/v1/posts/:id** – `post.taggedUserIds` and `post.taggedUsers`
- **GET /api/v1/feed** – each feed item has `taggedUsers: [{ id, name, username, profilePictureUrl }, ...]`
- **GET /api/v1/me/saved-posts** – each post has `taggedUsers`

The app can render @username from `taggedUsers` and link to profile using `id`.

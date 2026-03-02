# Showing reposts in the discover screen

## List of reposts (separate API)

To show a **dedicated list of reposts** (e.g. "Your reposts" or a Reposts tab on profile), use:

**`GET /api/v1/me/reposts?page=1&limit=20`** (requires JWT)

Response:

```json
{
  "success": true,
  "reposts": [
    {
      "post": { "_id": "...", "author": {...}, "content": "...", "media": [...], ... },
      "repostedAt": "2026-02-27T12:00:00.000Z",
      "caption": null
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "hasMore": false }
}
```

- **`reposts`**: array of `{ post, repostedAt, caption }`. Use `post` with the same card as feed; show `repostedAt` if you want "Reposted on …".
- No separate "repost" entity—each item is the original post plus when you reposted it.

## Backend response shapes (for app parsing)

The app can look for the list in several places. This backend returns:

| Endpoint | List location | Example |
|----------|----------------|---------|
| `GET /api/v1/feed?page=1&limit=20` | **`response.feed`** | `{ success: true, feed: [...], pagination: {...} }` |
| `GET /api/v1/posts?page=1&limit=20` | **`response.posts`** | `{ success: true, posts: [...], pagination: {...} }` |

So `response['feed']` (feed endpoint) and `response['posts']` (posts endpoint) are both supported by the flexible parser. One malformed item should be skipped per-item so the rest of the list still shows.

## Backend behavior

- **Feed endpoint:** `GET /api/v1/feed?page=1&limit=20` (requires JWT).
- When a user reposts a post (`POST /api/v1/posts/:postId/share` with `shareType: "repost"`), that **original post** is added to the feed of everyone who **follows the reposter**.
- Each feed item can include a **`repostedBy`** object when the item came from a repost.

## Response shape

Each item in `feed` can look like:

```json
{
  "_id": "...",
  "author": { "_id": "...", "name": "...", "username": "...", "profilePictureUrl": "..." },
  "content": "...",
  "feedSource": "repost",
  "repostedBy": {
    "id": "userIdWhoReposted",
    "name": "Osama",
    "username": "otahir21",
    "profilePictureUrl": "https://..."
  },
  ...
}
```

- If the post is **not** a repost in this feed, `repostedBy` is `null` and `feedSource` is e.g. `"follower"` or `"interest"`.
- If the post **is** a repost, `repostedBy` is set and `feedSource` is `"repost"`.

## How to show it in the discover screen

1. **Use the feed API for discover**  
   Call `GET /api/v1/feed` so reposts from people the user follows are included.

2. **When `repostedBy` is not null**  
   Show a repost line above the post content, for example:
   - **"Osama reposted"** (with a small repost icon and optional tap to open Osama’s profile).
   - Use `repostedBy.name` or `repostedBy.username` and optionally `repostedBy.profilePictureUrl`.

3. **Post content**  
   Render the rest of the item as usual: `author`, `content`, `media`, etc. The **author** is always the original post author; **repostedBy** is who reposted it into this user’s feed.

Example logic:

```dart
// Flutter-style
if (item['repostedBy'] != null) {
  // Show "X reposted" row
  showRepostBanner(
    name: item['repostedBy']['name'],
    username: item['repostedBy']['username'],
    avatarUrl: item['repostedBy']['profilePictureUrl'],
  );
}
// Then show the post card (author, content, media, ...)
showPostCard(post: item);
```

No extra API calls are needed; `repostedBy` is included in the same feed response.

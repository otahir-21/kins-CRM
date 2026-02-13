# Feed API Response (Optimized – No N+1)

## GET /api/v1/feed

**Single request.** The feed returns everything needed to render each post. The frontend must **not** call `GET /posts/:id/like/status` or `GET /posts/:id/poll` per post.

---

## Response shape (per post)

```json
{
  "success": true,
  "feed": [
    {
      "_id": "postId",
      "author": {
        "_id": "userId",
        "name": "User Name",
        "username": "username",
        "profilePictureUrl": "https://..."
      },
      "content": "Post text or null",
      "media": [],
      "likesCount": 10,
      "commentsCount": 2,
      "sharesCount": 0,
      "viewsCount": 5,
      "isLiked": false,
      "userVote": null,
      "pollResults": null,
      "interests": [{ "_id": "...", "name": "technologies" }],
      "type": "text",
      "createdAt": "2026-02-11T12:00:00.000Z",
      "feedScore": 149.5,
      "feedSource": "interest"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "hasMore": true }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Post ID |
| `author` | object | `_id`, `name`, `username`, `profilePictureUrl` |
| `content` | string \| null | Post text |
| `media` | array | Media items (image/video) |
| `likesCount` | number | Total likes (use for display) |
| `commentsCount` | number | Total comments |
| `sharesCount` | number | Total shares |
| `viewsCount` | number | Total views |
| **`isLiked`** | boolean | **Current user liked this post** – do not call like/status |
| **`userVote`** | number \| null | **Poll option index current user voted for**, or `null` if not voted – do not call poll results |
| **`pollResults`** | object \| null | **Only for `type === "poll"`** – question, options with votes/percentage, totalVotes |
| `interests` | array | Post interests |
| `type` | string | `text` \| `image` \| `video` \| `poll` |
| `createdAt` | string | ISO date |
| `feedScore` | number | Feed ranking score |
| `feedSource` | string | `interest` \| `follower` |

### Poll post example

When `type === "poll"`, `pollResults` is set:

```json
{
  "_id": "...",
  "type": "poll",
  "content": null,
  "isLiked": false,
  "userVote": 1,
  "pollResults": {
    "question": "What's your favorite?",
    "totalVotes": 8,
    "options": [
      { "text": "Option A", "votes": 3, "percentage": 37.5 },
      { "text": "Option B", "votes": 5, "percentage": 62.5 }
    ]
  }
}
```

- **`userVote`**: `0` = first option, `1` = second, etc. `null` = current user has not voted.
- **`pollResults`**: Use for bars and percentages; no extra poll API call.

---

## Frontend usage

1. Call **only** `GET /api/v1/feed` for the list.
2. For each post:
   - Use **`isLiked`** for the like button state (do not call `GET /posts/:id/like/status`).
   - Use **`userVote`** and **`pollResults`** for poll UI (do not call `GET /posts/:id/poll`).
3. After the user likes/unlikes or votes, call the action endpoint (POST/DELETE like, POST vote) and then update local state or refetch the feed.

---

## Backend implementation

- **Likes:** `$lookup` on `likes` with `postId` + current `userId` → `isLiked`.
- **Poll:** `$lookup` on `pollvotes` (userId + postId) → `userVote` (option index). `pollResults` is built from `post.poll` (options, votes, percentages).
- **Author / interests:** `$lookup` on `users` and `interests`.

All of this is done in one aggregation so there are no N+1 requests.

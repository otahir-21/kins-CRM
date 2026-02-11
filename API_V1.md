# API v1 – Auth, Profile, Interests

Base URL: **`/api/v1`**

- **Auth:** Frontend verifies user (Phone / Google / Apple); backend trusts payload and issues JWT.
- **Protected routes:** Send `Authorization: Bearer <token>` (JWT from login).
- **Storage:** MongoDB only (no Firebase/Firestore).

---

## Auth

### POST /auth/login

Rate limited (e.g. 30 requests per 15 minutes per IP).

**Request:**

```json
{
  "provider": "phone",
  "providerUserId": "+971501234567",
  "phoneNumber": "+971501234567",
  "email": null,
  "name": "Jane",
  "profilePictureUrl": null
}
```

- `provider`: `"phone"` | `"google"` | `"apple"` (required)
- `providerUserId`: string, unique per provider (required)
- `phoneNumber`, `email`, `name`, `profilePictureUrl`: optional strings

**Response (200):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "provider": "phone",
    "providerUserId": "+971501234567",
    "name": "Jane",
    "email": null,
    "phoneNumber": "+971501234567",
    "username": null,
    "profilePictureUrl": null,
    "bio": null,
    "status": null,
    "gender": null,
    "dateOfBirth": null,
    "documentUrl": null,
    "followerCount": 0,
    "followingCount": 0,
    "createdAt": "2025-02-06T12:00:00.000Z",
    "updatedAt": "2025-02-06T12:00:00.000Z"
  }
}
```

**Errors:** 400 (invalid body), 401 (rate limit / invalid), 500 (e.g. JWT_SECRET missing).

---

## User profile (JWT required)

### GET /me

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "provider": "phone",
    "providerUserId": "+971501234567",
    "name": "Jane",
    "email": null,
    "phoneNumber": "+971501234567",
    "username": "jane_d",
    "profilePictureUrl": null,
    "bio": "Mom of two.",
    "status": "expecting",
    "gender": "female",
    "dateOfBirth": "1990-05-15",
    "documentUrl": null,
    "followerCount": 0,
    "followingCount": 0,
    "interests": ["507f1f77bcf86cd799439012"],
    "interestsUpdatedAt": "2025-02-06T12:05:00.000Z",
    "createdAt": "2025-02-06T12:00:00.000Z",
    "updatedAt": "2025-02-06T12:05:00.000Z"
  }
}
```

---

### PUT /me/about

**Headers:** `Authorization: Bearer <token>`

**Request (all fields optional):**

```json
{
  "name": "Jane Doe",
  "username": "jane_d",
  "bio": "Mom of two.",
  "status": "expecting",
  "gender": "female",
  "dateOfBirth": "1990-05-15",
  "profilePictureUrl": "https://cdn.example.com/photo.jpg",
  "documentUrl": null
}
```

- `dateOfBirth`: `yyyy-MM-dd` or null.

**Response (200):** Same shape as GET /me (`success`, `user`).

**Errors:** 400 (e.g. invalid dateOfBirth or no valid fields), 401 (missing/invalid token).

---

### DELETE /me

Delete the user's account (hard delete from MongoDB).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Account deleted successfully."
}
```

**Errors:** 401 (missing/invalid token), 500 (database error).

---

## Interests (master list)

### GET /interests

No auth. Returns only **active** interests, sorted by name.

**Response (200):**

```json
{
  "success": true,
  "interests": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Sleep",
      "isActive": true,
      "createdAt": "2025-02-06T10:00:00.000Z",
      "updatedAt": "2025-02-06T10:00:00.000Z"
    }
  ],
  "data": [...]
}
```

---

### POST /interests (JWT required)

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "name": "Sleep"
}
```

**Response (201):**

```json
{
  "success": true,
  "interest": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Sleep",
    "isActive": true,
    "createdAt": "2025-02-06T10:00:00.000Z",
    "updatedAt": "2025-02-06T10:00:00.000Z"
  },
  "data": { ... }
}
```

**Errors:** 400 (name missing), 409 (duplicate name), 401 (missing/invalid token).

---

### PUT /interests/:id (JWT required)

**Request body:** `{ "name": "string?", "isActive": boolean? }`

**Response (200):** `{ "success": true, "interest": { ... }, "data": { ... } }`

**Errors:** 400 (invalid id), 404 (not found), 409 (duplicate name), 401 (missing/invalid token).

---

### DELETE /interests/:id (JWT required)

Soft delete: sets `isActive: false`.

**Response (200):** `{ "success": true, "message": "Interest deactivated.", "data": { ... } }`

**Errors:** 400 (invalid id), 404 (not found), 401 (missing/invalid token).

---

## User interests (JWT required)

### GET /me/interests

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "interests": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Sleep",
      "isActive": true,
      "createdAt": "2025-02-06T10:00:00.000Z",
      "updatedAt": "2025-02-06T10:00:00.000Z"
    }
  ],
  "data": [...]
}
```

---

### POST /me/interests

Replaces the user’s interests atomically. Validates that all IDs exist and are active.

**Request:**

```json
{
  "interestIds": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
}
```

**Response (200):** Same shape as GET /me/interests (`success`, `interests`, `data`).

**Errors:** 400 (invalid or inactive IDs), 401 (missing/invalid token).

---

## Security & validation

- **JWT required** for: `/me`, `/me/about`, `/me/interests`, `POST/PUT/DELETE /interests`, `/posts`, `/feed`.
- **Rate limit** on `POST /api/v1/auth/login`.
- **ObjectIds** validated for `:id` and `interestIds`.
- **Unique index** on `(provider, providerUserId)` for users.
- **Email/phone** normalized (trim, lowercase email) on login.

---

## Posts (JWT required)

### POST /posts

Create a new post (text, image, video, or poll).

**Content-Type:** `multipart/form-data` (for image/video) or `application/json` (for text/poll)

**Request (form-data for image/video):**

```
type: "image" (or "video")
content: "Check out this photo!" (optional)
interestIds: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
media: [file1.jpg, file2.jpg] (multipart files)
```

**Request (JSON for text):**

```json
{
  "type": "text",
  "content": "Hello world!",
  "interestIds": ["507f1f77bcf86cd799439012"]
}
```

**Request (JSON for poll):**

```json
{
  "type": "poll",
  "content": "What's your favorite?",
  "poll": {
    "question": "Best time for a walk?",
    "options": [
      { "text": "Morning" },
      { "text": "Evening" }
    ]
  },
  "interestIds": ["507f1f77bcf86cd799439012"]
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Post created successfully.",
  "post": {
    "_id": "507f1f77bcf86cd799439020",
    "userId": "507f1f77bcf86cd799439011",
    "type": "image",
    "content": "Check out this photo!",
    "media": [
      {
        "type": "image",
        "url": "https://yourcdn.b-cdn.net/posts/images/1234567890_abc123.jpg",
        "thumbnail": null
      }
    ],
    "poll": null,
    "interests": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
    "likesCount": 0,
    "commentsCount": 0,
    "createdAt": "2025-02-06T14:00:00.000Z"
  }
}
```

**Errors:**

- 400: Invalid type, missing interests, invalid file type
- 500: Bunny CDN not configured, upload failed

**Notes:**

- At least one valid interest ID is required.
- For image/video posts, Bunny CDN must be configured (env vars: `BUNNY_STORAGE_ZONE`, `BUNNY_ACCESS_KEY`, `BUNNY_CDN_URL`, optional `BUNNY_STORAGE_REGION`).
- Media files are uploaded to Bunny CDN; only URLs are stored in MongoDB.
- Max file size: 100MB per file, max 10 files.
- Feed fan-out happens asynchronously (background job).

---

### GET /posts/:id

Get a single post by ID.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "post": {
    "_id": "507f1f77bcf86cd799439020",
    "userId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Jane",
      "username": "jane_doe",
      "profilePictureUrl": "https://..."
    },
    "type": "image",
    "content": "Check out this photo!",
    "media": [
      {
        "type": "image",
        "url": "https://yourcdn.b-cdn.net/posts/images/1234567890_abc123.jpg",
        "thumbnail": null
      }
    ],
    "poll": null,
    "interests": [
      { "_id": "507f1f77bcf86cd799439012", "name": "Fitness" }
    ],
    "likesCount": 5,
    "commentsCount": 2,
    "createdAt": "2025-02-06T14:00:00.000Z",
    "updatedAt": "2025-02-06T14:00:00.000Z"
  }
}
```

**Errors:**

- 400: Invalid post ID
- 404: Post not found or inactive
- 401: Missing/invalid token

---

### DELETE /posts/:id

Soft delete a post (sets `isActive: false`). Only the post author can delete.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Post deleted successfully."
}
```

**Errors:**

- 400: Invalid post ID
- 403: Not authorized (not post author)
- 404: Post not found
- 401: Missing/invalid token

---

## Feed (JWT required)

### GET /feed

Get the user's personalized feed (interest-based, paginated, sorted by relevance score).

**Headers:** `Authorization: Bearer <token>`

**Query params:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)

**Example:** `GET /api/v1/feed?page=1&limit=20`

**Response (200):**

```json
{
  "success": true,
  "feed": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "userId": {
        "_id": "507f1f77bcf86cd799439015",
        "name": "John",
        "username": "john_doe",
        "profilePictureUrl": "https://..."
      },
      "type": "text",
      "content": "Hello world!",
      "media": [],
      "poll": null,
      "interests": [
        { "_id": "507f1f77bcf86cd799439012", "name": "Fitness" }
      ],
      "likesCount": 10,
      "commentsCount": 3,
      "createdAt": "2025-02-06T13:00:00.000Z",
      "feedScore": 250.5,
      "feedSource": "interest"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

**Errors:**

- 401: Missing/invalid token
- 500: Server error

**Notes:**

- Feed entries are precomputed using fan-out on write strategy.
- Sorted by `score` (descending), which considers recency, interest match, engagement, and future ranking factors.
- Empty feed (`[]`) is returned if no feed entries exist for the user.

---

## Architecture notes

### Feed system

- **Fan-out on write:** When a post is created, feed entries are inserted into the `UserFeed` collection for all users with matching interests.
- **Background processing:** Feed generation happens asynchronously (non-blocking) using `setImmediate()` in the current implementation. For production scale, use Bull/BullMQ with Redis.
- **Modular scoring:** `FeedService` calculates a relevance score for each post-user pair, allowing future addition of follower boost, location boost, engagement ranking, etc.
- **Indexes:** `posts.interests`, `posts.createdAt`, `userfeed.userId + score` for fast queries.

### Media storage

- All images and videos are uploaded to Bunny CDN.
- Only CDN URLs are stored in MongoDB (no media files in database).
- Bunny CDN env vars: `BUNNY_STORAGE_ZONE`, `BUNNY_ACCESS_KEY`, `BUNNY_CDN_URL`, optional `BUNNY_STORAGE_REGION` (e.g. `uk`, `ny`, `la`, `sg`, `de`).

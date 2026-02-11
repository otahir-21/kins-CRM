# Follow / Follower API

How the follow system works and how to use it from the mobile app.

## Base URL
```
Production: https://kins-crm.vercel.app/api/v1
```

## Authentication
All follow endpoints require JWT:
```
Authorization: Bearer <your-jwt-token>
```

---

## Flow: When Someone Clicks "Follow"

```
1. User A opens User B's profile
   → GET /api/v1/users/:userId/follow/status  (userId = B's id)
   → Response: { following: false, followerCount: 42, user: { ... } }

2. User A taps "Follow"
   → POST /api/v1/users/:userId/follow  (userId = B's id)
   → Response: { success: true, following: true, followerCount: 43 }

3. Backend:
   - Creates a Follow document: { followerId: A, followingId: B }
   - Increments B's followerCount by 1
   - Increments A's followingCount by 1

4. User A taps "Unfollow"
   → DELETE /api/v1/users/:userId/follow  (userId = B's id)
   → Response: { success: true, following: false, followerCount: 42 }

5. Backend:
   - Deletes the Follow document
   - Decrements B's followerCount by 1
   - Decrements A's followingCount by 1
```

---

## Endpoints

### 0. Get public profile (by user ID)

**GET** `/api/v1/users/:userId`

**Description:** Returns a user's public profile (name, username, avatar, bio, follower/following counts) and whether the current user follows them. Use this when opening someone's profile (e.g. from feed or search).

**Request:**
```bash
curl -X GET "https://kins-crm.vercel.app/api/v1/users/USER_B_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "user": {
    "id": "698c339a373d862481480468",
    "name": "Osama Tahir",
    "username": "otahir21",
    "profilePictureUrl": "https://...",
    "bio": "Working mom 👶",
    "followerCount": 150,
    "followingCount": 200,
    "isFollowedByMe": true
  }
}
```

---

### 1. Follow a user

**POST** `/api/v1/users/:userId/follow`

**Description:** Current user follows the user with id `:userId`.

**Rules:**
- Cannot follow yourself (400).
- If already following, returns success and current counts (idempotent).

**Request:**
```bash
curl -X POST "https://kins-crm.vercel.app/api/v1/users/USER_B_ID/follow" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Followed successfully.",
  "following": true,
  "followerCount": 43
}
```

**Errors:**
- `400` – Invalid user ID or "You cannot follow yourself."
- `404` – User not found.

---

### 2. Unfollow a user

**DELETE** `/api/v1/users/:userId/follow`

**Description:** Current user unfollows the user with id `:userId`.

**Request:**
```bash
curl -X DELETE "https://kins-crm.vercel.app/api/v1/users/USER_B_ID/follow" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Unfollowed successfully.",
  "following": false,
  "followerCount": 42
}
```

---

### 3. Get follow status (for profile screen)

**GET** `/api/v1/users/:userId/follow/status`

**Description:** Returns whether the current user follows `:userId`, plus that user’s public profile and counts. Use this when opening someone’s profile to show Follow/Unfollow and counts.

**Request:**
```bash
curl -X GET "https://kins-crm.vercel.app/api/v1/users/USER_B_ID/follow/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "following": true,
  "followerCount": 150,
  "followingCount": 200,
  "user": {
    "id": "698c339a373d862481480468",
    "name": "Osama Tahir",
    "username": "otahir21",
    "profilePictureUrl": "https://...",
    "bio": "Working mom 👶",
    "followerCount": 150,
    "followingCount": 200,
    "isFollowedByMe": true
  }
}
```

---

### 4. List followers (who follows this user)

**GET** `/api/v1/users/:userId/followers?page=1&limit=20`

**Description:** Paginated list of users who follow `:userId`. Each item includes `isFollowedByMe` so you can show Follow/Unfollow on each row.

**Request:**
```bash
curl -X GET "https://kins-crm.vercel.app/api/v1/users/USER_B_ID/followers?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "followers": [
    {
      "id": "698c3d182c8049e73b50b4d8",
      "name": "Test User",
      "username": "testuser",
      "profilePictureUrl": null,
      "bio": "My bio",
      "followerCount": 10,
      "followingCount": 20,
      "isFollowedByMe": false
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

---

### 5. List following (who this user follows)

**GET** `/api/v1/users/:userId/following?page=1&limit=20`

**Description:** Paginated list of users that `:userId` follows. Each item includes `isFollowedByMe`.

**Request:**
```bash
curl -X GET "https://kins-crm.vercel.app/api/v1/users/USER_B_ID/following?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "following": [
    {
      "id": "698c339a373d862481480468",
      "name": "Osama Tahir",
      "username": "otahir21",
      "profilePictureUrl": null,
      "bio": null,
      "followerCount": 5,
      "followingCount": 10,
      "isFollowedByMe": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 200,
    "hasMore": true
  }
}
```

---

## Mobile integration

### Open another user’s profile

1. You have `userId` from feed (e.g. `post.userId.id`) or search.
2. Call `GET /api/v1/users/:userId/follow/status`.
3. Show name, username, avatar, bio, followerCount, followingCount.
4. Show button:
   - If `following === true` → "Unfollow" → `DELETE /users/:userId/follow`
   - If `following === false` → "Follow" → `POST /users/:userId/follow`

### Example (React Native)

```javascript
// Load profile and follow status
const loadUserProfile = async (userId) => {
  const token = await AsyncStorage.getItem('authToken');
  const res = await fetch(
    `https://kins-crm.vercel.app/api/v1/users/${userId}/follow/status`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (data.success) {
    setUser(data.user);
    setIsFollowing(data.following);
    setFollowerCount(data.followerCount);
  }
};

// Follow
const follow = async (userId) => {
  const token = await AsyncStorage.getItem('authToken');
  const res = await fetch(
    `https://kins-crm.vercel.app/api/v1/users/${userId}/follow`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = await res.json();
  if (data.success) {
    setIsFollowing(true);
    setFollowerCount(data.followerCount);
  }
};

// Unfollow
const unfollow = async (userId) => {
  const token = await AsyncStorage.getItem('authToken');
  const res = await fetch(
    `https://kins-crm.vercel.app/api/v1/users/${userId}/follow`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = await res.json();
  if (data.success) {
    setIsFollowing(false);
    setFollowerCount(data.followerCount);
  }
};
```

---

## Data model

### Follow collection

| Field        | Type     | Description                          |
|-------------|----------|--------------------------------------|
| followerId  | ObjectId | User who clicks "Follow" (follower)  |
| followingId | ObjectId | User who is followed                |
| createdAt   | Date     | When the follow was created        |

- Unique index on `(followerId, followingId)` so a user can only follow another once.

### User counts (updated by API)

- `followerCount`: number of users who follow this user (incremented/decremented on follow/unfollow).
- `followingCount`: number of users this user follows (incremented/decremented on follow/unfollow).

---

## Feed and followers

When a user creates a post, the backend adds that post to the feed of (1) users with matching interests (source: `interest`) and (2) users who follow the post author (source: `follower`). So **posts from people you follow appear in your feed** and rank higher. The feed API returns `feedSource` on each item (`"interest"` or `"follower"`).

---

## Summary

| Action              | Endpoint                              | Method  |
|---------------------|----------------------------------------|---------|
| Get public profile  | `/api/v1/users/:userId`               | GET     |
| Follow user         | `/api/v1/users/:userId/follow`         | POST    |
| Unfollow user       | `/api/v1/users/:userId/follow`         | DELETE  |
| Get follow status   | `/api/v1/users/:userId/follow/status` | GET     |
| List followers      | `/api/v1/users/:userId/followers`     | GET     |
| List following      | `/api/v1/users/:userId/following`     | GET     |

When someone taps "Follow", call `POST /users/:userId/follow`. The backend creates the follow relationship and updates both users’ counts. Use `GET /users/:userId` or `GET /users/:userId/follow/status` on the profile screen. New posts from people you follow appear in your feed with feedSource: "follower".

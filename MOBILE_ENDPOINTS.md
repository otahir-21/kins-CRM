# Cursor Mobile App - API Endpoints

**Production Base URL:** `https://kins-crm.vercel.app/api/v1`

---

## 🔐 Authentication

### Login/Register
```
POST https://kins-crm.vercel.app/api/v1/auth/login
```

**Body:**
```json
{
  "provider": "phone" | "google" | "apple",
  "providerUserId": "string",
  "phoneNumber": "string?",
  "email": "string?",
  "name": "string?",
  "profilePictureUrl": "string?"
}
```

**Returns:** JWT token + user object

---

## 👤 User Profile

### Get My Profile
```
GET https://kins-crm.vercel.app/api/v1/me
```

### Update Profile (About You)
```
PUT https://kins-crm.vercel.app/api/v1/me/about
```

**Body:**
```json
{
  "name": "string?",
  "username": "string?",
  "bio": "string?",
  "status": "string?",
  "gender": "string?",
  "dateOfBirth": "yyyy-MM-dd",
  "profilePictureUrl": "string?",
  "documentUrl": "string?"
}
```

### Delete Account
```
DELETE https://kins-crm.vercel.app/api/v1/me
```

---

## ⭐ Interests

### Get Master Interest List (Public)
```
GET https://kins-crm.vercel.app/api/v1/interests
```

### Get My Interests
```
GET https://kins-crm.vercel.app/api/v1/me/interests
```

### Set My Interests
```
POST https://kins-crm.vercel.app/api/v1/me/interests
```

**Body:**
```json
{
  "interestIds": ["interestId1", "interestId2", "interestId3"]
}
```

---

## 📝 Posts (NEW)

### Create Post
```
POST https://kins-crm.vercel.app/api/v1/posts
```

**For Text Post (JSON):**
```json
{
  "type": "text",
  "content": "Your post content here",
  "interestIds": ["interestId1", "interestId2"]
}
```

**For Image/Video Post (multipart/form-data):**
```
Content-Type: multipart/form-data

type: "image" or "video"
content: "Optional caption"
interestIds: ["interestId1", "interestId2"]
media: [file1, file2] (multipart files)
```

**For Poll Post (JSON):**
```json
{
  "type": "poll",
  "content": "Optional description",
  "poll": {
    "question": "Your poll question?",
    "options": [
      {"text": "Option 1"},
      {"text": "Option 2"},
      {"text": "Option 3"}
    ]
  },
  "interestIds": ["interestId1", "interestId2"]
}
```

### Get Single Post
```
GET https://kins-crm.vercel.app/api/v1/posts/{postId}
```

### Delete Post
```
DELETE https://kins-crm.vercel.app/api/v1/posts/{postId}
```
*(Only post author can delete)*

---

## 📱 Feed (NEW)

### Get Personalized Feed
```
GET https://kins-crm.vercel.app/api/v1/feed?page=1&limit=20
```

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)

**Example:**
```
https://kins-crm.vercel.app/api/v1/feed?page=1&limit=20
https://kins-crm.vercel.app/api/v1/feed?page=2&limit=10
```

**Returns:**
```json
{
  "success": true,
  "feed": [
    {
      "_id": "postId",
      "userId": {
        "_id": "userId",
        "name": "User Name",
        "username": "username",
        "profilePictureUrl": "url"
      },
      "type": "text",
      "content": "Post content",
      "media": [],
      "poll": null,
      "interests": [
        {"_id": "interestId", "name": "Interest Name"}
      ],
      "likesCount": 0,
      "commentsCount": 0,
      "createdAt": "2026-02-11T08:26:21.674Z",
      "feedScore": 149.99,
      "feedSource": "interest"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "hasMore": true
  }
}
```

---

## 🔑 Authentication Header

All protected endpoints require:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

The JWT token is returned from the login endpoint in the `token` field.

---

## 📋 Complete Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **Authentication** |
| POST | `/auth/login` | ❌ | Login/register user |
| **Profile** |
| GET | `/me` | ✅ | Get my profile |
| PUT | `/me/about` | ✅ | Update profile |
| DELETE | `/me` | ✅ | Delete account |
| **Interests** |
| GET | `/interests` | ❌ | Get all interests |
| GET | `/me/interests` | ✅ | Get my interests |
| POST | `/me/interests` | ✅ | Set my interests |
| **Posts** |
| POST | `/posts` | ✅ | Create post |
| GET | `/posts/:id` | ✅ | Get single post |
| DELETE | `/posts/:id` | ✅ | Delete post |
| **Feed** |
| GET | `/feed` | ✅ | Get personalized feed |

---

## 📱 Mobile App Integration Steps

### 1. Initial Setup
```dart
final String baseUrl = 'https://kins-crm.vercel.app/api/v1';
```

### 2. Login Flow
```
1. User authenticates via Phone/Google/Apple on frontend
2. Send verified payload to POST /auth/login
3. Receive JWT token
4. Store token securely (keychain/keystore)
5. Include in all subsequent requests
```

### 3. Onboarding Flow
```
1. POST /auth/login → Get JWT
2. PUT /me/about → Set profile info
3. GET /interests → Show interest list
4. POST /me/interests → Save selected interests
```

### 4. Home Feed Flow
```
1. GET /feed?page=1&limit=20 → Load initial feed
2. Show posts with user info, content, media
3. Implement infinite scroll (page=2, page=3...)
4. Check pagination.hasMore for more posts
```

### 5. Create Post Flow
```
1. User selects post type (text/image/video/poll)
2. User selects interests (required)
3. POST /posts with appropriate payload
4. If media: Use multipart/form-data
5. Success: Show in user's profile or redirect
```

### 6. View Single Post
```
1. GET /posts/:id → Show full post details
2. Display with user profile, comments, likes
```

---

## 🎨 Post Types Reference

### Text Post
- Simple text content
- No media required
- Must have at least 1 interest

### Image Post
- Upload image files
- CDN URLs stored in database
- Supports multiple images
- Optional caption

### Video Post
- Upload video files
- CDN URLs stored in database
- Thumbnail auto-generated (future)
- Optional caption

### Poll Post
- Question + 2+ options
- Track votes and voted users
- Optional description
- Real-time vote counts

---

## 🚀 Performance Tips

1. **Feed Pagination:**
   - Start with `limit=20` for good UX
   - Increase to `limit=50` for faster scrolling
   - Max limit is 100

2. **Image/Video Upload:**
   - Compress before upload
   - Show upload progress
   - Handle upload failures gracefully

3. **Token Management:**
   - Store JWT securely
   - Refresh before expiry (7 days)
   - Handle 401 errors → redirect to login

4. **Caching:**
   - Cache feed data locally
   - Invalidate on pull-to-refresh
   - Cache user profiles

---

## ⚠️ Error Handling

Common error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not authorized for action)
- `404` - Not found
- `500` - Server error

---

## 📞 Support

For issues or questions:
- Check `API_V1.md` for detailed API documentation
- Check `FEED_SYSTEM.md` for architecture details
- Check `FEED_TEST_RESULTS.md` for test examples

---

**Last Updated:** February 11, 2026  
**API Version:** v1  
**Base URL:** `https://kins-crm.vercel.app/api/v1`

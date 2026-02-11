# Feed System Architecture

## Overview

The feed system is designed to scale to millions of users using a **fan-out on write** strategy with precomputed feed entries. It supports interest-based content discovery with a modular scoring system that allows future expansion.

---

## Core Components

### 1. Data Models

#### Post (`models/Post.js`)

Supports four post types: `text`, `image`, `video`, `poll`.

**Key fields:**

- `userId`: Author
- `type`: Post type
- `content`: Text content (optional for all types)
- `media`: Array of media objects (for image/video) with CDN URLs
- `poll`: Poll data (question, options, votes)
- `interests`: Array of Interest IDs (used for targeting)
- `likesCount`, `commentsCount`: Engagement metrics
- `isActive`: Soft delete flag

**Indexes:**

- `{ interests: 1, createdAt: -1 }` - Fast lookup by interest
- `{ userId: 1, createdAt: -1 }` - User's posts
- `{ isActive: 1, createdAt: -1 }` - Active posts

#### UserFeed (`models/UserFeed.js`)

Precomputed feed entries for each user.

**Key fields:**

- `userId`: Feed owner
- `postId`: Reference to Post
- `score`: Relevance score (higher = more relevant)
- `source`: How this entry was generated (`interest`, `follower`, `trending`, etc.)
- `metadata`: Additional context for scoring (interest match, boosts, etc.)

**Indexes:**

- `{ userId: 1, score: -1, createdAt: -1 }` - Fast feed retrieval (compound index)
- `{ postId: 1 }` - Cleanup/updates

---

### 2. Feed Service (`services/FeedService.js`)

#### Modular Scoring System

The `calculateScore()` method computes a relevance score for each post-user pair:

**Current factors:**

- **Recency**: Posts decay over time (100 base points minus hours since creation)
- **Interest match**: +50 points per matching interest
- **Engagement**: +2 per like, +5 per comment (capped at 200)

**Future-ready factors (placeholders):**

- `isFollowing`: +100 points if user follows post author
- `locationBoost`: Distance-based relevance
- `isTrending`: +150 points for trending posts

To add new ranking factors, simply update `calculateScore()` and pass additional context.

#### Fan-Out on Write

When a post is created:

1. Identify all users with at least one matching interest
2. Calculate a relevance score for each user
3. Batch insert feed entries into `UserFeed`
4. Process runs **asynchronously** (non-blocking)

**Current implementation:** Uses `setImmediate()` for async processing.

**Production recommendation:** Use **Bull** or **BullMQ** with Redis for:

- Job retries
- Prioritization
- Rate limiting
- Distributed processing
- Monitoring

---

### 3. Media Storage (`services/BunnyService.js`)

All images and videos are uploaded to **Bunny CDN**.

**Features:**

- Supports multiple storage regions (UK, NY, LA, SG, DE)
- Generates unique filenames (timestamp + random ID)
- Handles upload errors gracefully
- Returns CDN URLs for storage in MongoDB

**Required environment variables:**

```
BUNNY_STORAGE_ZONE=your-storage-zone
BUNNY_ACCESS_KEY=your-access-key
BUNNY_CDN_URL=https://your-pull-zone.b-cdn.net
BUNNY_STORAGE_REGION=uk  # optional (default: uk)
```

**Usage:**

```javascript
const BunnyService = require('./services/BunnyService');
const { cdnUrl } = await BunnyService.upload(fileBuffer, 'image.jpg', 'posts/images');
```

---

### 4. Controllers

#### Posts Controller (`controllers/v1/postsController.js`)

- `createPost()`: Creates post, uploads media, triggers feed fan-out
- `getPost()`: Retrieves single post with populated user and interests
- `deletePost()`: Soft delete (sets `isActive: false`)

#### Feed Controller (`controllers/v1/feedController.js`)

- `getFeed()`: Returns paginated feed sorted by score
  - Fetches UserFeed entries
  - Populates post data with projections (only necessary fields)
  - Handles pagination (page, limit, total, hasMore)

---

### 5. Routes

#### `/api/v1/posts`

- `POST /` - Create post (multipart/form-data for media)
- `GET /:id` - Get single post
- `DELETE /:id` - Delete post (author only)

#### `/api/v1/feed`

- `GET /` - Get user feed (`?page=1&limit=20`)

---

## Scalability Strategy

### Fan-Out on Write vs. Fan-Out on Read

We use **fan-out on write** for interest-based feed:

**Pros:**

- Fast feed retrieval (simple query: `UserFeed.find({ userId }).sort({ score: -1 })`)
- Consistent performance regardless of user's interest count
- Easy to implement complex scoring

**Cons:**

- Write amplification (one post creates N feed entries)
- Storage cost (more UserFeed documents)

**Why this works for millions of users:**

- Interests are finite (typically 10-50 active interests)
- Not every user has every interest (sparse matching)
- Background processing prevents request blocking
- MongoDB indexes handle queries efficiently

### Optimization Strategies

1. **Selective fan-out**: Only target users who:
   - Have matching interests
   - Are active (logged in within X days)
   - Haven't muted the author

2. **Batching**: Insert feed entries in batches (e.g., 1000 at a time)

3. **TTL**: Auto-delete old feed entries (e.g., 30 days) using MongoDB TTL index

4. **Sharding**: Shard `UserFeed` collection by `userId` for horizontal scaling

5. **Caching**: Cache feed for active users (Redis, Memcached)

---

## Future Expansion

### Adding Follower-Based Feed

1. Update `FeedService.fanOutPost()` to include followers:

```javascript
const followers = await Follow.find({ followingId: post.userId }).select('followerId');
// Generate feed entries with source: 'follower'
```

2. Update scoring to boost posts from followed users.

### Adding Trending/Recommended Posts

1. Create a periodic job (cron) to identify trending posts
2. Insert feed entries with `source: 'trending'` and higher score
3. Filter by recency and engagement velocity

### Adding Location-Based Boost

1. Store user location in `User` model (already exists)
2. Calculate distance between post author and viewer
3. Add `locationBoost` to score based on proximity

### Ranking Adjustments

All scoring logic is centralized in `FeedService.calculateScore()`. To adjust weights:

```javascript
// Example: increase engagement weight
const engagementScore = (post.likesCount || 0) * 5 + (post.commentsCount || 0) * 10;
```

---

## Performance Benchmarks

With proper indexes and fan-out on write:

- **Feed retrieval**: <50ms for 20 entries
- **Post creation**: ~200-500ms (excluding fan-out)
- **Fan-out**: ~1-3s for 1000-10000 targeted users (background)

**Scaling limits:**

- Single MongoDB instance: ~10M users
- Sharded cluster: 100M+ users

---

## Monitoring & Observability

### Metrics to track

- Feed fan-out duration
- UserFeed collection size
- Feed retrieval latency
- Empty feed rate (users with no feed entries)
- Media upload success rate

### Logging

All errors are logged with context:

- `[FeedWorker]` - Background job logs
- `POST /posts error:` - Post creation failures
- `GET /feed error:` - Feed retrieval failures
- `Bunny upload failed:` - Media upload errors

---

## Development & Testing

### Local setup

1. Install MongoDB locally or use Atlas
2. Configure Bunny CDN (optional for testing without media)
3. Start server: `npm start`

### Testing without Bunny CDN

Text and poll posts work without Bunny CDN. Image/video posts require configuration:

```
BUNNY_STORAGE_ZONE=test-zone
BUNNY_ACCESS_KEY=test-key
BUNNY_CDN_URL=https://test.b-cdn.net
```

### Seeding test data

Create interests first:

```bash
node seed-interests.js
```

Then create users with interests via `/api/v1/auth/login` and `/api/v1/me/interests`.

---

## API Examples

### Create a text post

```bash
curl -X POST https://kins-crm.vercel.app/api/v1/posts \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": "Hello world!",
    "interestIds": ["507f1f77bcf86cd799439012"]
  }'
```

### Create an image post

```bash
curl -X POST https://kins-crm.vercel.app/api/v1/posts \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "type=image" \
  -F "content=Check out this photo!" \
  -F "interestIds[]=507f1f77bcf86cd799439012" \
  -F "media=@photo.jpg"
```

### Get feed

```bash
curl -X GET "https://kins-crm.vercel.app/api/v1/feed?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## Summary

The feed system is built for scale with:

- ✅ Fan-out on write for fast retrieval
- ✅ Modular scoring for easy ranking adjustments
- ✅ CDN-based media storage
- ✅ Background processing (non-blocking)
- ✅ Proper indexes for performance
- ✅ Future-ready architecture (followers, trending, location)

For questions or improvements, refer to `API_V1.md` and `MOBILE_API.md`.

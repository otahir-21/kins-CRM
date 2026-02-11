# Feed Personalization Guide

## How the Feed System Works

The KINS CRM feed is **automatically personalized** for each user based on their interests. No two users will see exactly the same feed unless they have identical interests.

## Interest-Based Personalization

### Example Scenario:

#### Users and Their Interests:

- **User A (Alice)**: Interests = ["technologies", "design"]
- **User B (Bob)**: Interests = ["sports", "fitness"]
- **User C (Charlie)**: Interests = ["technologies", "sports"]

#### Posts Created:

1. **Post 1**: "New iPhone released!" - Interests = ["technologies"]
2. **Post 2**: "Best gym workouts" - Interests = ["fitness", "sports"]
3. **Post 3**: "UI Design trends 2026" - Interests = ["design"]
4. **Post 4**: "AI and Machine Learning" - Interests = ["technologies"]

### What Each User Sees in Their Feed:

```
┌─────────────────────────────────────────────────────────┐
│ User A (Alice) - Feed                                    │
│ Interests: ["technologies", "design"]                   │
├─────────────────────────────────────────────────────────┤
│ ✅ Post 1: "New iPhone released!" (technologies)        │
│ ✅ Post 3: "UI Design trends 2026" (design)             │
│ ✅ Post 4: "AI and Machine Learning" (technologies)     │
│ ❌ Post 2: NOT SHOWN (no matching interests)            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ User B (Bob) - Feed                                      │
│ Interests: ["sports", "fitness"]                        │
├─────────────────────────────────────────────────────────┤
│ ✅ Post 2: "Best gym workouts" (fitness, sports)        │
│ ❌ Post 1: NOT SHOWN (no matching interests)            │
│ ❌ Post 3: NOT SHOWN (no matching interests)            │
│ ❌ Post 4: NOT SHOWN (no matching interests)            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ User C (Charlie) - Feed                                  │
│ Interests: ["technologies", "sports"]                   │
├─────────────────────────────────────────────────────────┤
│ ✅ Post 1: "New iPhone released!" (technologies)        │
│ ✅ Post 2: "Best gym workouts" (sports)                 │
│ ✅ Post 4: "AI and Machine Learning" (technologies)     │
│ ❌ Post 3: NOT SHOWN (no matching interests)            │
└─────────────────────────────────────────────────────────┘
```

## Key Rules:

### 1. Interest Matching
- Users **ONLY** see posts that have at least one matching interest
- If a post has interests `["A", "B"]` and a user has interests `["B", "C"]`, they will see it (match on "B")

### 2. Author Exclusion
- Users **NEVER** see their own posts in their feed
- To see your own posts, use `GET /api/v1/posts/my`

### 3. Feed Scoring
Posts are ranked by a score that considers:
- **Recency**: Newer posts score higher (100 - hours_old)
- **Interest match**: +50 per matching interest
- **Engagement**: Likes (+2 each) and comments (+5 each)
- **Future**: Follower boost, location, trending, etc.

### 4. Automatic Distribution (Fan-Out on Write)
When a post is created:
```javascript
// 1. Post created with interests: ["technologies", "design"]
createPost({ content: "...", interests: ["technologies", "design"] })

// 2. System automatically finds matching users
// Finds all users where: user.interests contains "technologies" OR "design"

// 3. Creates feed entry for each matching user
UserFeed.create([
  { userId: "user1", postId: "post1", score: 150, source: "interest" },
  { userId: "user2", postId: "post1", score: 145, source: "interest" },
  { userId: "user3", postId: "post1", score: 152, source: "interest" },
  // ... for each matching user
])

// 4. Each user gets personalized feed when they call GET /api/v1/feed
```

## Benefits of This Approach:

### ✅ Advantages:
1. **Fast Read Performance**: Feed is pre-computed, retrieval is instant
2. **Personalized Experience**: Each user sees relevant content
3. **Scalable**: Works for millions of users
4. **Extensible**: Easy to add ranking factors (followers, location, etc.)

### 📊 Example with Numbers:

If you have:
- **1 million users**
- **User creates a post with interest "sports"**
- **200,000 users have "sports" in their interests**

What happens:
```
1. Post is saved to database (1 write)
2. System finds 200,000 matching users
3. Creates 200,000 feed entries in background (async, doesn't block)
4. When each of those 200,000 users opens the app, they instantly see the post
5. The other 800,000 users never see it (no matching interests)
```

## Testing Personalization:

### Create Test Users with Different Interests:

```bash
# User 1: Technologies
curl -X POST https://kins-crm.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"provider":"phone","providerUserId":"+1111111111","name":"Tech User"}'

curl -X PUT https://kins-crm.vercel.app/api/v1/me/interests \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"interestIds": ["<technologies-interest-id>"]}'

# User 2: Sports
curl -X POST https://kins-crm.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"provider":"phone","providerUserId":"+2222222222","name":"Sports User"}'

curl -X PUT https://kins-crm.vercel.app/api/v1/me/interests \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"interestIds": ["<sports-interest-id>"]}'

# Create posts with different interests
# Tech post - only User 1 will see it
# Sports post - only User 2 will see it
```

### Verify Different Feeds:

```bash
# Get User 1's feed (will see tech posts)
curl -X GET https://kins-crm.vercel.app/api/v1/feed \
  -H "Authorization: Bearer $USER1_TOKEN"

# Get User 2's feed (will see sports posts)
curl -X GET https://kins-crm.vercel.app/api/v1/feed \
  -H "Authorization: Bearer $USER2_TOKEN"
```

They will see COMPLETELY DIFFERENT posts!

## Future Enhancements:

The system is designed to support:

1. **Follower-based feed**: See posts from people you follow
2. **Location-based feed**: See posts from nearby users
3. **Trending posts**: Popular posts get boosted
4. **Engagement-based ranking**: Posts with more likes/comments appear higher
5. **Time-decay**: Older posts gradually disappear from feed
6. **Diversity**: Mix of content types (text, image, video, polls)

## Technical Implementation:

### Collections:
- **Users**: Store user interests
- **Posts**: Store post interests
- **UserFeed**: Pre-computed feed entries (userId → postId mapping with score)

### Fan-Out Logic:
See `/services/FeedService.js` - `fanOutPost()` method

### Feed Retrieval:
See `/controllers/v1/feedController.js` - `getFeed()` method

## Summary:

🎯 **Every user sees a DIFFERENT, personalized feed based on their interests!**

The feed is NOT the same for everyone. It's automatically personalized when posts are created, ensuring:
- Relevant content for each user
- Fast feed loading
- Scalable to millions of users

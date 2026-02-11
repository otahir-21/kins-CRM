# Polls API - Quick Reference

**Base URL:** `https://kins-crm.vercel.app/api/v1`

All endpoints require: `Authorization: Bearer YOUR_JWT_TOKEN`

---

## 📊 POLL ENDPOINTS

### Create a Poll Post
```
POST /posts
```
**Body:**
```json
{
  "type": "poll",
  "content": "Optional description",
  "poll": {
    "question": "What's your favorite programming language?",
    "options": [
      { "text": "JavaScript" },
      { "text": "Python" },
      { "text": "Go" },
      { "text": "Rust" }
    ]
  },
  "interestIds": ["interestId1", "interestId2"]
}
```

**Requirements:**
- `type` must be `"poll"`
- `poll.question` is required
- `poll.options` must have at least 2 options
- Each option must have `text` field
- `interestIds` array is required (at least 1 interest)

**Response:**
```json
{
  "success": true,
  "message": "Post created successfully.",
  "post": {
    "_id": "pollPostId",
    "userId": "userId",
    "type": "poll",
    "content": "Optional description",
    "poll": {
      "question": "What's your favorite programming language?",
      "options": [
        { "text": "JavaScript", "votes": 0 },
        { "text": "Python", "votes": 0 },
        { "text": "Go", "votes": 0 },
        { "text": "Rust", "votes": 0 }
      ],
      "totalVotes": 0,
      "votedUsers": []
    },
    "interests": ["interestId1", "interestId2"],
    "likesCount": 0,
    "commentsCount": 0,
    "sharesCount": 0,
    "viewsCount": 0,
    "createdAt": "2026-02-11T08:26:21.674Z"
  }
}
```

---

### Vote on a Poll
```
POST /posts/:postId/vote
```
**Body:**
```json
{
  "optionIndex": 0
}
```

**Parameters:**
- `optionIndex` - Zero-based index of the option (0 = first option, 1 = second, etc.)

**Response:**
```json
{
  "success": true,
  "message": "Vote recorded successfully.",
  "poll": {
    "question": "What's your favorite programming language?",
    "options": [
      {
        "index": 0,
        "text": "JavaScript",
        "votes": 15,
        "percentage": "42.9"
      },
      {
        "index": 1,
        "text": "Python",
        "votes": 12,
        "percentage": "34.3"
      },
      {
        "index": 2,
        "text": "Go",
        "votes": 5,
        "percentage": "14.3"
      },
      {
        "index": 3,
        "text": "Rust",
        "votes": 3,
        "percentage": "8.6"
      }
    ],
    "totalVotes": 35,
    "userVoted": true,
    "userVotedOption": 0
  }
}
```

**Errors:**
- `400` - Already voted
- `400` - Invalid option index
- `400` - Post is not a poll
- `404` - Post not found

---

### Get Poll Results
```
GET /posts/:postId/poll
```

**Response:**
```json
{
  "success": true,
  "poll": {
    "question": "What's your favorite programming language?",
    "options": [
      {
        "index": 0,
        "text": "JavaScript",
        "votes": 15,
        "percentage": "42.9"
      },
      {
        "index": 1,
        "text": "Python",
        "votes": 12,
        "percentage": "34.3"
      },
      {
        "index": 2,
        "text": "Go",
        "votes": 5,
        "percentage": "14.3"
      },
      {
        "index": 3,
        "text": "Rust",
        "votes": 3,
        "percentage": "8.6"
      }
    ],
    "totalVotes": 35,
    "userVoted": true,
    "userVotedOption": -1
  }
}
```

**Note:** `userVotedOption: -1` means the user voted but we don't track which specific option (limitation of current implementation - see below).

---

### Remove Vote (Change Vote)
```
DELETE /posts/:postId/vote
```

Allows user to remove their vote so they can vote again.

**Response:**
```json
{
  "success": true,
  "message": "Vote removed successfully. You can now vote again."
}
```

**Note:** Due to current schema limitations, this only decrements the total vote count. To change a vote, user must:
1. `DELETE /posts/:postId/vote` (remove current vote)
2. `POST /posts/:postId/vote` (cast new vote)

---

## 📱 Mobile App Integration

### Display Poll in Feed

When fetching feed/posts, polls have this structure:

```json
{
  "_id": "postId",
  "type": "poll",
  "content": "Optional description",
  "poll": {
    "question": "What's your favorite programming language?",
    "options": [
      { "text": "JavaScript", "votes": 15 },
      { "text": "Python", "votes": 12 },
      { "text": "Go", "votes": 5 },
      { "text": "Rust", "votes": 3 }
    ],
    "totalVotes": 35,
    "votedUsers": ["userId1", "userId2", ...]
  }
}
```

### Poll UI Flow

1. **Check if user voted:**
   ```dart
   bool hasVoted = post.poll.votedUsers.contains(currentUserId);
   ```

2. **Display poll options:**
   - If `!hasVoted`: Show as clickable buttons
   - If `hasVoted`: Show with percentages and bars

3. **Vote on option:**
   ```dart
   await api.voteOnPoll(postId, optionIndex);
   // Update local state with response
   ```

4. **Show results:**
   ```dart
   // After voting or if already voted
   for (var option in poll.options) {
     double percentage = (option.votes / poll.totalVotes) * 100;
     // Show progress bar with percentage
   }
   ```

### Example UI (Flutter/React Native)

```dart
// Pseudo-code
if (!hasVoted) {
  // Show voting buttons
  Column(
    children: poll.options.map((option, index) =>
      ElevatedButton(
        onPressed: () => voteOnPoll(postId, index),
        child: Text(option.text),
      )
    ).toList(),
  );
} else {
  // Show results
  Column(
    children: poll.options.map((option, index) {
      double percentage = (option.votes / poll.totalVotes) * 100;
      return Column(
        children: [
          Text('${option.text} - ${percentage.toStringAsFixed(1)}%'),
          LinearProgressIndicator(value: percentage / 100),
          Text('${option.votes} votes'),
        ],
      );
    }).toList(),
  );
}
```

---

## ⚠️ Current Limitations

### Vote Tracking

**Issue:** The current schema tracks `votedUsers` array but not which option each user voted for.

**Impact:**
- Users can only vote once ✅
- We can check if a user voted ✅
- We cannot show which option the user selected ❌
- Changing votes requires remove + re-vote ❌

**Future Improvement:**

Create a separate `PollVote` model:

```javascript
{
  userId: ObjectId,
  postId: ObjectId,
  optionIndex: Number,
  createdAt: Date
}
```

This would allow:
- Showing which option user voted for
- Direct vote changes (update instead of delete+create)
- Vote history analytics
- "Who voted for what" feature

---

## 🚀 Future Enhancements

### 1. Multiple Choice Polls
Allow users to select multiple options:
```json
{
  "poll": {
    "question": "Which languages do you use?",
    "allowMultiple": true,
    "maxChoices": 3,
    "options": [...]
  }
}
```

### 2. Poll Expiration
```json
{
  "poll": {
    "question": "...",
    "expiresAt": "2026-02-15T00:00:00.000Z",
    "options": [...]
  }
}
```

### 3. Anonymous Polls
Hide who voted:
```json
{
  "poll": {
    "question": "...",
    "isAnonymous": true,
    "options": [...]
  }
}
```

### 4. Poll Analytics
- Who voted breakdown (demographics)
- Time-series voting data
- Geographic distribution

---

## 📊 Complete Endpoint List

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/posts` | Create poll post |
| POST | `/posts/:postId/vote` | Vote on poll |
| GET | `/posts/:postId/poll` | Get poll results |
| DELETE | `/posts/:postId/vote` | Remove vote |

---

## 🎯 Example Requests

### Create Poll
```bash
curl -X POST https://kins-crm.vercel.app/api/v1/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "poll",
    "content": "Quick poll!",
    "poll": {
      "question": "Best time to exercise?",
      "options": [
        {"text": "Morning"},
        {"text": "Afternoon"},
        {"text": "Evening"}
      ]
    },
    "interestIds": ["interestId1"]
  }'
```

### Vote on Poll
```bash
curl -X POST https://kins-crm.vercel.app/api/v1/posts/POLL_POST_ID/vote \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"optionIndex": 0}'
```

### Get Poll Results
```bash
curl -X GET https://kins-crm.vercel.app/api/v1/posts/POLL_POST_ID/poll \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Remove Vote
```bash
curl -X DELETE https://kins-crm.vercel.app/api/v1/posts/POLL_POST_ID/vote \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

**Last Updated:** February 11, 2026  
**Status:** Production Ready ✅  
**Scalability:** Designed for millions of users 🚀

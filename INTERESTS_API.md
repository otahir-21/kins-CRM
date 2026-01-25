# Interests API Documentation

Complete CRUD operations for managing interests and user interest selections.

## 📋 Overview

The Interests API allows you to:
- **Manage Interests**: Create, read, update, and delete interests (admin only)
- **User Interests**: Manage which interests users have selected (max 10 per user)

## 🗂️ Firebase Structure

### Interests Collection
```
/interests/{interestId}
{
  "id": "string",
  "name": "string",              // Interest name (e.g., "Technology", "Sports")
  "isActive": "boolean",         // Active status (true/false)
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### User Document (Updated)
```
/users/{userId}
{
  "name": "string",
  "gender": "string",
  "phoneNumber": "string",
  "documentUrl": "string",
  "interests": ["string"],       // Array of interest IDs (max 10)
  "updatedAt": "timestamp"
}
```

## 🔧 Interests CRUD Endpoints

### 1. Create Interest
**POST** `/api/interests`

**Request Body:**
```json
{
  "name": "Technology"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "name": "Technology",
    "isActive": true,
    "createdAt": "2026-01-23T10:00:00Z",
    "updatedAt": "2026-01-23T10:00:00Z"
  }
}
```

### 2. Get All Interests
**GET** `/api/interests`

**Query Parameters:**
- `isActive` (optional): Filter by active status (`true`/`false`)
- `limit` (optional): Limit number of results

**Examples:**
- `/api/interests` - Get all interests
- `/api/interests?isActive=true` - Get only active interests
- `/api/interests?isActive=true&limit=10` - Get 10 active interests

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "abc123",
      "name": "Technology",
      "isActive": true,
      "createdAt": "2026-01-23T10:00:00Z",
      "updatedAt": "2026-01-23T10:00:00Z"
    }
  ]
}
```

### 3. Get Interest by ID
**GET** `/api/interests/:interestId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "name": "Technology",
    "isActive": true,
    "createdAt": "2026-01-23T10:00:00Z",
    "updatedAt": "2026-01-23T10:00:00Z"
  }
}
```

### 4. Update Interest
**PUT** `/api/interests/:interestId`

**Request Body:**
```json
{
  "name": "Tech & Innovation",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "name": "Tech & Innovation",
    "isActive": true,
    "updatedAt": "2026-01-23T11:00:00Z"
  }
}
```

### 5. Delete Interest
**DELETE** `/api/interests/:interestId`

**Query Parameters:**
- `hard` (optional): Set to `true` for permanent deletion (default: soft delete)

**Examples:**
- `/api/interests/abc123` - Soft delete (sets isActive to false)
- `/api/interests/abc123?hard=true` - Permanent deletion

**Response (Soft Delete):**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "name": "Technology",
    "isActive": false,
    "updatedAt": "2026-01-23T12:00:00Z"
  },
  "message": "Interest deactivated"
}
```

## 👤 User Interests Endpoints

### 1. Get User's Interests
**GET** `/api/users/:userId/interests`

**Query Parameters:**
- `details` (optional): Set to `true` to get full interest details instead of just IDs

**Examples:**
- `/api/users/user123/interests` - Get interest IDs only
- `/api/users/user123/interests?details=true` - Get full interest objects

**Response (IDs only):**
```json
{
  "success": true,
  "count": 3,
  "data": ["interest1", "interest2", "interest3"]
}
```

**Response (with details):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "interest1",
      "name": "Technology",
      "isActive": true
    },
    {
      "id": "interest2",
      "name": "Sports",
      "isActive": true
    }
  ]
}
```

### 2. Add Interest to User
**POST** `/api/users/:userId/interests`

**Request Body:**
```json
{
  "interestId": "abc123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "name": "John Doe",
    "interests": ["abc123"],
    "updatedAt": "2026-01-23T10:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Maximum 10 interests allowed
- `400` - Interest already added
- `404` - Interest not found or inactive

### 3. Remove Interest from User
**DELETE** `/api/users/:userId/interests/:interestId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "name": "John Doe",
    "interests": [],
    "updatedAt": "2026-01-23T10:00:00Z"
  }
}
```

### 4. Update User's Interests (Bulk)
**PUT** `/api/users/:userId/interests`

**Request Body:**
```json
{
  "interestIds": ["interest1", "interest2", "interest3"]
}
```

**Note:** Maximum 10 interests allowed. Duplicates are automatically removed.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "name": "John Doe",
    "interests": ["interest1", "interest2", "interest3"],
    "updatedAt": "2026-01-23T10:00:00Z"
  }
}
```

## 📝 Usage Examples

### Example 1: Create and Assign Interests

```javascript
// 1. Create interests
const techInterest = await fetch('/api/interests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Technology' })
});

const sportsInterest = await fetch('/api/interests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Sports' })
});

// 2. Get all active interests
const interests = await fetch('/api/interests?isActive=true');
const interestsData = await interests.json();

// 3. Add interests to user
await fetch('/api/users/user123/interests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ interestId: 'tech_interest_id' })
});

await fetch('/api/users/user123/interests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ interestId: 'sports_interest_id' })
});
```

### Example 2: Bulk Update User Interests

```javascript
// Update user with multiple interests at once
await fetch('/api/users/user123/interests', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    interestIds: ['interest1', 'interest2', 'interest3']
  })
});
```

### Example 3: Get User's Interests with Details

```javascript
// Get user's interests with full details
const response = await fetch('/api/users/user123/interests?details=true');
const data = await response.json();

// data.data contains full interest objects
data.data.forEach(interest => {
  console.log(interest.name); // "Technology", "Sports", etc.
});
```

## ⚠️ Important Notes

1. **Maximum 10 Interests**: Users can select a maximum of 10 interests
2. **Active Interests Only**: Only active interests can be added to users
3. **Soft Delete**: By default, deleting an interest sets `isActive` to `false` instead of permanent deletion
4. **Duplicate Prevention**: The system prevents adding the same interest twice to a user
5. **Array Storage**: User interests are stored as an array in the user document

## 🔐 Error Handling

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common error codes:
- `400` - Bad Request (validation errors, max limit reached, etc.)
- `404` - Not Found (user or interest not found)
- `500` - Internal Server Error

---

**Last Updated**: January 23, 2026

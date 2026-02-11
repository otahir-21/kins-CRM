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

- **JWT required** for: `/me`, `/me/about`, `/me/interests`, `POST/PUT/DELETE /interests`.
- **Rate limit** on `POST /api/v1/auth/login`.
- **ObjectIds** validated for `:id` and `interestIds`.
- **Unique index** on `(provider, providerUserId)` for users.
- **Email/phone** normalized (trim, lowercase email) on login.

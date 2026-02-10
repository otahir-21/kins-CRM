# Firebase Auth + MongoDB API (Step 1)

Auth via **Firebase ID token** only. User profile and interests stored in **MongoDB** (no Firestore).

---

## Base URL

- Local: `http://localhost:3000`
- Production: `https://kins-crm.vercel.app`

---

## Environment

- **MONGODB_URI** — MongoDB connection string (e.g. `mongodb://localhost:27017/kins-crm` or Atlas URI).
- **FIREBASE_SERVICE_ACCOUNT** (or service account key file) — for verifying Firebase ID tokens.

---

## Auth flow

1. Frontend signs in with Firebase (Phone / Google / Apple).
2. Frontend gets **Firebase ID token** from the Firebase client.
3. Frontend sends that token in **`Authorization: Bearer <id_token>`** to the backend.
4. Backend verifies the token with Firebase Admin SDK and **upserts the user in MongoDB**.
5. Backend returns the user profile; frontend uses the same token for later requests.

---

## Endpoints

### POST /auth/firebase

Verify Firebase ID token and create/update user in MongoDB.

**Request**

- **Header:** `Authorization: Bearer <Firebase_ID_Token>`
- **Body:** none

**Response 200**

```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "firebaseUid": "abc123firebaseUid",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+15551234567",
    "avatarUrl": "https://...",
    "createdAt": "2026-02-07T12:00:00.000Z",
    "updatedAt": "2026-02-07T12:00:00.000Z"
  }
}
```

**Response 401**

```json
{
  "success": false,
  "error": "Missing or invalid Authorization header. Use: Bearer <Firebase_ID_Token>."
}
```

---

### GET /me

Current user profile from MongoDB. Requires valid Firebase ID token.

**Request**

- **Header:** `Authorization: Bearer <Firebase_ID_Token>`

**Response 200**

```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "firebaseUid": "abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+15551234567",
    "avatarUrl": "https://...",
    "createdAt": "2026-02-07T12:00:00.000Z",
    "updatedAt": "2026-02-07T12:00:00.000Z"
  }
}
```

**Response 401**

```json
{
  "success": false,
  "error": "User not found. Call POST /auth/firebase first to register."
}
```

---

### GET /interests

Return all **active** interests sorted by name. No auth required.

**Request**

- **Query:** `?active=false` to include inactive.

**Response 200**

```json
{
  "success": true,
  "interests": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Music",
      "isActive": true,
      "createdAt": "2026-02-07T12:00:00.000Z",
      "updatedAt": "2026-02-07T12:00:00.000Z"
    }
  ]
}
```

---

### POST /interests

Create interest (auth required). Duplicate names (case-insensitive) are rejected.

**Request**

- **Header:** `Authorization: Bearer <Firebase_ID_Token>`
- **Body:**

```json
{
  "name": "Sleep"
}
```

**Response 201**

```json
{
  "success": true,
  "interest": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Music",
    "isActive": true,
    "createdAt": "2026-02-07T12:00:00.000Z",
    "updatedAt": "2026-02-07T12:00:00.000Z"
  }
}
```

**Response 409 (duplicate name)**

```json
{
  "success": false,
  "error": "An interest with this name already exists."
}
```

---

### PUT /interests/:id

Update interest (auth required).

**Request**

- **Header:** `Authorization: Bearer <Firebase_ID_Token>`
- **Body:** `{ "name": "New name", "isActive": false }` (partial OK)

**Response 200** — same shape as POST /interests `interest`.

---

### DELETE /interests/:id

Soft delete (deactivate) interest (auth required).

**Request**

- **Header:** `Authorization: Bearer <Firebase_ID_Token>`

**Response 200**

```json
{
  "success": true,
  "message": "Interest deactivated."
}
```

---

### POST /me/interests

Replace current user’s interests (auth required).

**Request**

- **Header:** `Authorization: Bearer <Firebase_ID_Token>`
- **Body:**

```json
{
  "interestIds": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
}
```

**Response 200**

```json
{
  "success": true,
  "interests": [
    { "id": "507f1f77bcf86cd799439012", "name": "Music", "isActive": true },
    { "id": "507f1f77bcf86cd799439013", "name": "Sports", "isActive": true }
  ]
}
```

---

### GET /me/interests

List interests selected by current user (auth required).

**Request**

- **Header:** `Authorization: Bearer <Firebase_ID_Token>`

**Response 200**

```json
{
  "success": true,
  "interests": [
    { "id": "507f1f77bcf86cd799439012", "name": "Music", "isActive": true }
  ]
}
```

---

## Frontend example (fetch)

```javascript
const BASE = 'https://kins-crm.vercel.app';

// After Firebase sign-in, get ID token (e.g. from firebase.auth().currentUser.getIdToken())
const idToken = await firebase.auth().currentUser.getIdToken();

// Register / update user
const authRes = await fetch(`${BASE}/auth/firebase`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${idToken}` },
});
const { user } = await authRes.json();

// Get profile
const meRes = await fetch(`${BASE}/me`, {
  headers: { Authorization: `Bearer ${idToken}` },
});

// Set my interests
await fetch(`${BASE}/me/interests`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  },
  body: JSON.stringify({ interestIds: ['507f1f77bcf86cd799439012'] }),
});
```

---

## Security

- Firebase ID token is verified on every protected route (`/me`, `/me/interests`, POST/PUT/DELETE `/interests`).
- User is identified by `firebaseUid` from the token; profile is read/updated in MongoDB.
- POST `/auth/firebase` is rate-limited (30 requests per 15 minutes per IP).

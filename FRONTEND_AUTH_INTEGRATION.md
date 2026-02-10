# Frontend / Mobile: Send OTP + Verify OTP Integration

Give this to your frontend or mobile team to integrate phone login.

---

## Base URL

```
https://kins-crm.vercel.app
```

(No trailing slash. Use the same for all auth and API calls.)

---

## Flow (2 steps)

1. **Send OTP** — User enters phone number → you call **POST /auth/send-otp** → user receives SMS code.
2. **Verify OTP** — User enters the 6-digit code → you call **POST /auth/verify-otp** → you get **user** + **accessToken** → store the token and use **user.id** (E.164 phone) as the user ID for the rest of the app.

After success, call other APIs with header: **`Authorization: Bearer <accessToken>`**. User ID for paths = **`user.id`** (e.g. `+971501234567`).

---

## 1. Send OTP

**Request**

- **URL:** `https://kins-crm.vercel.app/auth/send-otp`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**

```json
{
  "phone": "+971501234567"
}
```

Use E.164 format (e.g. `+971...`, `+1...`, `+44...`). You can send with or without spaces/dashes; the server normalizes.

**Success (200)**

```json
{
  "success": true,
  "message": "OTP sent successfully."
}
```

**Errors**

| Status | Body | Meaning |
|--------|------|--------|
| 400 | `{ "success": false, "error": "Phone number is required." }` | Missing or invalid phone |
| 429 | `{ "success": false, "error": "Please wait X seconds...", "retryAfterSeconds": 45 }` | Resend cooldown (60 s) |
| 429 | `{ "success": false, "error": "Too many auth attempts..." }` | Rate limit (10 per 15 min per IP) |

---

## 2. Verify OTP (login / register)

**Request**

- **URL:** `https://kins-crm.vercel.app/auth/verify-otp`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**

```json
{
  "phone": "+971501234567",
  "code": "123456"
}
```

Use the **same phone** as in send-otp. **code** = the 6-digit OTP from SMS.

**Success (200)**

```json
{
  "success": true,
  "user": {
    "id": "+971501234567",
    "phoneNumber": "+971501234567",
    "name": null,
    "gender": null,
    "documentUrl": null,
    "interests": []
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d"
}
```

**What to do:**

- Store **`accessToken`** (e.g. secure storage / keychain).
- Store **`user`** (or at least **`user.id`**).
- Use **`user.id`** as the user ID in API paths (e.g. `/api/users/+971501234567`).
- For all later API requests, send: **`Authorization: Bearer <accessToken>`**.

**Error (400)**

```json
{
  "success": false,
  "error": "Invalid or expired code."
}
```

Wrong code or code expired. Ask user to re-enter or request a new OTP (after cooldown).

---

## Copy-paste examples

### JavaScript / React (fetch)

```javascript
const BASE_URL = 'https://kins-crm.vercel.app';

// Step 1: Send OTP
async function sendOtp(phone) {
  const res = await fetch(`${BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
  return data;
}

// Step 2: Verify OTP → get user + token
async function verifyOtp(phone, code) {
  const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid code');
  return data; // { user, accessToken, expiresIn }
}

// Usage:
// await sendOtp('+971501234567');
// const { user, accessToken } = await verifyOtp('+971501234567', '123456');
// localStorage.setItem('token', accessToken);
// localStorage.setItem('userId', user.id);
```

### Flutter (Dart / http)

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

const String baseUrl = 'https://kins-crm.vercel.app';

Future<void> sendOtp(String phone) async {
  final res = await http.post(
    Uri.parse('$baseUrl/auth/send-otp'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'phone': phone}),
  );
  final data = jsonDecode(res.body);
  if (res.statusCode != 200) throw Exception(data['error'] ?? 'Failed to send OTP');
}

Future<Map<String, dynamic>> verifyOtp(String phone, String code) async {
  final res = await http.post(
    Uri.parse('$baseUrl/auth/verify-otp'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'phone': phone, 'code': code}),
  );
  final data = jsonDecode(res.body);
  if (res.statusCode != 200) throw Exception(data['error'] ?? 'Invalid code');
  return data; // { 'user': {...}, 'accessToken': '...', 'expiresIn': '7d' }
}

// After success: save data['accessToken'] and data['user']['id']; use token in header:
// 'Authorization': 'Bearer ${accessToken}'
```

### Authenticated request (after login)

```javascript
const token = '...'; // from verify-otp
const userId = '+971501234567'; // user.id

const res = await fetch(`${BASE_URL}/api/users/${userId}`, {
  headers: { 'Authorization': `Bearer ${token}` },
});
```

---

## Summary for frontend

| Item | Value |
|------|--------|
| **Base URL** | `https://kins-crm.vercel.app` |
| **Send OTP** | `POST /auth/send-otp` — body: `{ "phone": "+..." }` |
| **Verify OTP** | `POST /auth/verify-otp` — body: `{ "phone": "+...", "code": "123456" }` |
| **On success** | Store `accessToken` and `user.id`; use `Authorization: Bearer <accessToken>` for API calls; use `user.id` in paths like `/api/users/:userId` |
| **Resend cooldown** | 60 seconds between send-otp for same phone |
| **Rate limit** | 10 auth requests per 15 minutes per IP |

That’s everything needed to integrate send OTP and verify OTP on the frontend.

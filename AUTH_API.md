# KINS Auth API — Twilio Verify + JWT

Phone number authentication **replaces Firebase Phone Authentication**. All credentials (Twilio, JWT) are server-side via environment variables.

---

## Testing the API

### 1. Start the server and set env

```bash
# From project root
cp .env.example .env
# Edit .env: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID, JWT_SECRET

npm run dev
```

Server runs at `http://localhost:3000`.

### 2. Option A — Node test script (easiest)

```bash
# Send OTP to your phone (use E.164, e.g. +44... or +1...)
node test-auth-api.js +441234567890

# After you receive the SMS, verify (replace 123456 with the code you got)
node test-auth-api.js +441234567890 123456
```

### 3. Option B — curl

**Send OTP:**

```bash
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+441234567890"}'
```

**Verify OTP** (use the code you received):

```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+441234567890","code":"123456"}'
```

### 4. Option C — Postman / Insomnia / VS Code REST Client

- **POST** `http://localhost:3000/auth/send-otp`  
  Body (JSON): `{ "phone": "+441234567890" }`

- **POST** `http://localhost:3000/auth/verify-otp`  
  Body (JSON): `{ "phone": "+441234567890", "code": "123456" }`

### Notes

- You need a real phone number and Twilio credentials for OTP to be sent.
- Resend cooldown: 60 seconds between send-otp for the same number.
- Rate limit: 10 auth requests per 15 minutes per IP.

---

## Base URL

- Development: `http://localhost:3000`
- Production: your API base URL

---

## 1. Send OTP

**POST** `/auth/send-otp`

Sends an OTP to the given phone number via Twilio Verify (SMS).

### Request

| Field  | Type   | Required | Description                    |
|--------|--------|----------|--------------------------------|
| `phone`| string | Yes      | E.164 or normalizable (e.g. `+14155551234`, `4155551234`) |

**Example (JSON body):**

```json
{
  "phone": "+14155551234"
}
```

### Response — Success (200)

```json
{
  "success": true,
  "message": "OTP sent successfully."
}
```

### Response — Validation (400)

```json
{
  "success": false,
  "error": "Phone number is required."
}
```

### Response — Resend cooldown (429)

After sending an OTP, the same phone must wait **60 seconds** before requesting another code.

```json
{
  "success": false,
  "error": "Please wait 45 seconds before requesting a new code.",
  "retryAfterSeconds": 45
}
```

### Response — Rate limit (429)

Max **10 auth requests per 15 minutes per IP** (send-otp + verify-otp combined).

```json
{
  "success": false,
  "error": "Too many auth attempts. Try again later."
}
```

---

## 2. Verify OTP and login / register

**POST** `/auth/verify-otp`

Verifies the OTP code. If the phone number exists, the user is logged in; if not, a new user is created. Returns a **JWT access token** for authenticated API calls.

### Request

| Field  | Type   | Required | Description     |
|--------|--------|----------|-----------------|
| `phone`| string | Yes      | Same as in send-otp (E.164 or normalizable) |
| `code` | string | Yes      | OTP code received via SMS (e.g. `123456`)   |

**Example (JSON body):**

```json
{
  "phone": "+14155551234",
  "code": "123456"
}
```

### Response — Success (200)

**New user (first time):**

```json
{
  "success": true,
  "user": {
    "id": "+14155551234",
    "phoneNumber": "+14155551234",
    "name": null,
    "gender": null,
    "documentUrl": null,
    "interests": []
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d"
}
```

**Existing user (login):**

```json
{
  "success": true,
  "user": {
    "id": "+14155551234",
    "phoneNumber": "+14155551234",
    "name": "John",
    "gender": "male",
    "documentUrl": "https://...",
    "interests": ["interestId1", "interestId2"]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d"
}
```

- **`user.id`** is the unique user identifier (same as E.164 phone).
- **`accessToken`** is a JWT; use it in the `Authorization` header for protected endpoints:  
  `Authorization: Bearer <accessToken>`
- **`expiresIn`** is the token lifetime (e.g. `7d` from `JWT_EXPIRES_IN`).

### Response — Invalid code (400)

```json
{
  "success": false,
  "error": "Invalid or expired code."
}
```

### Response — Missing fields (400)

```json
{
  "success": false,
  "error": "Verification code is required."
}
```

---

## Using the access token (frontend)

For any API that requires authentication, send the JWT in the header:

```
Authorization: Bearer <accessToken>
```

Store `accessToken` and `user` (e.g. in secure storage). Use `user.id` as the user ID when calling APIs that take `userId` (e.g. `/api/users/:userId`).

---

## Flutter — Example requests and handling

### Dependencies

```yaml
dependencies:
  http: ^1.1.0
  # or dio: ^5.0.0
```

### 1. Send OTP

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> sendOtp(String phone) async {
  const baseUrl = 'http://localhost:3000'; // or your API URL
  final response = await http.post(
    Uri.parse('$baseUrl/auth/send-otp'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'phone': phone}),
  );
  final data = jsonDecode(response.body);

  if (response.statusCode == 200 && data['success'] == true) {
    // Show: "Code sent to your phone"
    return;
  }
  if (response.statusCode == 429) {
    final seconds = data['retryAfterSeconds'] ?? 60;
    throw Exception('Wait $seconds seconds before resending.');
  }
  throw Exception(data['error'] ?? 'Failed to send code');
}
```

**Example call:** `sendOtp('+14155551234');`

### 2. Verify OTP and get user + token

```dart
Future<AuthResult> verifyOtp(String phone, String code) async {
  const baseUrl = 'http://localhost:3000';
  final response = await http.post(
    Uri.parse('$baseUrl/auth/verify-otp'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'phone': phone, 'code': code}),
  );
  final data = jsonDecode(response.body);

  if (response.statusCode != 200 || data['success'] != true) {
    throw Exception(data['error'] ?? 'Verification failed');
  }

  return AuthResult(
    user: User.fromJson(data['user']),
    accessToken: data['accessToken'] as String,
    expiresIn: data['expiresIn'] as String,
  );
}

class AuthResult {
  final User user;
  final String accessToken;
  final String expiresIn;
  AuthResult({required this.user, required this.accessToken, required this.expiresIn});
}

class User {
  final String id;
  final String phoneNumber;
  final String? name;
  final String? gender;
  final String? documentUrl;
  final List<String> interests;
  User({
    required this.id,
    required this.phoneNumber,
    this.name,
    this.gender,
    this.documentUrl,
    required this.interests,
  });
  factory User.fromJson(Map<String, dynamic> j) => User(
    id: j['id'] as String,
    phoneNumber: j['phoneNumber'] as String,
    name: j['name'],
    gender: j['gender'],
    documentUrl: j['documentUrl'],
    interests: List<String>.from(j['interests'] ?? []),
  );
}
```

**Example:**  
`final result = await verifyOtp('+14155551234', '123456');`  
Then store `result.accessToken` and `result.user`, and use the token for API calls.

### 3. Authenticated request (e.g. get current user profile)

```dart
Future<Map<String, dynamic>> getProfile(String accessToken) async {
  const baseUrl = 'http://localhost:3000';
  // userId for phone-auth users is the E.164 phone (user.id from verify-otp)
  final userId = '...'; // from stored user.id
  final response = await http.get(
    Uri.parse('$baseUrl/api/users/$userId'),
    headers: {'Authorization': 'Bearer $accessToken'},
  );
  if (response.statusCode != 200) throw Exception('Failed to load profile');
  return jsonDecode(response.body) as Map<String, dynamic>;
}
```

---

## Environment variables (backend)

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify Service SID (starts with `VA...`) |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars in production) |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`, `24h`) |

Create a Verify service in [Twilio Console](https://console.twilio.com/) → Verify → Services, then set `TWILIO_VERIFY_SERVICE_SID` to that service’s SID.

---

## Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/send-otp` | POST | Send OTP to phone (rate limited + 60s resend cooldown) |
| `/auth/verify-otp` | POST | Verify OTP; create or login user; return JWT |

- **User identifier:** phone number (E.164), same as `user.id`.
- **Auth header:** `Authorization: Bearer <accessToken>`.
- **Firebase Phone Authentication is not used.**

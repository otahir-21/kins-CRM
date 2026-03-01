# Firebase env vars on production

The Flutter app calls **GET /api/v1/me/firebase-token** on your **production** backend.

## "Chat sign-in is temporarily unavailable" in the app

If the mobile app shows a message like **"Chat sign-in is temporarily unavailable. The server needs Firebase to be configured for chat. Please try again later."**, the app is hiding the raw backend error (which may have mentioned Vercel or env vars). **Fix:** Configure Firebase Admin on the server that actually runs your API (e.g. EC2 at `http://16.16.96.232`), not in the Flutter app. Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in that server's environment (e.g. `.env` on EC2, or Environment Variables on Vercel if the API is there). Then restart the API so it can return a custom token from `GET /me/firebase-token`.

---

## Backend returns "Firebase not configured"

If you call the API directly and see:

`Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.`

then those variables are not set or the key format is wrong.

- **"Missing or invalid Authorization header"** → Send `Authorization: Bearer <jwt>` on the request. In Flutter, call this endpoint only when the user is logged in and attach the same JWT you use for other APIs.
- **"Invalid PEM formatted message"** → The backend now tries to fix keys where newlines were turned into spaces (e.g. by Vercel). Redeploy and try again. If it still fails, set FIREBASE_PRIVATE_KEY to one line with `\n` where newlines go (see below).

## Fix: set env vars where the API is deployed

### Vercel

1. Open your project → **Settings** → **Environment Variables**.
2. Add (for **Production**, and optionally Preview/Development):

   | Name | Value |
   |------|--------|
   | `FIREBASE_PROJECT_ID` | Your Firebase project ID (e.g. `my-app-12345`) |
   | `FIREBASE_CLIENT_EMAIL` | From service account JSON: `client_email` |
   | `FIREBASE_PRIVATE_KEY` | From service account JSON: `private_key` (paste the full key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`) |

3. **Private key (important on Vercel):**
   - **Option A (recommended):** In the JSON, `private_key` is one string with literal `\n` in it. Copy that **entire** value (including the quotes) and paste into Vercel. Remove the surrounding JSON quotes so the value starts with `-----BEGIN PRIVATE KEY-----\n` and ends with `\n-----END PRIVATE KEY-----\n`. The backend will turn `\n` into real newlines.
   - **Option B:** Paste the key with real line breaks. If you get "Firebase init failed" or "invalid PEM" after deploy, Vercel may have altered newlines—use Option A instead.
4. **Redeploy** the project (Deployments → ⋮ on latest → Redeploy) so the new variables are applied.
5. If it still fails, the API now returns a `detail` field with the real error (e.g. invalid PEM). Check that field in the response to fix the key format.

### Getting the values from Firebase

1. Firebase Console → **Project settings** (gear) → **Service accounts**.
2. **Generate new private key** → download the JSON file.
3. From that file:
   - `project_id` → **FIREBASE_PROJECT_ID**
   - `client_email` → **FIREBASE_CLIENT_EMAIL**
   - `private_key` → **FIREBASE_PRIVATE_KEY** (the full string, including `\n` characters as in the file)

### After setting and redeploying

- Call **GET /api/v1/me/firebase-token** again with a valid JWT.
- The API response may include:
  - `missing`: list of env var names that are not set (e.g. `["FIREBASE_PRIVATE_KEY"]`).
  - `detail`: the actual Firebase error (e.g. "invalid PEM formatted message") when vars are set but the key format is wrong—use this to fix FIREBASE_PRIVATE_KEY.

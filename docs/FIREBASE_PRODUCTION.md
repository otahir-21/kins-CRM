# Firebase env vars on production

The Flutter app calls **GET /api/v1/me/firebase-token** on your **production** backend. If you see:

`Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.`

then those variables are **not set in the environment where the API runs** (e.g. Vercel).

## Fix: set env vars where the API is deployed

### Vercel

1. Open your project → **Settings** → **Environment Variables**.
2. Add (for **Production**, and optionally Preview/Development):

   | Name | Value |
   |------|--------|
   | `FIREBASE_PROJECT_ID` | Your Firebase project ID (e.g. `my-app-12345`) |
   | `FIREBASE_CLIENT_EMAIL` | From service account JSON: `client_email` |
   | `FIREBASE_PRIVATE_KEY` | From service account JSON: `private_key` (paste the full key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`) |

3. **Private key:** Paste the key as a single line or keep newlines. If you paste with real newlines, Vercel stores them. If you use `\n` in the value, the backend will replace `\n` with real newlines. **Do not** wrap the key in extra quotes in the UI unless the key itself contains quotes.
4. **Redeploy** the project (e.g. trigger a new deployment or push a commit) so the new variables are applied.

### Getting the values from Firebase

1. Firebase Console → **Project settings** (gear) → **Service accounts**.
2. **Generate new private key** → download the JSON file.
3. From that file:
   - `project_id` → **FIREBASE_PROJECT_ID**
   - `client_email` → **FIREBASE_CLIENT_EMAIL**
   - `private_key` → **FIREBASE_PRIVATE_KEY** (the full string, including `\n` characters as in the file)

### After setting and redeploying

- Call **GET /api/v1/me/firebase-token** again with a valid JWT.
- If something is still missing, the API now returns which variables are missing, e.g. `missing: ["FIREBASE_PRIVATE_KEY"]`, so you can fix the right one.

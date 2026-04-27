# Production environment variables (final reference)

Single reference for all environment variables used by Kindash in production.

---

## 1. Core (required)

| Variable | Required | Where to get it | Format / notes |
|----------|----------|-----------------|----------------|
| **MONGODB_URI** | ✅ | MongoDB Atlas (or your cluster): Connect → Drivers → Node.js. Replace `<password>` and set database name in path (e.g. `/kins` or `/kindash`). | `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/DATABASE?retryWrites=true&w=majority&appName=Kins` |
| **JWT_SECRET** | ✅ | Generate: `openssl rand -base64 32`. Used to sign login tokens and API v1. | Min 32 characters. Never commit. |
| **JWT_EXPIRES_IN** | ✅ | Your choice. | e.g. `7d`, `24h`. Default in code: `7d`. |
| **NODE_ENV** | ✅ | Set on host. | `production` |

---

## 2. Server (optional)

| Variable | Required | Where to get it | Format / notes |
|----------|----------|-----------------|----------------|
| **PORT** | ❌ | Set if host doesn’t provide it. | e.g. `3000`. Default: `3000`. |
| **API_KEY** | ❌ | Optional extra API protection. | Any string if you use it. |
| **MONGODB_QUERY_TIMING** | ❌ | Debug only. | Set to `1` to log query timing. |
| **VERCEL** | ❌ | Set by Vercel automatically. | Do not set on EC2/other hosts. |
| **DATA_BACKEND_DEFAULT** | ❌ | Internal migration flag. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_AUTH** | ❌ | Internal migration flag for `/api/v1/auth/login` data provider. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_ME** | ❌ | Internal migration flag for `/api/v1/me` profile reads/writes provider. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_FEED** | ❌ | Internal migration flag for mobile `/api/v1/feed` + `/api/v1/posts` (list/detail/create/delete/report) backed by Firestore. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_INTERESTS** | ❌ | Internal migration flag for interests/categories CRUD domain. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_USERS** | ❌ | Internal migration flag for CRM users domain endpoints. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_GROUPS** | ❌ | Internal migration flag for CRM groups list/detail endpoints. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_ADS** | ❌ | Internal migration flag for ads list/detail/create/update/delete endpoints. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_MARKETPLACE** | ❌ | Internal migration flag for marketplace listings CRUD endpoints. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_SURVEYS** | ❌ | Internal migration flag for surveys + survey responses endpoints. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_ONBOARDING** | ❌ | Internal migration flag for onboarding steps endpoints. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_MODERATION** | ❌ | Internal migration flag for moderation settings/keywords endpoints. | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_POSTS** | ❌ | Internal migration flag for CRM posts moderation endpoints (`/api/posts*`). | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_VERIFICATION** | ❌ | Internal migration flag for brand verification endpoints (`/api/brands/verification*`). | `mongo` (default) or `firebase`. |
| **DATA_BACKEND_NOTIFICATIONS** | ❌ | Internal migration flag for broadcast + user notification endpoints. | `mongo` (default) or `firebase`. |

When `DATA_BACKEND_AUTH=firebase`, login also keeps a Mongo shadow user in sync so existing JWT-protected Mongo-backed endpoints continue to work during migration.

After pulling changes that add Firestore composite queries (for example notifications `userId` + `createdAt` / `read`), deploy indexes so production does not fall back to slower paths: `firebase deploy --only firestore:indexes` (requires Firebase CLI and the same project as `FIREBASE_PROJECT_ID`).

---

## 3. Twilio Verify (required for phone auth)

| Variable | Required | Where to get it | Format / notes |
|----------|----------|-----------------|----------------|
| **TWILIO_ACCOUNT_SID** | ✅ | Twilio Console → Account → API keys & tokens. | Starts with `AC`. |
| **TWILIO_AUTH_TOKEN** | ✅ | Same place. | Primary auth token. Never commit. |
| **TWILIO_VERIFY_SERVICE_SID** | ✅ | Twilio Console → Verify → Services → your service. | Starts with `VA`. |

---

## 4. Firebase (required for group chat custom token)

Used so the Flutter app can use Firestore/Storage for group chat. From Firebase Console → Project settings → Service accounts → Generate new private key (download JSON).

| Variable | Required | Where to get it | Format / notes |
|----------|----------|-----------------|----------------|
| **FIREBASE_PROJECT_ID** | ✅ | From the JSON: `project_id`. | e.g. `kins-b4afb`. |
| **FIREBASE_CLIENT_EMAIL** | ✅ | From the JSON: `client_email`. | e.g. `firebase-adminsdk-xxxxx@kins-b4afb.iam.gserviceaccount.com`. |
| **FIREBASE_PRIVATE_KEY** | ✅ | From the JSON: `private_key`. In `.env` use `\n` for newlines; keep the quotes. | `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"` |

**Alternative (some hosts):** If your host supports one big secret, you can store the **entire service account JSON** as **FIREBASE_SERVICE_ACCOUNT** (one line) and parse it at startup; the code currently uses the three vars above.

---

## 5. Firebase Storage (optional)

| Variable | Required | Where to get it | Format / notes |
|----------|----------|-----------------|----------------|
| **FIREBASE_STORAGE_BUCKET** | ❌ | Firebase Console → Project settings → General → “Storage bucket”. | e.g. `kins-b4afb.firebasestorage.app`. |

---

## 6. Bunny CDN (optional – post media & onboarding uploads)

| Variable | Required | Where to get it | Format / notes |
|----------|----------|-----------------|----------------|
| **BUNNY_STORAGE_ZONE** | ❌ | Bunny dashboard → Storage → your zone name. | e.g. `kins-app`. |
| **BUNNY_ACCESS_KEY** | ❌ | Storage zone → FTP & API access → Password. | API key for the zone. |
| **BUNNY_CDN_URL** | ❌ | Pull zone URL (no trailing slash). | e.g. `https://kins-app.b-cdn.net`. |
| **BUNNY_STORAGE_REGION** | ❌ | Region of the storage zone. | e.g. `uk`. |

---

## 7. Frontend build (only if UI is on a different host)

Set **only when** the CRM UI is built and served from a different origin than the API (e.g. S3/CloudFront + EC2 API, or any split hosting).

| Variable | Required | Where to get it | Format / notes |
|----------|----------|-----------------|----------------|
| **VITE_API_URL** | ❌ | Your API base URL. | Full URL, no trailing slash: `https://api.yourdomain.com` or `http://16.16.96.232`. |

- **Same-origin (UI and API on one server):** Leave **VITE_API_URL unset** when running `npm run build`.
- **Do not** set `VITE_API_URL=/api` (path only); that causes `/api/api/...` and 404s.

---

## 8. Scripts / tests (not for the running server)

Used when running scripts or test clients against the deployed API (e.g. from your laptop).

| Variable | Required | Description |
|----------|----------|-------------|
| **BASE_URL** | — | API base URL (origin only), e.g. `https://api.example.com` (AWS ALB/custom domain) or `http://<ec2-public-ip>`. |
| **API_BASE_URL** | — | Same idea in some scripts. |
| **TOKEN** | — | JWT for authenticated script requests. |

---

## Final checklist (copy, fill, and store as secrets)

Use this as the single list; store values in your host’s secrets (e.g. AWS Parameter Store / Secrets Manager, Vercel env, or a server `.env` that is never committed).

```
# ─── Required ─────────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/kins?retryWrites=true&w=majority&appName=Kins
JWT_SECRET=                            # openssl rand -base64 32
JWT_EXPIRES_IN=7d
NODE_ENV=production

TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...@....iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ─── Optional (server) ─────────────────────────────────────────────
PORT=3000
# API_KEY=...
# MONGODB_QUERY_TIMING=1
# DATA_BACKEND_DEFAULT=mongo
# DATA_BACKEND_AUTH=mongo
# DATA_BACKEND_ME=mongo
# DATA_BACKEND_INTERESTS=mongo
# DATA_BACKEND_USERS=mongo
# DATA_BACKEND_GROUPS=mongo
# DATA_BACKEND_ADS=mongo
# DATA_BACKEND_MARKETPLACE=mongo
# DATA_BACKEND_SURVEYS=mongo
# DATA_BACKEND_ONBOARDING=mongo
# DATA_BACKEND_MODERATION=mongo
# DATA_BACKEND_POSTS=mongo
# DATA_BACKEND_VERIFICATION=mongo
# DATA_BACKEND_NOTIFICATIONS=mongo
# DATA_BACKEND_FEED=mongo

# ─── Optional (Firebase Storage) ──────────────────────────────────
# FIREBASE_STORAGE_BUCKET=....firebasestorage.app

# ─── Optional (Bunny CDN) ──────────────────────────────────────────
# BUNNY_STORAGE_ZONE=...
# BUNNY_ACCESS_KEY=...
# BUNNY_CDN_URL=https://....b-cdn.net
# BUNNY_STORAGE_REGION=uk

# ─── Frontend build (only if UI on different host) ──────────────────
# VITE_API_URL=https://your-api-domain.com
```

---

## Security

- **Never commit** real values. Use `.env` (in `.gitignore`) or the host’s secret store.
- Prefer **Secrets Manager / Parameter Store** for: `JWT_SECRET`, `FIREBASE_PRIVATE_KEY`, `TWILIO_AUTH_TOKEN`, and full MongoDB URI.

---

## Troubleshooting: "Failed to configure Bunny CDN"

The app needs **all three** Bunny vars to enable image uploads (ads, onboarding, profile, etc.):

- **BUNNY_STORAGE_ZONE** – your storage zone name (e.g. `kins-app`)
- **BUNNY_ACCESS_KEY** – the zone API password
- **BUNNY_CDN_URL** – pull zone URL (e.g. `https://kins-app.b-cdn.net`)

If **BUNNY_STORAGE_ZONE** is missing, you get "failed to configure Bunny CDN". Fix:

1. In Bunny dashboard → Storage → your zone → note the **zone name**.
2. Add to `.env`: `BUNNY_STORAGE_ZONE=kins-app` (or your zone name).
3. Remove any typo line like `UNNY_ACCESS_KEY...` (missing the leading B and =).
4. Restart: `pm2 restart kins-api --update-env`.

---

## EC2 .env: Firebase private key and multi-line values

**.env does not support multi-line values.** Each line is one `KEY=value`. If you split `FIREBASE_PRIVATE_KEY` across many lines, only the first line is used and Firebase will fail (invalid PEM).

**Fix:** Put the entire private key on **one line**, with literal `\n` where newlines go (no real line breaks):

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n"
```

Copy the `private_key` value from your Firebase service account JSON (it’s already one string with `\n` there). Paste that as the value; wrap in double quotes. Do **not** put real line breaks inside the value.

**FIREBASE_SERVICE_ACCOUNT:** The app does **not** read this; it uses `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. If you have a multi-line `FIREBASE_SERVICE_ACCOUNT={ ... }` in `.env`, remove it. Multi-line JSON in .env breaks parsing (following lines are treated as new keys).

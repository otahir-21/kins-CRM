# Hosting the KINS CRM API

Deploy the backend so you can test the auth API (and the rest) from a public URL.

**Quick path:** Push your code to GitHub → [Railway](https://railway.app) → New Project from repo → add env vars (see below) → Generate Domain → use that URL with the test script.

---

## What you need before deploying

1. **Environment variables** (set these on your host):
   - **Firebase:** `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_SERVICE_ACCOUNT` (JSON string) or upload `serviceAccountKey.json` if the host supports secrets files
   - **Twilio (for auth):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`
   - **JWT:** `JWT_SECRET` (min 32 characters)
   - **Optional:** `PORT` (most hosts set this automatically), `NODE_ENV=production`

2. **Firebase service account:** Either paste the full JSON as `FIREBASE_SERVICE_ACCOUNT` or add the key file via your host’s “secret files” (if available).

---

## Option 1: Railway (recommended, simple)

1. Go to [railway.app](https://railway.app) and sign in (e.g. GitHub).
2. **New Project** → **Deploy from GitHub repo** → select your `Kins-CRM` repo (push your code first if needed).
3. Railway detects Node.js and will run `npm install` and `npm start` (or use the Procfile).
4. **Variables:** In the project, select your service → **Variables** → add:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_SERVICE_ACCOUNT` = full JSON content of your service account (as one line, or use “bulk edit”).
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`
   - `JWT_SECRET`
5. **Deploy:** Railway builds and deploys. Open **Settings** → **Networking** → **Generate Domain** to get a URL like `https://your-app.up.railway.app`.
6. **Test auth:**
   ```bash
   BASE_URL=https://your-app.up.railway.app node test-auth-api.js +441234567890
   # Then with the code you received:
   BASE_URL=https://your-app.up.railway.app node test-auth-api.js +441234567890 123456
   ```

---

## Option 2: Render

1. Go to [render.com](https://render.com) and sign in (e.g. GitHub).
2. **New** → **Web Service** → connect your GitHub repo (`Kins-CRM`).
3. **Settings:**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` or `node server.js`
   - **Environment:** Node (e.g. Node 20).
4. **Environment variables:** In the service → **Environment** → add the same variables as above (Firebase, Twilio, JWT_SECRET).
5. **Deploy:** Save; Render builds and deploys. Your URL will be like `https://your-app.onrender.com`.
6. **Test auth:**
   ```bash
   BASE_URL=https://your-app.onrender.com node test-auth-api.js +441234567890
   BASE_URL=https://your-app.onrender.com node test-auth-api.js +441234567890 123456
   ```

---

## Option 3: Fly.io

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/) and log in: `fly auth login`.
2. In your project root:
   ```bash
   fly launch --no-deploy
   ```
   Say yes to create `fly.toml`. When asked for a region, pick one near you.
3. Set secrets (these are env vars on Fly):
   ```bash
   fly secrets set FIREBASE_PROJECT_ID=kins-b4afb
   fly secrets set FIREBASE_STORAGE_BUCKET=kins-b4afb.firebasestorage.app
   fly secrets set TWILIO_ACCOUNT_SID=ACxxx...
   fly secrets set TWILIO_AUTH_TOKEN=xxx
   fly secrets set TWILIO_VERIFY_SERVICE_SID=VAxxx...
   fly secrets set JWT_SECRET=your-long-secret
   ```
   For `FIREBASE_SERVICE_ACCOUNT`, paste the JSON in one line:
   ```bash
   fly secrets set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
   ```
4. Deploy:
   ```bash
   fly deploy
   ```
5. Your URL: `https://your-app-name.fly.dev`. Test:
   ```bash
   BASE_URL=https://your-app-name.fly.dev node test-auth-api.js +441234567890
   BASE_URL=https://your-app-name.fly.dev node test-auth-api.js +441234567890 123456
   ```

---

## After hosting: test the API

Replace `https://YOUR-DEPLOYED-URL` with your real URL (no trailing slash).

**Health check:**
```bash
curl https://YOUR-DEPLOYED-URL/health
```

**Send OTP:**
```bash
curl -X POST https://YOUR-DEPLOYED-URL/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+441234567890"}'
```

**Verify OTP** (use the code you received):
```bash
curl -X POST https://YOUR-DEPLOYED-URL/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+441234567890","code":"123456"}'
```

**Using the test script:**
```bash
BASE_URL=https://YOUR-DEPLOYED-URL node test-auth-api.js +441234567890
BASE_URL=https://YOUR-DEPLOYED-URL node test-auth-api.js +441234567890 123456
```

---

## Troubleshooting

- **Build fails:** Ensure `package.json` has `"engines": { "node": ">=18" }` if you use Node 18+ features, and that all required env vars are set.
- **503 / App not starting:** Check the host’s logs. Often caused by missing `FIREBASE_SERVICE_ACCOUNT` or wrong JSON.
- **Auth fails on hosted URL:** Confirm Twilio and JWT env vars are set on the host (not only in local `.env`).
- **CORS:** The app uses `cors()` with no origin restriction. To restrict later, set e.g. `CORS_ORIGIN=https://your-frontend.com` and use it in `server.js`.

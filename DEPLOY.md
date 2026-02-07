# Hosting the KINS CRM API

Deploy the backend so you can test the auth API (and the rest) from a public URL.

**Quick path:** Push your code to GitHub → [Railway](https://railway.app) → New Project from repo → add env vars (see below) → Generate Domain → use that URL with the test script.

---

## One deployment = API + frontend (recommended)

One project = backend (Node/Express) + frontend (React in `frontend/`). One Vercel deployment serves both. Build: `npm install && npm run build` (builds frontend into `frontend/dist`). Runtime: API at `/api/*`, auth at `/auth/*`; all other routes serve the CRM UI.

- _Obsolete:_ Backend (API) at repo root — what you deployed. The root URL returns that JSON as the API “index”.
- After deploy, open your URL (e.g. **https://kins-crm.vercel.app/**) for the CRM dashboard; `/api/*` and `/health` work as before.

### Local development

- **Backend only:** `npm run dev` (API at http://localhost:3000).
- **Frontend + API together:** `npm run build` then `npm start` — open http://localhost:3000 for both. If you deploy frontend elsewhere, set **VITE_API_URL** to your API URL.

---

## What you need before deploying (backend)

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

## Option 2: Vercel

**Where to add environment variables**

1. Go to [vercel.com](https://vercel.com) → sign in → open your project (or **Add New** → **Project** and import your GitHub repo).
2. Open **Settings** (top tab) → **Environment Variables** in the left sidebar.
3. Add each variable:
   - **Key** = name (e.g. `TWILIO_ACCOUNT_SID`)
   - **Value** = your secret (never commit real values)
   - **Environment** = choose **Production** (and **Preview** / **Development** if you use those).
4. Click **Save**. Redeploy the project (Deployments → ⋮ on latest → Redeploy) so the new variables are used.

**Variables to add**

| Key | Example / notes |
|-----|------------------|
| `FIREBASE_PROJECT_ID` | `kins-b4afb`|
| `FIREBASE_STORAGE_BUCKET` | `kins-b4afb.firebasestorage.app` |
| `FIREBASE_SERVICE_ACCOUNT` | Full JSON of your Firebase service account key (paste as **one line**) |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `TWILIO_VERIFY_SERVICE_SID` | Your Verify service SID (starts with `VA...`) |
| `JWT_SECRET` | Long random string (min 32 characters) |
| `BUNNY_STORAGE_ZONE` | (optional) If you use onboarding uploads |
| `BUNNY_ACCESS_KEY` | (optional) |
| `BUNNY_CDN_URL` | (optional) |

**Firebase JSON:** In Firebase Console → Project Settings → Service Accounts → Generate new private key. Copy the whole JSON, then paste it as the value of `FIREBASE_SERVICE_ACCOUNT` (one line is fine).

After deploy, your API URL will be like `https://your-project.vercel.app`. Test auth with:

```bash
BASE_URL=https://your-project.vercel.app node test-auth-api.js +441234567890
BASE_URL=https://your-project.vercel.app node test-auth-api.js +441234567890 123456
```

**If you get 500 / "This Serverless Function has crashed"**

1. **Set `FIREBASE_SERVICE_ACCOUNT`**  
   The app needs this on Vercel (there is no `serviceAccountKey.json` in deployment). In **Settings → Environment Variables** add:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** Paste the **entire** contents of your Firebase service account JSON as **one line** (no line breaks). From Firebase Console → Project Settings → Service Accounts → Generate new private key, then copy the full JSON.

2. **Check the logs**  
   In Vercel: open your project → **Deployments** → click the latest deployment → **Functions** tab, or **Logs** / **Runtime Logs**. The error message will say e.g. "On Vercel set FIREBASE_SERVICE_ACCOUNT..." if that variable is missing.

3. **Redeploy** after adding or changing environment variables (Deployments → ⋮ → Redeploy).

---

## Option 3: Render (same env vars as above)

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

## Option 4: Fly.io

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

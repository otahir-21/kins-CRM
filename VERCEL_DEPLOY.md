# Deploy Kins-CRM to Vercel

No code changes needed — push your repo and set environment variables.

---

## 1. Connect repo (if not already)

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import your **Kins-CRM** GitHub repo.
3. Vercel will use **Root Directory**: `.` and detect the build from `vercel.json`.

---

## 2. Build & output (already configured)

Your `vercel.json` already has:

- **Build command:** `npm install && npm run build` (installs root deps + builds frontend).
- **Output directory:** `frontend/dist` (served as the CRM UI).
- **Rewrites:** `/api/*`, `/auth/*`, `/health` → handled by the Node serverless function (`api/index.js`).

You don’t need to change these unless you want a different setup.

---

## 3. Environment variables (required)

In Vercel: **Project → Settings → Environment Variables**. Add:

| Variable       | Required | Example / notes |
|----------------|----------|------------------|
| **MONGODB_URI** | ✅ Yes   | Your Atlas connection string. Must include the **database name** in the path, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/kins-crm?retryWrites=true&w=majority&appName=Kins` |
| **JWT_SECRET**  | ✅ Yes   | Long random string, **at least 32 characters** (e.g. `openssl rand -base64 32`). Used for login tokens and API v1. |

For each variable:

- **Key** = name (e.g. `MONGODB_URI`).
- **Value** = your secret (paste the full MongoDB URI; no quotes).
- **Environments** = at least **Production** (and Preview if you use preview deploys).

Then **Save**.

---

## 4. MongoDB Atlas (so Vercel can connect)

1. [MongoDB Atlas](https://cloud.mongodb.com) → your project → **Network Access**.
2. **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`).
3. Save. Without this, Vercel’s servers cannot reach your cluster.

---

## 5. Optional variables

| Variable | When to add |
|----------|-------------|
| **TWILIO_ACCOUNT_SID** | Only if you use **Send OTP / Verify OTP** (`/auth/send-otp`, `/auth/verify-otp`). |
| **TWILIO_AUTH_TOKEN** | Same as above. |
| **TWILIO_VERIFY_SERVICE_SID** | Same (starts with `VA...`). |
| **JWT_EXPIRES_IN** | Optional. Default `7d`. e.g. `24h` if you want shorter-lived tokens. |
| **BUNNY_*** | Only if you use onboarding image upload (Bunny CDN). |

Firebase is not used; no Firebase env vars are needed.

---

## 6. Deploy

1. Push to the branch Vercel watches (e.g. `main`), or click **Redeploy** in the Vercel dashboard.
2. If you **just added or changed env vars**, use **Deployments** → ⋮ on the latest deployment → **Redeploy** (so the new values are used).

---

## 7. After deploy

- **CRM dashboard:** `https://your-project.vercel.app`
- **Health:** `https://your-project.vercel.app/health`
- **API (e.g. interests):** `https://your-project.vercel.app/api/interests`
- **API v1 (mobile):** `https://your-project.vercel.app/api/v1`

If the Interests page times out or errors, check that **MONGODB_URI** is set correctly and that Atlas allows `0.0.0.0/0`. Then redeploy.

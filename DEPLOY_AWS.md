# Deploy Kins-CRM to AWS

Run the backend (API) on AWS so you can use the auth API and the rest from a public URL.

---

## Quick health check

After the app is running on your EC2 (e.g. `http://16.16.96.232`), point the frontend and scripts to that URL:

- **Frontend:** Set `VITE_API_URL=http://16.16.96.232` (or your EC2 public IP/DNS) in your frontend build env.
- **Scripts/tests:** `BASE_URL=http://16.16.96.232` (or use `API_BASE_URL` where applicable).

Verify the API is up:

```bash
curl http://16.16.96.232/health
```

You should get a JSON response (e.g. `{"ok":true}` or similar). If you get "Connection refused", the Node process is not listening on that host/port or the security group is blocking inbound traffic.

### "Endpoint not found" in the CRM UI

If the dashboard loads but a page shows **"Endpoint not found"** and **Retry**:

1. **Cause:** The API returned 404 — the request path did not match any route on the server.
2. **Check:** In the browser open **Developer Tools → Network**. Find the failed request and look at:
   - **Request URL** (e.g. `http://16.16.96.232/api/interests`)
   - **Response** body (the server sends `{ error: 'Endpoint not found', method, path, hint }`).
3. **Fix:**
   - **Same-origin:** The server must serve the built frontend so the UI and API share the same origin. In the deploy workflow we run `npm run build` so `frontend/dist` exists; then `npm start` serves both. If you deploy without building, there is no `frontend/dist`, so GET `/` and all UI routes hit the 404 handler. **Fix:** Run `npm run build` on the server (or in CI) before starting the app.
   - **Separate frontend:** If the CRM UI is hosted elsewhere (e.g. Vercel, another domain), build it with **`VITE_API_URL=http://16.16.96.232`** (or your API URL) so all API requests go to your EC2 API. Without this, the built app may send requests to the wrong host and get 404.
4. **Verify backend:** On the server run `curl http://localhost:3000/health` and `curl http://localhost:3000/api/interests` (or the path that failed). If these work locally but the browser gets 404, the browser is likely hitting a different host or path (check Network tab URL).
5. **404 with path `/api/api/...`:** The frontend was built with `VITE_API_URL=/api`. That makes axios request `/api` + `/api/interests` = `/api/api/interests`. **Fix:** Rebuild without setting `VITE_API_URL`, or set it to the full API origin (e.g. `http://16.16.96.232`). For same-origin (UI and API on one server), leave `VITE_API_URL` unset when running `npm run build`.

---

## Option A: One Node app (API + optional static frontend)

**Single deployment:** One Node/Express process serves the API. You can serve the built frontend from the same origin or a separate CDN/S3 bucket.

### 1. Compute

- **EC2**, **ECS (Fargate)**, or **Lambda + API Gateway** (for serverless).
- **Runtime:** Node.js 18+ (or 20 LTS).
- **Suggested:** One EC2/ECS task or one Lambda + API Gateway REST API. Frontend can be the same service (proxy to API) or a separate **S3 + CloudFront** static site.

### 2. Environment variables (set on the host)

Use **AWS Systems Manager → Parameter Store** (or Lambda environment config, or `.env` in a secure build):

| Parameter / Secret name | Required | Example / notes |
|---------------------------|----------|------------------|
| **FIREBASE_PROJECT_ID** | ✅ | Your Firebase project ID (e.g. `kins-b4afb`) |
| **FIREBASE_STORAGE_BUCKET** | ✅ | Firebase Storage bucket name (if you use it) |
| **FIREBASE_SERVICE_ACCOUNT** | ✅ | Full JSON of the Firebase service account key (e.g. from **Parameter Store** as a SecureString, or inject at deploy from Secrets Manager). |
| **MONGODB_URI** or **ATLAS_URI** | ✅ | Connection string; must include DB name (e.g. `…/kins?retryWrites=true&w=majority`) |
| **JWT_SECRET** | ✅ | Min 32 characters (e.g. random base64). For login tokens and API v1. |
| **TWILIO_ACCOUNT_SID** | If using SMS / Verify | Your Twilio Account SID |
| **TWILIO_AUTH_TOKEN** | If using SMS / Verify | Your Twilio Auth Token |
| **TWILIO_VERIFY_SERVICE_SID** | If using Verify | Verify service SID (starts with `VA…`) |

**Optional:**

- **BUNNY_STORAGE_ZONE** — Bunny Storage zone name (if you use onboarding uploads).
- **BUNNY_ACCESS_KEY** — Bunny API key.
- **BUNNY_CDN_URL** — CDN host (e.g. `https://kins-crm.b-cdn.net`).
- **PORT** — Often auto-set by the host (e.g. `8080`); set only if needed.
- **NODE_ENV** — `production` (recommended).

### 3. Build & start

- **Build:** `npm install` (and optionally `npm run build` if you prebuild the frontend).
- **Start:** `node server.js` or `node api/index.js` (depending on your entry in `package.json`).
- **Health:** Expose a **health check** path (e.g. `/health`) so the platform can call it.

### 4. Networking (load balancer / HTTPS)

- Put the Node app behind **Application Load Balancer (ALB)** or in front of **CloudFront**.
- **HTTPS:** Terminate TLS at ALB/CloudFront or at the Node app (with certificate in AWS ACM or on the server).
- **Custom domain (optional):** e.g. `api.kins.example.com` → CNAME to ALB/CloudFront.

### 5. Database (Atlas on AWS)

- **Network:** In **MongoDB Atlas** → Network Access → **Add IP Address**.
- Add the **VPC CIDR** of your ECS/EC2 tasks, or use **Peering** if your Atlas project is in the same cloud. For “allow from anywhere” use `0.0.0.0/0` only in dev/staging, not production.
- **Backups:** Prefer **Atlas continuous backup**; point-in-time restore is optional.

### 6. Secrets

- Prefer **AWS Secrets Manager** (or Parameter Store SecureString) for `FIREBASE_SERVICE_ACCOUNT`, `JWT_SECRET`, and Twilio tokens.
- **No secrets in repo:** Never commit real values; reference by name in code and inject at deploy.

---

## Quick start (summary)

1. **Push** repo to GitHub.
2. **AWS:** Create **EC2** (or **ECS** / **App Runner**) or **Lambda + API Gateway**; Node 18+.
3. **Parameter Store / Secrets Manager:** Add `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT`, `MONGODB_URI` (or `ATLAS_URI`), `JWT_SECRET`, and Twilio vars if used.
4. **Security group / IAM:** Allow inbound 80/443 (or your PORT); IAM role for Secrets Manager (and MongoDB access if same VPC).
5. **Start command:** `npm install && node server.js` (or as in `package.json`).
6. **Health:** Ensure `/health` returns 200 so the platform marks the deploy OK.
7. **Frontend (optional):** Build (e.g. `npm run build` → `frontend/dist`) and host on **S3 + CloudFront** or same origin; set `VITE_API_URL` (or equivalent) to your API base URL.

After deploy, **test auth** with:

```bash
BASE_URL=https://your-api.example.com node test-auth-api.js +441234567890
BASE_URL=https://your-api.example.com node test-auth-api.js +441234567890 123456
```

---

## EC2 shows no data (same MongoDB as Vercel)

If the **same MongoDB (Atlas)** works on Vercel but on EC2 the CRM and app show **no data** (empty lists, zero stats):

### 1. **MONGODB_URI not set or wrong on EC2**

On EC2 the app loads env from a **`.env`** file in the project root (or from system/PM2 env). If `MONGODB_URI` is missing, the code falls back to `mongodb://localhost:27017/kins-crm`. The app then talks to MongoDB on the EC2 instance (often empty or not running), not Atlas.

**Fix:**

- SSH into EC2 and create or edit `.env` in the app directory (e.g. `/home/ubuntu/kins-CRM/.env`).
- Set **exactly the same** `MONGODB_URI` you use on Vercel (copy from Vercel → Settings → Environment Variables).
  ```bash
  # Example – use your real Atlas URI
  MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/kins?retryWrites=true&w=majority&appName=Kins
  ```
- Restart the app: `pm2 restart kins-api` (or your process name).
- Reload the CRM; data should appear.

**Check that it’s set:**

```bash
cd /home/ubuntu/kins-CRM
node -e "require('dotenv').config(); console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET (length ' + process.env.MONGODB_URI.length + ')' : 'NOT SET');"
```

If you see `NOT SET`, the app is using the default (localhost) and will show no data until you add the Atlas URI to `.env` and restart.

### 2. **Atlas Network Access blocking EC2**

Atlas only allows connections from IPs (or CIDRs) you add in **Network Access**. Vercel’s IPs may be allowed; EC2’s public IP might not be.

**Fix:**

- In **MongoDB Atlas** → your project → **Network Access** → **Add IP Address**.
- Either add your **EC2 instance’s public IP**, or (for testing) **Allow Access from Anywhere** `0.0.0.0/0`.
- Save and wait a minute; then restart the app on EC2 and try again.

If the URI is correct but the connection is blocked, the app returns **503** and “Database connection unavailable” (and the server logs will show a MongoDB connection error). If you see **200** but empty data, the URI is almost certainly wrong or not loaded (so the app is using localhost).

### 3. **Summary**

| Symptom | Likely cause | Action |
|--------|---------------|--------|
| 200 OK but empty lists / no data | `MONGODB_URI` not set or wrong on EC2 | Set same Atlas `MONGODB_URI` as Vercel in `.env`, restart app |
| 503 “Database connection unavailable” | Atlas blocking EC2 IP or wrong URI | Add EC2 IP (or 0.0.0.0/0) in Atlas Network Access; confirm URI |
| Same as Vercel | Env and Atlas access correct | — |

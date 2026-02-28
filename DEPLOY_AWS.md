# Deploy Kins-CRM to AWS

Run the backend (API) on AWS so you can use the auth API and the rest from a public URL.

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

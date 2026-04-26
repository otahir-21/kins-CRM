# Mobile app API — base URL and endpoints

Use this **base URL** and these **paths** in your mobile app. All data is stored in **MongoDB**; auth uses **JWT** (no Firebase on the backend).

**Production hosting:** This team deploys the API on **AWS** (EC2, ALB, CloudFront, etc.). See **`DEPLOY_AWS.md`** for compute, TLS, and security groups. The examples below use **`https://api.yourdomain.com`** only as a placeholder — substitute your real public API origin (for example the HTTPS URL of your load balancer or custom domain).

---

## Base URL

- **Local:** `http://localhost:3000`
- **Production (AWS):** `https://<your-public-api-host>` — no trailing slash; must be reachable from phones (inbound 443 on ALB/EC2, valid TLS certificate for that hostname).

**API v1 prefix:** append `/api/v1` to the base URL.

**Full base URL for the mobile app:**

| Environment | Base URL (use this in the app) |
|-------------|---------------------------------|
| Local       | `http://localhost:3000/api/v1`  |
| Production  | `https://api.yourdomain.com/api/v1` *(replace with your AWS public URL + `/api/v1`)* |

**Example production base (after you substitute your host):**  
**`https://api.yourdomain.com/api/v1`**

### Flutter app: `API_V1_BASE_URL` vs `API_BASE_URL` (EC2 / AWS)

This backend mounts **mobile (JWT) APIs** under **`/api/v1`** (see `server.js`). Legacy CRM JSON lives under **`/api/...`**. Twilio OTP (if you use the root `auth-routes`) is under **`/auth/...`** — not under `/api/v1`.

| Compile-time constant | Must be | Notes |
|----------------------|---------|--------|
| **`API_V1_BASE_URL`** | `{origin}/api/v1` | Example: `http://16.16.96.232/api/v1`. Paths in code are like `/auth/login` → full URL `…/api/v1/auth/login`. **No trailing slash** after `v1`. |
| **`API_BASE_URL`** | `{origin}/api` | Example: `http://16.16.96.232/api` for `/api/users`, `/api/statistics`, etc. Use the **same host and port** as v1. |

**Critical — port:** `http://16.16.96.232` means **port 80**. The Node app defaults to **`PORT=3000`** behind the scenes; production EC2 often uses **nginx on 80 → 3000** (see **`deploy/ec2-nginx-kins.conf.example`**). From the internet, **`curl http://<ip>/health`** may work while **`:3000` times out** if the security group only allows **80** — then use **`http://<ip>/api/v1`** (no port). If **3000** is open and you do not use nginx, use **`http://<ip>:3000/api/v1`** for both constants.

### iOS ATS, TLS, and where config lives

- **This repo** is the **backend API only** — there is **no** `ios/Runner/Info.plist` here. **ATS** (App Transport Security) is configured in your **Flutter** project: **`ios/Runner/Info.plist`** (or build settings in Xcode).
- **`API_V1_BASE_URL`** defaults (e.g. **`http://16.16.96.232/api/v1`**) use **port 80** on the path; you only add **`:3000`** if you put it in the URL string. The HTTP client then calls **`/auth/login`**, **`/me`**, etc. on that base.
- **Reachability test:** The app might **not** call **`/api/v1/health`** for you. On the **same iPhone**, open Safari to **`http://<your-host>/api/v1/health`** (same host as in `API_V1_BASE_URL`). That confirms the device can reach **nginx/API** over HTTP.
- **Three different failure types:**
  1. **`secureConnect` / connection timeout** — TLS or TCP never completed (wrong host, **`https://`** when only **HTTP** is served, firewall, etc.). **Not** a JSON body from this API.
  2. **`GET …/api/v1/health` → `{"ok":true}`** — network path to the API works; it does **not** prove **MongoDB** is connected.
  3. **`POST …/auth/login` → 5xx / “Database connection unavailable”** — server reached you, but **Atlas / `MONGODB_URI` / IP whitelist** (or similar) is wrong; health can still be **200**.
- **ATS without exceptions:** Apple’s default often **blocks cleartext HTTP** to non-local hosts. For **dev**, a **narrow** `NSAppTransportSecurity` exception for your API host is common. For **production**, prefer **HTTPS + a domain** (e.g. ALB + ACM), not a bare IP.
- **When reporting an error**, include: **HTTP status**, **response body** (if any), and the **exact** `API_V1_BASE_URL` / **`--dart-define`** / Xcode scheme used for that build — that separates **network/TLS** from **DB / 503**.

**“Why does it show …?” (common):** Opening **`/api-info`** or a wrong path returns **JSON** (API discovery or `Endpoint not found`). Opening **`/`** with a built CRM returns the **React SPA**. If the app or browser “looks wrong”, compare the **exact URL** and **port** to the table above.

---

## Endpoints (append to base URL)

All paths below are relative to **`/api/v1`**.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/health` | No  | Liveness; use from the device browser to confirm the app base URL is reachable (TLS/network), separate from Firebase OTP. |
| POST   | `/auth/login` | No  | Login/register; returns JWT and user. |
| GET    | `/me` | JWT | Current user profile. |
| PUT    | `/me/about` | JWT | Update profile (About You). |
| DELETE | `/me` | JWT | Delete account. |
| GET    | `/me/interests` | JWT | Get my interests. |
| POST   | `/me/interests` | JWT | Set my interests (replace list). |
| GET    | `/interests` | No  | Master list of active interests. |
| POST   | `/interests` | JWT | Create interest (admin). |
| PUT    | `/interests/:id` | JWT | Update interest. |
| DELETE | `/interests/:id` | JWT | Soft-delete interest. |
| POST   | `/posts` | JWT | Create post (text/image/video/poll). |
| GET    | `/posts/:id` | JWT | Get single post. |
| DELETE | `/posts/:id` | JWT | Delete post. |
| GET    | `/feed` | JWT | Get personalized feed (paginated). |

---

## Full URLs (example host; swap for your AWS URL)

**Production base:** `https://api.yourdomain.com/api/v1`

**Concrete endpoints (production):**

```
GET    https://api.yourdomain.com/api/v1/health
POST   https://api.yourdomain.com/api/v1/auth/login
GET    https://api.yourdomain.com/api/v1/me
PUT    https://api.yourdomain.com/api/v1/me/about
DELETE https://api.yourdomain.com/api/v1/me
GET    https://api.yourdomain.com/api/v1/me/interests
POST   https://api.yourdomain.com/api/v1/me/interests
GET    https://api.yourdomain.com/api/v1/interests
POST   https://api.yourdomain.com/api/v1/interests
PUT    https://api.yourdomain.com/api/v1/interests/:id
DELETE https://api.yourdomain.com/api/v1/interests/:id
POST   https://api.yourdomain.com/api/v1/posts
GET    https://api.yourdomain.com/api/v1/posts/:id
DELETE https://api.yourdomain.com/api/v1/posts/:id
GET    https://api.yourdomain.com/api/v1/feed?page=1&limit=20
```

**Auth header for protected routes:**  
`Authorization: Bearer <JWT>`  
(JWT is returned in the `token` field from `POST /api/v1/auth/login`.)

---

## Quick reference

- **Production base URL for mobile (AWS):** `https://api.yourdomain.com/api/v1` — use your real HTTPS origin from ALB / CloudFront / EC2 (see `DEPLOY_AWS.md`).
- **Login:** `POST https://api.yourdomain.com/api/v1/auth/login` → get `token` and `user`
- **Protected requests:** header `Authorization: Bearer {token}`
- **Docs:** See `API_V1.md` for request/response bodies and validation.

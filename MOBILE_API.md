# Mobile app API — base URL and endpoints

Use this **base URL** and these **paths** in your Cursor mobile app. All data is stored in **MongoDB**; auth uses **JWT** (no Firebase on the backend).

---

## Base URL

- **Local:** `http://localhost:3000`
- **Production:** Your deployed backend root (e.g. `https://your-app.vercel.app`)

**API v1 prefix:** append `/api/v1` to the base URL.

**Full base URL for the mobile app:**

| Environment | Base URL (use this in the app) |
|-------------|---------------------------------|
| Local       | `http://localhost:3000/api/v1`  |
| Production  | `https://YOUR_DOMAIN/api/v1`   |

Example: if your backend is at `https://kins-api.vercel.app`, use  
**`https://kins-api.vercel.app/api/v1`** as the base URL.

---

## Endpoints (append to base URL)

All paths below are relative to **`/api/v1`**.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/auth/login` | No  | Login/register; returns JWT and user. |
| GET    | `/me` | JWT | Current user profile. |
| PUT    | `/me/about` | JWT | Update profile (About You). |
| GET    | `/me/interests` | JWT | Get my interests. |
| POST   | `/me/interests` | JWT | Set my interests (replace list). |
| GET    | `/interests` | No  | Master list of active interests. |
| POST   | `/interests` | JWT | Create interest (admin). |
| PUT    | `/interests/:id` | JWT | Update interest. |
| DELETE | `/interests/:id` | JWT | Soft-delete interest. |

---

## Full URLs to pass to Cursor mobile app

Replace `BASE_URL` with your actual backend root (e.g. `https://your-app.vercel.app`).

```
BASE_URL/api/v1
```

**Concrete endpoints:**

```
POST   BASE_URL/api/v1/auth/login
GET    BASE_URL/api/v1/me
PUT    BASE_URL/api/v1/me/about
GET    BASE_URL/api/v1/me/interests
POST   BASE_URL/api/v1/me/interests
GET    BASE_URL/api/v1/interests
POST   BASE_URL/api/v1/interests
PUT    BASE_URL/api/v1/interests/:id
DELETE BASE_URL/api/v1/interests/:id
```

**Auth header for protected routes:**  
`Authorization: Bearer <JWT>`  
(JWT is returned in the `token` field from `POST /api/v1/auth/login`.)

---

## Quick reference

- **Base URL for mobile:** `{BACKEND_ROOT}/api/v1`
- **Login:** `POST {BASE}/auth/login` → get `token` and `user`
- **Protected requests:** header `Authorization: Bearer {token}`
- **Docs:** See `API_V1.md` for request/response bodies and validation.

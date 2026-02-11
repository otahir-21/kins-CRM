# Mobile app API — base URL and endpoints

Use this **base URL** and these **paths** in your Cursor mobile app. All data is stored in **MongoDB**; auth uses **JWT** (no Firebase on the backend).

---

## Base URL

- **Local:** `http://localhost:3000`
- **Production:** `https://kins-crm.vercel.app` (Vercel domain)

**API v1 prefix:** append `/api/v1` to the base URL.

**Full base URL for the mobile app:**

| Environment | Base URL (use this in the app) |
|-------------|---------------------------------|
| Local       | `http://localhost:3000/api/v1`  |
| Production  | `https://kins-crm.vercel.app/api/v1` |

**Production base URL for Cursor mobile app:**  
**`https://kins-crm.vercel.app/api/v1`**

---

## Endpoints (append to base URL)

All paths below are relative to **`/api/v1`**.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
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

## Full URLs to pass to Cursor mobile app

**Production base:** `https://kins-crm.vercel.app/api/v1`

**Concrete endpoints (production):**

```
POST   https://kins-crm.vercel.app/api/v1/auth/login
GET    https://kins-crm.vercel.app/api/v1/me
PUT    https://kins-crm.vercel.app/api/v1/me/about
DELETE https://kins-crm.vercel.app/api/v1/me
GET    https://kins-crm.vercel.app/api/v1/me/interests
POST   https://kins-crm.vercel.app/api/v1/me/interests
GET    https://kins-crm.vercel.app/api/v1/interests
POST   https://kins-crm.vercel.app/api/v1/interests
PUT    https://kins-crm.vercel.app/api/v1/interests/:id
DELETE https://kins-crm.vercel.app/api/v1/interests/:id
POST   https://kins-crm.vercel.app/api/v1/posts
GET    https://kins-crm.vercel.app/api/v1/posts/:id
DELETE https://kins-crm.vercel.app/api/v1/posts/:id
GET    https://kins-crm.vercel.app/api/v1/feed?page=1&limit=20
```

**Auth header for protected routes:**  
`Authorization: Bearer <JWT>`  
(JWT is returned in the `token` field from `POST /api/v1/auth/login`.)

---

## Quick reference

- **Production base URL for mobile:** `https://kins-crm.vercel.app/api/v1`
- **Login:** `POST https://kins-crm.vercel.app/api/v1/auth/login` → get `token` and `user`
- **Protected requests:** header `Authorization: Bearer {token}`
- **Docs:** See `API_V1.md` for request/response bodies and validation.

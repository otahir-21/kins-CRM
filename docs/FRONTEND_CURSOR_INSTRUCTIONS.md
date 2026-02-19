# Frontend – Cursor instructions

Instructions for working on the **React (Vite) frontend** in this repo with Cursor.

---

## 1. Where the frontend lives

- **Root:** `frontend/`
- **Source:** `frontend/src/`
- **Entry:** `frontend/src/main.jsx` → mounts `App.jsx`
- **Routes:** `frontend/src/App.jsx`
- **API client:** `frontend/src/utils/api.js` (`apiService`)
- **Auth (demo):** `frontend/src/utils/auth.js` (hardcoded admin; production may use `/api/v1/auth/login` + JWT)

---

## 2. How to run the frontend

```bash
cd frontend
npm install
npm run dev
```

- Dev server: **http://localhost:5173**
- Vite proxies `/api` to **http://localhost:3000** (see `frontend/vite.config.js`), so you need the **backend running on port 3000** for API calls to work in dev.

---

## 3. API base URL

- **Dev:** No env needed. `VITE_API_URL` is unset, so the client uses same origin; Vite proxies `/api` to `http://localhost:3000`.
- **Production / separate frontend:** Set `VITE_API_URL` to the full API base (e.g. `https://your-api.vercel.app`). Then all requests go to that base; no proxy.

Defined in `frontend/src/utils/api.js`:

```js
const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3000');
```

---

## 4. Two API surfaces

| Surface | Prefix | Auth | Use in frontend |
|--------|--------|------|------------------|
| **Legacy / dashboard** | `/api/...` | None (or custom) | Users, surveys, onboarding, posts moderation, notifications, interests, upload, etc. Already in `api.js`. |
| **App API (v1)** | `/api/v1/...` | JWT required | Auth, me, feed, posts (create/delete), groups, follow, user search, Firebase token. Add methods in `api.js` under `/api/v1` and send `Authorization: Bearer <token>`. |

For **new app-style features** (feed, groups, profile, chat token), use **`/api/v1`** and attach the JWT from login (e.g. store token after `POST /api/v1/auth/login`, send in `Authorization` header). Existing `apiService` in `api.js` is mostly legacy `/api/...`; extend it with v1 methods and an axios interceptor to add the token when present.

---

## 5. Main routes (App.jsx)

- `/splash` – SplashScreen  
- `/login` – Login  
- `/dashboard` – Dashboard  
- `/users`, `/users/:userId`, `/users/:userId/notifications` – Users, UserDetail, Notifications  
- `/documents` – Documents  
- `/interests` – Interests  
- `/surveys`, `/surveys/:surveyId/analytics` – Surveys, SurveyAnalytics  
- `/posts-moderation` – PostsModeration  
- `/onboarding` – Onboarding  
- `/groups` – Groups list  
- `/groups/:groupId/chat` – GroupChat  
- `/analytics` – Analytics  
- `/settings` – Settings  

Protected routes are wrapped in `ProtectedRoute` and `Layout` (sidebar + outlet). Ensure `Groups` and `GroupChat` are **imported** in `App.jsx` if those routes are used.

---

## 6. Stack

- **React 18**, **React Router 6**, **Vite 5**
- **Tailwind CSS** (via PostCSS)
- **Axios** for API calls
- **Lucide React** for icons
- **Recharts** for charts (e.g. Analytics)

---

## 7. Checklist when adding a new feature

1. **API:** Add a function in `frontend/src/utils/api.js` (either under existing `apiService` for `/api/...`, or new methods for `/api/v1/...`). If v1, ensure the request sends `Authorization: Bearer <token>` (e.g. interceptor that reads token from storage).
2. **Route:** Add route in `frontend/src/App.jsx` (and nav link in `frontend/src/components/Sidebar.jsx` if needed).
3. **Component:** Create or edit components under `frontend/src/components/`.
4. **Auth:** For v1 endpoints, store JWT after login and attach it to axios (e.g. default header or interceptor); protect routes that require login via `ProtectedRoute` or equivalent.

---

## 8. File reference

| Purpose | Path |
|--------|------|
| App & routes | `frontend/src/App.jsx` |
| Sidebar / nav | `frontend/src/components/Sidebar.jsx` |
| API client | `frontend/src/utils/api.js` |
| Auth helpers | `frontend/src/utils/auth.js` |
| Layout (sidebar + outlet) | `frontend/src/components/Layout.jsx` |
| Protected wrapper | `frontend/src/components/ProtectedRoute.jsx` |
| Vite config (port, proxy) | `frontend/vite.config.js` |

Use this doc when asking Cursor to implement or change frontend behavior so it keeps the same run instructions, API base URL, and API versioning (legacy vs v1).

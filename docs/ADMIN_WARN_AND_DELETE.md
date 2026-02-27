# Admin: Send warning & delete user

Admins can **send a warning** to a user and/or **delete (deactivate)** the user from the CRM.

---

## 1. Send warning

**POST** `/api/users/:userId/warn`

**Body (JSON):**
- `message` (string, required) – Warning text the user sees in-app and in the push notification.
- `title` (string, optional) – Default: `"Warning from KINS"`.

**Behaviour:**
- Creates an **in-app notification** (stored in MongoDB). The user sees it in the app when they open the notifications screen (e.g. **GET /api/v1/me/notifications**).
- Sends a **push notification** (FCM) if the user has an FCM token. No token = in-app only.
- **Email:** Not implemented. To send warnings by email you would need to add an email provider (e.g. SendGrid, AWS SES, Nodemailer) and call it from the same handler, or send emails manually (e.g. from CRM or support tool).

**Response:** `200` with `{ success: true, message: "...", notificationId: "..." }`.

---

## 2. Delete (deactivate) user

**DELETE** `/api/users/:userId`

**Behaviour:**
- **Soft delete:** Sets `user.deletedAt = now`. The user **cannot log in** again (auth rejects users with `deletedAt` set). User data is kept for records.
- Does not remove posts, likes, or other related data.

**Response:** `200` with `{ success: true, message: "User has been deactivated...", data: user }`.

---

## 3. In-app notifications (for the app)

The app can show warnings (and other notifications) via:

- **GET /api/v1/me/notifications** – List notifications (optional query: `?limit=50`, `?unreadOnly=true`).
- **GET /api/v1/me/notifications/stats** – `{ total, unread }`.
- **PUT /api/v1/me/notifications/:notificationId/read** – Mark one as read.
- **PUT /api/v1/me/notifications/read-all** – Mark all as read.

Each notification has: `id`, `type` (e.g. `warning`), `title`, `body`, `senderName`, `read`, `timestamp`/`createdAt`.

---

## 4. CRM UI

On **User detail** (e.g. `/users/:userId`):

- **Send warning** – Opens modal: title (optional), message (required). Submits to **POST /api/users/:userId/warn**.
- **Delete user** – Confirm then **DELETE /api/users/:userId**. Button is disabled if user is already deactivated.
- **Warn & delete** – Sends a default warning (“Your account has been deactivated...”) then deactivates the user.

---

## 5. Email

**Sending warning by email** is not built in. Options:

1. **Manual:** Copy the user’s email from the CRM and send the warning from your normal support email.
2. **Automated:** Integrate an email provider in the backend (e.g. SendGrid, AWS SES). In the same handler that calls `sendNotification(userId, ...)`, add a call to your email service with `user.email` and the warning text. You will need an API key and a verified sender address.

If you want to add email, say which provider you use (or prefer) and we can wire it in.

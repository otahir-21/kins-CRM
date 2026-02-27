# Notifications via Firebase FCM

The backend uses **Firebase Cloud Messaging (FCM)** to send push notifications to the app when a notification is created (e.g. admin warning, or CRM “Send notification”).

---

## Flow

1. **App registers the FCM token** with the backend: **POST /api/v1/me/fcm-token** with body `{ "fcmToken": "<device token>" }`. The backend stores it on the user document.
2. **When a notification is sent** (e.g. POST /api/users/:userId/warn or POST /api/notifications/send):
   - A **Notification** document is created in MongoDB (for in-app list and history).
   - The user’s stored **FCM token** is read.
   - **Firebase Admin** `sendMulticast` is called with that token, so the device receives a **push** (tray notification) and an optional **data** payload.

---

## FCM payload

- **Notification (tray):** `title`, `body` – so the user sees title and message in the system tray.
- **Data (for app handling):** All values are strings.
  - `type` – e.g. `"warning"`, `"system"`.
  - `notificationId` – MongoDB notification id (for opening the right item in-app).
  - `senderName` – if present.
  - `relatedPostId` – if the notification is about a post.

The app can use `data.type` and `data.notificationId` (and optionally `relatedPostId`) to open the notifications screen or a specific notification when the user taps the push.

---

## Backend requirements

- **Firebase Admin SDK** is used (`services/firebaseAdmin.js`).
- Env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- If these are missing or invalid, FCM is skipped; the in-app notification is still stored and returned by **GET /api/v1/me/notifications**.

---

## App requirements

1. **Register token:** After FCM is initialized and the token is obtained, call **POST /api/v1/me/fcm-token** with the current token (and again when the token is refreshed).
2. **Handle push:** On message/tap, read `data.type` and `data.notificationId` (and optionally `data.relatedPostId`) to navigate to the notifications screen or the specific notification.
3. **In-app list:** Use **GET /api/v1/me/notifications** to show the list; push is only for alerting and deep link.

---

## Summary

| Backend                         | Role |
|---------------------------------|------|
| Store FCM token on user         | POST /api/v1/me/fcm-token |
| Create notification in MongoDB  | On warn / send notification |
| Send push via Firebase FCM      | Using stored token + Firebase Admin `sendMulticast` |

So notifications are sent **using Firebase FCM**; the token is stored by the backend and used whenever a notification is created for that user.

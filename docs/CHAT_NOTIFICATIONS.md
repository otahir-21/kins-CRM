# Chat notifications (FCM)

End-to-end flow for sending push notifications when a new chat message is created, and opening the correct 1:1 or group chat when the user taps the notification.

---

## 1. End-to-end flow

1. **Sender** writes the message to Firestore (`conversations/{id}/messages` or `groups/{id}/messages`).
2. **Server** sends FCM to recipient(s) with a **data** payload (and optionally **notification** for tray title/body).
3. **Recipient’s app** receives FCM; on **tap** (or cold start from notification), app reads the payload and navigates to the correct 1:1 or group chat screen.

The app already handles tap and cold start (navigator key, `FCMService`, `flushPendingNotificationTap`). The server must send the payload in the format below so the app can route correctly.

---

## 2. FCM token storage

- **Where:** Backend stores the token per user (e.g. MongoDB `User.fcmToken`). The app sends the token after login or when it changes (e.g. `POST /api/v1/me/fcm-token` with body `{ fcmToken }`).
- **Optional:** You can also store in Firestore `users/{userId}.fcmToken` and have a Cloud Function read it; this doc assumes the **backend** stores and looks up tokens so one place (your API) owns token lifecycle.
- When sending a chat notification, the server looks up FCM token(s) for the recipient user id(s) and calls FCM with those tokens.

---

## 3. Who sends FCM when a message is created

Two options:

| Option | How |
|--------|-----|
| **A. Cloud Function** | Firestore trigger on `conversations/{conversationId}/messages` and `groups/{groupId}/messages`. On create, function resolves recipient(s), reads their FCM token(s) from Firestore or your API, and sends the FCM payload below. |
| **B. Backend API** | After the **client** writes the message to Firestore, the client calls your backend (e.g. `POST /api/v1/chat/notify`) with sender info, message preview, and **recipientIds**. Backend looks up tokens for those ids and sends FCM. No Firestore trigger needed. |

This repo implements **Option B**: `POST /api/v1/chat/notify` (see server section below). You can add a Cloud Function later and stop calling the backend for notify if you prefer.

---

## 4. Payload format (so the app can open the right screen)

The app’s `_handleChatNotificationTap` and cold-start handling expect **data** fields as below. Send these in the FCM **data** map (and optionally a **notification** for title/body in the tray).

### 4.1 1:1 chat

- **type:** `chat_1_1`
- **conversationId:** string (Firestore conversation id)
- **senderId:** string (MongoDB user id of sender)
- **senderName:** string
- **senderProfilePicture:** string (URL, optional)
- **messagePreview:** string (e.g. first 100 chars of message)

Example **data** map:

```json
{
  "type": "chat_1_1",
  "conversationId": "conv_abc123",
  "senderId": "user_id_123",
  "senderName": "Jane",
  "senderProfilePicture": "https://...",
  "messagePreview": "Hey, see you tomorrow!"
}
```

### 4.2 Group chat

- **type:** `chat_group`
- **groupId:** string (Firestore or your group id)
- **groupName:** string
- **senderId:** string
- **senderName:** string
- **messagePreview:** string

Example **data** map:

```json
{
  "type": "chat_group",
  "groupId": "group_id_456",
  "groupName": "Family",
  "senderId": "user_id_123",
  "senderName": "Jane",
  "messagePreview": "Dinner at 7?"
}
```

Optional **notification** (tray):

- **title:** e.g. `"Jane"` (1:1) or `"Jane in Family"` (group)
- **body:** e.g. `messagePreview` or truncated text

---

## 5. Checklist

| Step | Owner | Done |
|------|--------|------|
| Store FCM token when app sends it | Backend | `POST /api/v1/me/fcm-token`, persist on `User` |
| Detect new message | App writes to Firestore | N/A (client writes) |
| Resolve recipients | App or Cloud Function | App sends `recipientIds` to backend for Option B |
| Send FCM with payload above | Backend or Cloud Function | `POST /api/v1/chat/notify` → backend sends FCM |
| Handle tap / cold start in app | App | Done (navigator key, FCMService, flushPendingNotificationTap) |

---

## 6. Server implementation (this repo)

- **Token storage:** `User.fcmToken` in MongoDB. App calls `POST /api/v1/me/fcm-token` with `{ fcmToken }` (JWT required).
- **Send FCM:** `POST /api/v1/chat/notify` (JWT required). Body:
  - **type:** `chat_1_1` | `chat_group`
  - **recipientIds:** string[] (MongoDB user ids to notify)
  - For 1:1: **conversationId**, **senderId**, **senderName**, **senderProfilePicture** (optional), **messagePreview**
  - For group: **groupId**, **groupName**, **senderId**, **senderName**, **messagePreview**

Backend looks up FCM tokens for `recipientIds` (and skips sender if present), then sends one FCM message per token with the **data** payload matching sections 4.1 or 4.2. Optional **notification** title/body can be added in the same request.

---

## 7. App: what to do

1. **After login (or when FCM token changes):**  
   `POST /api/v1/me/fcm-token` with header `Authorization: Bearer <JWT>` and body `{ "fcmToken": "<device FCM token>" }`.

2. **After writing a new message to Firestore (1:1):**  
   Call `POST /api/v1/chat/notify` with same auth and body:
   - `type: "chat_1_1"`
   - `recipientIds: [<other participant user id>]`
   - `senderId`, `senderName`, `senderProfilePicture` (optional), `messagePreview`
   - `conversationId`

3. **After writing a new message to Firestore (group):**  
   Same endpoint with:
   - `type: "chat_group"`
   - `recipientIds: [<all other member user ids>]` (or get from group doc)
   - `senderId`, `senderName`, `messagePreview`
   - `groupId`, `groupName`

The backend sends FCM to each recipient’s stored token(s); your existing tap and cold-start handling then open the correct screen.

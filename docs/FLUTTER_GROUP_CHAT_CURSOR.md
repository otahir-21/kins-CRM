# Flutter Group Chat – Cursor Instructions

Use this as the **exact instruction for Cursor** when implementing group chat in the Flutter app. Copy the "Cursor command" block into the chat.

---

## Backend (already done)

- **Auth:** User logs in with the existing backend (JWT). All group data (list, detail, members) comes from **GET /api/v1/groups** and **GET /api/v1/groups/:groupId**.
- **Firebase token:** Backend exposes **GET /api/v1/me/firebase-token** (with JWT). Response: `{ "success": true, "token": "<firebase-custom-token>" }`. The token’s UID = MongoDB user id (string). Use this only for Firebase (Firestore + Storage), not for other API calls.
- **Chat data:** Group chat messages and media live in **Firebase** (Firestore + Storage). The backend does not store or serve chat messages.

---

## Cursor command (copy this for Flutter)

```
Implement group chat in this Flutter app with Firebase.

1) Firebase setup
- Add dependencies: firebase_core, firebase_auth, cloud_firestore, firebase_storage.
- Initialize Firebase in main.dart (Firebase.initializeApp with the app’s Firebase config).
- When the user opens any chat screen (or app start if you have a “chat” section), call our backend GET /api/v1/me/firebase-token with the existing auth header (JWT). Then sign in to Firebase with signInWithCustomToken(auth, token). Store that the user is “signed in” to Firebase so we don’t call firebase-token on every screen. If token expires, call the backend again and sign in again.

2) Firestore structure for group chat
- Collection: groups (document id = backend group id from GET /api/v1/groups).
  - Subcollection: messages
    - Each document: senderId (string, same as backend user id / Firebase UID), type (string: "text" | "image" | "video" | "doc"), content (string, optional for text), mediaUrl (string, optional for image/video/doc), fileName (string, optional), createdAt (Timestamp), readBy (array of senderId strings, optional).
- Optional: groups/{groupId} document with lastMessage (map: senderId, content, createdAt) for list previews.

3) Sending messages
- Text: Add a document to groups/{groupId}/messages with senderId, type: "text", content: text, createdAt: now.
- Image / video / doc: First upload file to Firebase Storage under path chat/{groupId}/{timestamp}_{random}.{ext}. Get download URL. Then add document to groups/{groupId}/messages with senderId, type: "image"|"video"|"doc", mediaUrl: url, fileName: original name, createdAt: now. Optionally set content to caption if you support it.

4) Reading messages (real-time)
- Use Firestore snapshot listener on groups/{groupId}/messages ordered by createdAt. Display messages in a list; show sender name/avatar by resolving senderId to user (from backend GET /api/v1/users/:userId or from a local cache of group members from GET /api/v1/groups/:groupId).

5) Security rules (Firebase Console)
- Firestore: Allow read, write to groups/{groupId}/messages only if the user is in the group (you may need a groups/{groupId} doc with members: [uid1, uid2]). If the backend is the source of truth for membership, either mirror member list into a groups/{groupId} doc (e.g. on first message or via Cloud Function), or use a single rule that allows read/write if request.auth != null and document id is the group id (and trust backend to only show group list to members).
- Storage: Allow upload/read under chat/{groupId}/ only if request.auth != null (and optionally check group membership if you have it in Firestore).

6) UI
- Reuse the existing group chat screen: when user taps a group from the group list, navigate to the group chat screen with groupId. Show header (back, group avatar, name, description, Report, more). Show messages list (incoming left with avatar/name, outgoing right; support text, image, video, doc). Show input bar: emoji, text field, attachment (image/video/doc picker), send. For “Alina added Sarah” style system messages, add a message document with type: "system" and content: "Alina added Sarah Al Sharif" (and optionally handle in UI only, no Firestore if you don’t need to persist system messages).

7) Attachments
- Image: pick image, upload to Storage chat/{groupId}/{timestamp}.jpg, then add message with type "image", mediaUrl.
- Video: same with type "video".
- Doc: same with type "doc", store original fileName.

Do not call the backend for sending or loading chat messages; only use the backend for group list, group detail, and GET /me/firebase-token. All chat is Firebase.
```

---

## Summary for you

| What | Where |
|------|--------|
| Group list, group detail, members | Backend (GET /api/v1/groups, GET /api/v1/groups/:groupId) |
| Firebase identity for chat | Backend GET /api/v1/me/firebase-token → Flutter signInWithCustomToken |
| Chat messages (text, image, video, doc) | Firestore: groups/{groupId}/messages |
| Media files | Firebase Storage: chat/{groupId}/... |
| Real-time updates | Firestore snapshot listener on messages |

---

## Backend env (for Firebase token)

Backend needs these set so GET /me/firebase-token works:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (from Firebase service account JSON; keep newlines as `\n` in .env)

Flutter app uses its own Firebase config (google-services.json / FirebaseOptions) for initializeApp; the custom token from the backend only authenticates the user in Firebase so Firestore/Storage rules and data use the same user id as the backend.

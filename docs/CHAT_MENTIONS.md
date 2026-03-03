# @Mentions in group chat

Backend support for tagging users in chat (e.g. "hi @jawaher") with a dropdown of suggested users when the user types `@`.

---

## Frontend instructions (step-by-step)

Use these steps in your **app frontend** (e.g. Flutter) to implement “tag user in group chat”.

### 1. Auth

- All requests to `GET /api/v1/users/mention-suggestions` must include the user’s **JWT** in the `Authorization` header:  
  `Authorization: Bearer <accessToken>`

### 2. When to show the mention dropdown

- In the chat input, **watch the text** for the character `@`.
- When the user types `@`, show a dropdown/list of suggested users.
- **Query after `@`:**  
  - If the user types `@` only → treat query as empty (show initial list).  
  - If the user types `@ja` → query is `ja`.  
  - If the user types `@` then a space or another `@` → close the dropdown (or treat as new `@` and reset query).

### 3. Call the API for suggestions

- **Endpoint:** `GET /api/v1/users/mention-suggestions`
- **Query params:**
  - `q` = string after `@` (e.g. `ja` for `@ja`). Omit or empty for “first N users”.
  - `limit` = number (default 15, max 30).
  - `groupId` = **current group chat ID** (required for group chat so only **group members** are suggested).

**Examples:**

- User in group chat, types `@`:  
  `GET /api/v1/users/mention-suggestions?limit=20&groupId=<currentGroupId>`
- User types `@ja` in same group:  
  `GET /api/v1/users/mention-suggestions?q=ja&limit=10&groupId=<currentGroupId>`

**Response:**  
`{ "success": true, "users": [ { "id", "name", "username", "displayName", "profilePictureUrl" }, ... ] }`

- Use **`username`** for the text you insert (e.g. `@jawaher`).
- Use **`id`** when saving `mentionedUserIds` on the message.

### 4. Dropdown UI and selection

- Show a list below (or above) the input with the `users` from the API.
- Each row: avatar (optional), **displayName** or **username**.
- **On tap:**  
  - Insert `@<username>` into the input at the cursor (replace the current `@query` segment).  
  - Optionally keep a list of selected **user ids** for this message (for Firestore and notifications).  
  - Close the dropdown.

- **Debounce:** Wait ~200–300 ms after the user stops typing after `@` before calling the API, to avoid too many requests.

### 5. Sending the message (Firestore)

- When the user sends the message, write to your chat collection (e.g. `groups/{groupId}/messages`) a document with at least:
  - `text`: full message string, e.g. `"hi @jawaher, check this"`
  - `senderId`: current user id
  - `createdAt`: timestamp
  - **`mentionedUserIds`**: array of user ids that were tagged, e.g. `["userId1"]`
  - Optionally **`mentionedUsernames`**: `["jawaher"]` for easier display/parsing

### 6. Displaying messages

- When rendering a message, parse `text` for segments like `@username`.
- You can use `mentionedUsernames` (if stored) or `mentionedUserIds` + your user cache to know which segments are mentions.
- Render those segments as **tappable** (e.g. different color, open profile on tap).

### 7. Notify mentioned users (optional)

- After writing the message to Firestore, call:  
  **`POST /api/v1/chat/notify`**  
  with body including:
  - `type`: `"chat_group"`
  - `recipientIds`: array of **mentioned user ids** (and optionally others you want to notify)
  - `groupId`, `groupName`, `senderId`, `senderName`, `messagePreview`, etc.  
- So mentioned users get a push like “X mentioned you in Group Name”.

---

## Backend API

### GET /api/v1/users/mention-suggestions

Returns users the **current user follows** that match the query (for dropdown when typing after `@`).

**Query params:**

| Param   | Required | Description |
|--------|----------|-------------|
| `q`    | No       | Search string (username or name). Empty = return first N followed users. |
| `limit`| No       | Max results (default 15, max 30). |
| `groupId` | No    | If set, only return users who are **also members** of this group (so in group chat you only suggest people in the group). |

**Example:** User types `@ja` in group chat → call  
`GET /api/v1/users/mention-suggestions?q=ja&limit=10&groupId=<currentGroupId>`

**Response:** `{ success: true, users: [ { id, name, username, displayName, profilePictureUrl }, ... ] }`

- Use `username` for the inserted text (`@jawaher`).
- Use `id` when storing `mentionedUserIds` on the message for notifications or linking.

## App flow (Flutter)

1. **Detect `@`**  
   When the user types `@`, show a dropdown and call:
   - `GET /api/v1/users/mention-suggestions?limit=20` (empty `q`) for initial list, or
   - `GET /api/v1/users/mention-suggestions?q=ja&limit=10&groupId=<groupId>` when they type `@ja` in a group.

2. **Dropdown**  
   Render `users` from the response (e.g. avatar + displayName/username). On select, insert `@<username>` into the input and optionally keep a list of selected `userId` for the message.

3. **Sending the message**  
   Chat messages are stored in **Firestore** by the app. In the message document you can store:
   - `text`: "hi @jawaher"
   - `mentionedUserIds`: `["<userId>"]` (so you can highlight/link or notify them)
   - Optionally `mentionedUsernames`: `["jawaher"]` for display.

4. **Display**  
   When rendering a message, parse `text` for `@username` and render those segments as tappable (e.g. open profile). You can match usernames from `mentionedUsernames` or resolve from `mentionedUserIds` via your user cache.

5. **Notify mentioned users (optional)**  
   After writing the message to Firestore, call your existing  
   `POST /api/v1/chat/notify`  
   with `recipientIds` including the mentioned user IDs so they get a push (e.g. "X mentioned you in …").

## Summary

- **Suggestions:** `GET /api/v1/users/mention-suggestions?q=...&groupId=...` (users I follow, optionally in group).
- **Message content:** Store `text` + `mentionedUserIds` (and optionally `mentionedUsernames`) in Firestore.
- **Notifications:** Use existing chat notify endpoint with mentioned users in `recipientIds`.

# @Mentions in group chat

Backend support for tagging users in chat (e.g. "hi @jawaher") with a dropdown of suggested users when the user types `@`.

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

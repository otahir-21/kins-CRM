# Update group settings (including image)

## Recommended: upload image only via POST (Flutter / mobile)

**Use this when updating the group image** – POST + multipart is reliable and avoids PUT body issues.

### `POST /api/v1/groups/:groupId/avatar`

- **Auth:** `Authorization: Bearer <token>` (group admin only).
- **Content-Type:** `multipart/form-data`.
- **Body:** One field **`image`** (file). No other fields needed.
- **Response:** `200` with `{ success, group: { id, name, description, type, memberCount, imageUrl } }`.

**Flutter:** Call this endpoint when the user picks an image. Use field name **`image`**. Then call `PUT /groups/:groupId` for name/description/type only (no file).

---

## Optional: update everything in one request (PUT)

### `PUT /api/v1/groups/:groupId`

- **Auth:** `Authorization: Bearer <token>` (group admin only).
- **Content-Type:** Must be **`multipart/form-data`** if you send a file. Many clients/proxies do not support PUT with a body; if you get `imageUrl: null` after sending an image, use **POST .../avatar** instead.

## Form fields

| Field        | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| `name`      | string | no       | New group name                       |
| `description` | string | no     | New group description                |
| `type`      | string | no       | `interactive` or `updates_only`      |
| `image`     | file   | no       | New group image (field name **`image`** or **`file`**) |

Send only the fields you want to change. The image must be sent as a **file** in multipart form data.

## How to pass the image (frontend)

### JavaScript / React (fetch)

```js
const formData = new FormData();
formData.append('name', 'New Group Name');        // optional
formData.append('description', 'New description'); // optional
formData.append('type', 'interactive');           // optional
formData.append('image', imageFile);              // file input: e.g. event.target.files[0]
// use field name "image" (or "file" is also accepted)

const res = await fetch(`/api/v1/groups/${groupId}`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${token}`,
    // do NOT set Content-Type; browser sets multipart/form-data + boundary
  },
  body: formData,
});
```

### cURL

```bash
curl -X PUT "https://your-api/api/v1/groups/GROUP_ID" \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "name=Updated Name" \
  -F "image=@/path/to/photo.jpg"
```

### Postman

1. Method: **PUT**.
2. URL: `{{baseUrl}}/api/v1/groups/{{groupId}}`.
3. Headers: `Authorization: Bearer {{token}}`.
4. Body: **form-data** (not raw JSON).
5. Add key **`image`** (or **`file`**), type **File**, and choose the image file.

## Why the image was not saved

- **Using JSON body:** The API expects **multipart/form-data**. If you send `Content-Type: application/json` and a JSON body, the file is never received; use `FormData` and append the file with key `image` (or `file`).
- **Wrong field name:** The file field must be named **`image`** or **`file`**. Other names (e.g. `photo`, `groupImage`) are not accepted.
- **GET instead of PUT:** Use **PUT** for updating the group.

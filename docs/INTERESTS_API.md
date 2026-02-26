# Interests API (for frontend)

Base URL: use **`/api/v1`** for the app (e.g. `https://your-api.com/api/v1`).

Interests are **categories** (topics) and **tags** (interests inside a category). Users select **tags**; each tag has a `categoryId` so you can group by topic.

---

## 1. Get all interests (grouped by category) – **use this for picker UI**

**GET** `/api/v1/interests`

- **Auth:** none (public)
- **Query:** optional `?grouped=false` or `?flat=true` for a flat list of tags only.

**Response (default – grouped):**
```json
{
  "success": true,
  "categories": [
    {
      "id": "category_mongo_id",
      "name": "Health",
      "order": 1,
      "isActive": true,
      "tags": [
        {
          "id": "tag_mongo_id",
          "name": "Sleep",
          "categoryId": "category_mongo_id",
          "isActive": true,
          "createdAt": "...",
          "updatedAt": "..."
        }
      ]
    }
  ],
  "uncategorized": []
}
```

**Response (flat – `?grouped=false`):**
```json
{
  "success": true,
  "interests": [...],
  "tags": [...],
  "data": [...]
}
```
Each item: `{ id, name, categoryId, isActive, createdAt, updatedAt }`.

---

## 2. Get categories only

**GET** `/api/v1/interests/categories`

- **Auth:** none  
- **Response:** `{ "success": true, "categories": [ { "id", "name", "order", "isActive", "createdAt", "updatedAt" } ] }`

---

## 3. Get current user’s selected interests

**GET** `/api/v1/me/interests`

- **Auth:** `Authorization: Bearer <JWT>`
- **Response:**
```json
{
  "success": true,
  "interests": [
    { "id": "...", "name": "Sleep", "isActive": true, "createdAt": "...", "updatedAt": "..." }
  ],
  "data": [...]
}
```

---

## 4. Set current user’s interests (replace list)

**POST** `/api/v1/me/interests`

- **Auth:** `Authorization: Bearer <JWT>`
- **Body:**
```json
{
  "interestIds": ["tag_id_1", "tag_id_2", "tag_id_3"]
}
```
- **Response:** `{ "success": true, "interests": [ ...full tag objects... ], "data": [...] }`

Use the **tag `id`** values from **GET /api/v1/interests** (the `tags[].id` inside each category). User profile stores these IDs; no category needed when saving.

---

## 5. Create tag (interest) – optional for app

**POST** `/api/v1/interests`

- **Auth:** `Authorization: Bearer <JWT>`
- **Body:**
```json
{
  "name": "New Interest",
  "categoryId": "category_mongo_id"
}
```
- `categoryId` optional; omit for uncategorized.
- **Response:** `{ "success": true, "interest": { "id", "name", "categoryId", "isActive", ... }, "tag": {...}, "data": {...} }`

---

## 6. Update tag

**PUT** `/api/v1/interests/:id`

- **Auth:** JWT  
- **Body:** `{ "name"?: "New name", "categoryId"?: "category_id_or_null", "isActive"?: true }`  
- **Response:** `{ "success": true, "interest": {...}, "tag": {...}, "data": {...} }`

---

## 7. Deactivate tag (soft delete)

**DELETE** `/api/v1/interests/:id`

- **Auth:** JWT  
- **Response:** `{ "success": true, "message": "Tag deactivated.", "data": {...} }`

---

## 8. Category CRUD (optional – usually CRM only)

| Method | URL | Body | Auth |
|--------|-----|------|------|
| GET | `/api/v1/interests/categories` | - | No |
| POST | `/api/v1/interests/categories` | `{ "name", "order"?: 0 }` | JWT |
| PUT | `/api/v1/interests/categories/:id` | `{ "name"?, "order"?, "isActive"? }` | JWT |
| DELETE | `/api/v1/interests/categories/:id` | - | JWT |

---

## How to show interests in the app

1. **Load list for picker:**  
   **GET** `/api/v1/interests`  
   Use `response.categories` and render by category: section title = `category.name`, options = `category.tags` (each tag has `id`, `name`). User selects tag IDs.

2. **Load user’s current selection:**  
   **GET** `/api/v1/me/interests`  
   Use `response.interests` (array of `{ id, name, ... }`). Pre-check these in the picker.

3. **Save selection:**  
   **POST** `/api/v1/me/interests`  
   Body: `{ "interestIds": ["id1", "id2", ...] }` — array of tag IDs from the picker.

4. **Profile / “My interests”:**  
   Use **GET /api/v1/me** — it returns `user.interests` as an array of **IDs** only. To show names, either use **GET /api/v1/me/interests** (returns full objects) or map IDs to names using the list from **GET /api/v1/interests**.

---

## Summary table (app frontend)

| Purpose | Method | URL | Auth |
|--------|--------|-----|------|
| List for picker (grouped) | GET | `/api/v1/interests` | No |
| List for picker (flat) | GET | `/api/v1/interests?grouped=false` | No |
| My selected interests (full) | GET | `/api/v1/me/interests` | JWT |
| Set my interests | POST | `/api/v1/me/interests` | JWT |
| Create tag | POST | `/api/v1/interests` | JWT |
| Update tag | PUT | `/api/v1/interests/:id` | JWT |
| Deactivate tag | DELETE | `/api/v1/interests/:id` | JWT |

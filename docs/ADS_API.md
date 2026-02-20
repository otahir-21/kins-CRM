# Ads API

Image ads: CRM uploads images to CDN; mobile app fetches active ads and opens `link` when user taps.

---

## Mobile app (no auth)

### GET /api/v1/ads/active

Returns active ads for banners/carousel. **No Authorization header.**

**Response (200):**
```json
{
  "success": true,
  "ads": [
    {
      "id": "ad_id",
      "imageUrl": "https://cdn.../ads/ad_123.jpg",
      "link": "https://example.com/promo",
      "title": "Optional title",
      "isActive": true,
      "order": 0,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**Usage:** Fetch on app load; show `imageUrl` in a banner/carousel; on tap open `link` in browser or in-app webview.

---

## CRM (JWT required)

Send `Authorization: Bearer <JWT>` for all below.

### GET /api/v1/ads

List all ads (paginated).

**Query:** `page`, `limit` (default 20).

**Response (200):** `{ success, ads: [...], pagination: { page, limit, total, hasMore } }`

### GET /api/v1/ads/:id

Get one ad by ID.

**Response (200):** `{ success, ad: { id, imageUrl, link, title, isActive, order, createdAt, updatedAt } }`

### POST /api/v1/ads

Create ad. **Multipart form:** `image` (file), `link` (required), `title`, `isActive`, `order`.

- **image:** image file (stored in Bunny CDN under `ads/`)
- **link:** URL to open when user taps (required)
- **title:** optional string
- **isActive:** optional boolean (default true)
- **order:** optional number (default 0; lower = first in app)

**Response (201):** `{ success, ad: { ... } }`

### PUT /api/v1/ads/:id

Update ad. Body (or multipart): `link`, `title`, `isActive`, `order`. Optional `image` file to replace image.

**Response (200):** `{ success, ad: { ... } }`

### DELETE /api/v1/ads/:id

Delete ad.

**Response (200):** `{ success, message: "Ad deleted." }`

---

## Summary

| Who        | Endpoint              | Auth  | Purpose                    |
|-----------|------------------------|-------|----------------------------|
| Mobile app| GET /api/v1/ads/active | No    | Fetch ads for UI, open link on tap |
| CRM       | GET /api/v1/ads       | JWT   | List ads                   |
| CRM       | GET /api/v1/ads/:id   | JWT   | Get one ad                 |
| CRM       | POST /api/v1/ads      | JWT   | Create (upload image + link) |
| CRM       | PUT /api/v1/ads/:id   | JWT   | Update                     |
| CRM       | DELETE /api/v1/ads/:id| JWT   | Delete                     |

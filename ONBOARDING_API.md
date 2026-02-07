# Onboarding (Walkthrough) API

Use this API to load onboarding/walkthrough steps in the app. Manage steps from the CRM **Onboarding** page (title, subtitle, description, image URL, order).

## App: Get steps to show in walkthrough

**GET** `/api/onboarding?activeOnly=true`  
(default: `activeOnly=true` – only returns steps where `isActive` is true, ordered by `order`)

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "abc123",
      "title": "Lorem Ipsum",
      "subtitle": "Expert & Share Stories",
      "description": "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
      "imageUrl": "https://example.com/onboarding-1.png",
      "order": 0,
      "isActive": true
    }
  ]
}
```

- **title** – Main heading on the screen  
- **subtitle** – Short line under the title  
- **description** – Body text  
- **imageUrl** – Full URL to the step image (e.g. silhouette)  
- **order** – Display order (0, 1, 2, …)

## CRM: Full CRUD

- **GET** `/api/onboarding?activeOnly=false` – All steps (including inactive)  
- **GET** `/api/onboarding/:stepId` – Single step  
- **POST** `/api/onboarding` – Create step (body: `title`, `subtitle`, `description`, `imageUrl`, `order?`, `isActive?`)  
- **PUT** `/api/onboarding/:stepId` – Update step  
- **DELETE** `/api/onboarding/:stepId` – Delete step  

## Image upload (Bunny CDN)

- **POST** `/api/upload/image` – Upload an image; body: `multipart/form-data` with field **`image`** (JPEG, PNG, GIF, WebP, max 5 MB).  
- Response: `{ "success": true, "url": "https://your-cdn.net/onboarding/onboarding-xxx.jpg" }`.  
- Use this `url` as `imageUrl` when creating/updating an onboarding step. Data is stored in Firestore via the existing onboarding create/update APIs.  

## Firestore index

For active-only queries, create a composite index on collection `onboarding`:  
fields `isActive` (Ascending), `order` (Ascending).  
Deploy with `firebase deploy --only firestore:indexes` or create from the link in the error message.

# Mobile: Where to Show Surveys & How Responses Are Saved

Use the **v1 survey APIs** with **JWT** for the mobile app. Full API details: [SURVEY_API.md](./SURVEY_API.md).

---

## 1. Where to show questions and answers

- **List screen (e.g. “Surveys” / “Polls”)**  
  Call **GET /api/v1/surveys/for-me** with the user’s JWT. Show each survey’s `title` (and optionally `description`). When the user taps one, open the **detail screen** for that survey.

- **Detail screen (one survey)**  
  Call **GET /api/v1/surveys/:surveyId** (use the `id` from the list).  
  Render:
  - **Title:** `survey.title`
  - **Description (optional):** `survey.description`
  - **Questions:** for each `survey.questions[]`:
    - Question text: `q.text`
    - **Options:** for each `q.options[]` show a selectable option with `o.text` (and use `o.id` when submitting).

- **After submit**  
  Remove that survey from the list (or call **for-me** again). Do not show that survey again to that user.

Optional: before showing the form, call **GET /api/v1/surveys/:surveyId/my-response** (with JWT). If `responded === true`, show “Already answered” instead of the form.

---

## 2. APIs to use (mobile only)

| Step | Method | URL | Auth | Purpose |
|------|--------|-----|------|--------|
| List surveys to answer | GET | `/api/v1/surveys/for-me` | JWT required | Surveys the user has not answered yet |
| Load one survey (form) | GET | `/api/v1/surveys/:surveyId` | Optional | Get title, questions, options to display |
| Submit answer | POST | `/api/v1/surveys/:surveyId/respond` | JWT required | Save user’s choices |
| Already answered? | GET | `/api/v1/surveys/:surveyId/my-response` | JWT required | Decide whether to show form or “Already answered” |

**Request examples (mobile):**

```http
GET /api/v1/surveys/for-me
Authorization: Bearer <JWT>
```

```http
GET /api/v1/surveys/6123abc...
(optional: Authorization: Bearer <JWT>)
```

```http
POST /api/v1/surveys/6123abc.../respond
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "responses": [
    { "questionId": "q0", "optionId": "opt1" }
  ]
}
```

For a **single-question** survey there is one object in `responses`. For multiple questions, one object per question. `questionId` and `optionId` must match the survey (from GET :surveyId).

---

## 3. How the response is saved in the DB

- **Collection:** MongoDB collection for **SurveyResponse** (see `models/SurveyResponse.js`).

- **One document per user per survey:**  
  Unique index on `(userId, surveyId)`. If the same user submits again, the API returns **409** and no duplicate document is created.

- **Document shape:**

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Current user (from JWT on respond) |
| `surveyId` | ObjectId | Survey they answered |
| `responses` | Array | `[ { questionId: string, optionId: string }, ... ]` — one entry per question |
| `createdAt` / `updatedAt` | Date | Set by Mongoose timestamps |

- **Flow:**  
  `POST /api/v1/surveys/:surveyId/respond` → `submitSurveyResponse(userId, surveyId, responses)` in `surveys-helpers.js` → `SurveyResponse.create({ userId, surveyId, responses })`. The backend validates that every question has one chosen option and that option IDs belong to that survey.

So: **where** you show Q&A is the list screen + detail screen; **which** APIs are **for-me**, **:surveyId**, and **:surveyId/respond** (and optionally **my-response**); **how** the response is saved is one **SurveyResponse** document per user per survey with a `responses` array of `{ questionId, optionId }`.

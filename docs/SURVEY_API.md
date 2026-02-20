# Survey API (MCQ) – CRM + Mobile App

Surveys are MCQ: one or multiple questions, each with **max 4 options**. One response per user per survey; after submit, that survey is not shown again to that user.

---

## CRM: Create / manage surveys (legacy `/api/surveys`)

- **POST /api/surveys** – Create survey  
- **GET /api/surveys** – List all (query: `isActive`, `showOnHomePage`)  
- **GET /api/surveys/active** – One active survey for home page  
- **GET /api/surveys/:surveyId** – Get one  
- **PUT /api/surveys/:surveyId** – Update  
- **DELETE /api/surveys/:surveyId** – Deactivate (soft)  
- **POST /api/surveys/:surveyId/respond** – Submit response (body: `userId` + `selectedOptionId` for single question, or `userId` + `responses: [ { questionId, optionId } ]` for multi)  
- **GET /api/surveys/:surveyId/analytics** – Response counts  
- **GET /api/users/:userId/survey-responses** – List user’s responses  

### Create survey body (CRM)

**Option A – Multiple questions (MCQ):**
```json
{
  "title": "Product feedback",
  "description": "Optional",
  "isActive": true,
  "showOnHomePage": false,
  "questions": [
    {
      "id": "q0",
      "text": "How often do you use the app?",
      "options": [
        { "id": "opt0", "text": "Daily" },
        { "id": "opt1", "text": "Weekly" },
        { "id": "opt2", "text": "Rarely" }
      ]
    },
    {
      "id": "q1",
      "text": "Rate your experience",
      "options": [
        { "id": "opt0", "text": "1" },
        { "id": "opt1", "text": "2" },
        { "id": "opt2", "text": "3" },
        { "id": "opt3", "text": "4" }
      ]
    }
  ]
}
```

**Option B – Single question (legacy):**
```json
{
  "title": "Quick poll",
  "question": "Do you like the app?",
  "options": [
    { "id": "opt0", "text": "Yes" },
    { "id": "opt1", "text": "No" }
  ]
}
```

- Each question: **1–4 options**.  
- `id` on question/option can be any string; if omitted, backend assigns `q0`, `q1`, … and `opt0`, `opt1`, …

---

## Mobile app: GET + submit (v1, JWT)

Base path: **/api/v1/surveys**. Send **Authorization: Bearer &lt;JWT&gt;** except for **GET /api/v1/surveys/:surveyId** (optional auth).

### 1. GET /api/v1/surveys/for-me  
**Auth: required**

Returns **active surveys the current user has not yet responded to**. Use this to show “surveys to answer”; once the user submits, they disappear from this list (don’t show again).

**Response (200):**
```json
{
  "success": true,
  "surveys": [
    {
      "id": "survey_id",
      "title": "Product feedback",
      "description": "Optional",
      "isActive": true,
      "showOnHomePage": false,
      "questions": [
        {
          "id": "q0",
          "text": "How often do you use the app?",
          "options": [
            { "id": "opt0", "text": "Daily" },
            { "id": "opt1", "text": "Weekly" }
          ]
        }
      ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

- If the user has already responded to all active surveys, `surveys` is `[]`.

---

### 2. GET /api/v1/surveys/:surveyId  
**Auth: optional**

Returns one survey by ID (for showing the form). Use after user taps a survey from “for-me” or from a deep link.

- **404** if survey not found or **inactive**.

**Response (200):**
```json
{
  "success": true,
  "survey": {
    "id": "...",
    "title": "...",
    "description": null,
    "isActive": true,
    "showOnHomePage": false,
    "questions": [ { "id": "q0", "text": "...", "options": [ { "id": "opt0", "text": "..." } ] } ],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 3. POST /api/v1/surveys/:surveyId/respond  
**Auth: required**

Submits the **current user’s** response. One response per user per survey.

**Body:**
```json
{
  "responses": [
    { "questionId": "q0", "optionId": "opt1" },
    { "questionId": "q1", "optionId": "opt2" }
  ]
}
```

- One entry per question; each `questionId` / `optionId` must match the survey.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "response_id",
    "userId": "...",
    "surveyId": "...",
    "responses": [ { "questionId": "q0", "optionId": "opt1" }, ... ],
    "createdAt": "..."
  }
}
```

**Edge cases:**

| Case | HTTP | Response |
|------|------|----------|
| User already responded to this survey | 409 | `{ "success": false, "error": "You have already responded to this survey." }` |
| Invalid/missing `surveyId` | 400 | Invalid survey ID |
| Survey not found or inactive | 400 | Error message |
| Missing `responses` or empty array | 400 | responses array required |
| Unknown `questionId` or invalid `optionId` | 400 | Error message |
| Missing response for a question | 400 | Missing response for question |

---

### 4. GET /api/v1/surveys/:surveyId/my-response  
**Auth: required**

Checks whether the current user has already responded. Use to hide “Answer” or show “Already answered” instead of the form.

**Response (200):**
```json
{
  "success": true,
  "responded": true,
  "data": { "id": "...", "userId": "...", "surveyId": "...", "responses": [...], "createdAt": "..." }
}
```
or `responded: false`, `data: null`.

---

## Flow (mobile app)

1. **GET /api/v1/surveys/for-me** (with JWT) → list of surveys to show.
2. User taps a survey → **GET /api/v1/surveys/:surveyId** to load title + questions + options.
3. User selects one option per question and submits → **POST /api/v1/surveys/:surveyId/respond** with `responses: [ { questionId, optionId } ]`.
4. On success, remove that survey from the “for-me” list (or call **for-me** again); do not show that survey again to that user.
5. Optional: **GET /api/v1/surveys/:surveyId/my-response** to decide whether to show the form or “Already responded”.

---

## Summary

| Who | GET | POST |
|-----|-----|------|
| **App** | **/api/v1/surveys/for-me** (JWT) – surveys not yet answered | **/api/v1/surveys/:surveyId/respond** (JWT) – submit response |
| **App** | **/api/v1/surveys/:surveyId** – one survey (to show form) | |
| **App** | **/api/v1/surveys/:surveyId/my-response** (JWT) – already responded? | |
| **CRM** | /api/surveys, /api/surveys/active, /api/surveys/:id | /api/surveys (create), /api/surveys/:id/respond (legacy) |

Edge cases: one response per user per survey (409 on duplicate), validate questionId/optionId (400), inactive survey (404/400), missing responses (400).

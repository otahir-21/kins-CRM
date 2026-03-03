# Moderation keywords (CRM)

Admins can moderate content efficiently using:

1. **Search bar** – Type any term and click Search to find posts containing that text (Active and Deleted tabs).
2. **Flagged tab** – Posts that contain **any of 48 keywords** are listed here. Each post shows which keyword(s) matched.

## Your 48 keywords

Edit **`config/moderationKeywords.js`** and replace the placeholder entries (`replace_1` … `replace_48`) with your actual list of abusive or bad terms. One term per line; case-insensitive matching.

Example:

```js
const MODERATION_KEYWORDS = [
  'term1',
  'term2',
  // ... 48 total
];
```

After changing the file, restart the backend. The Flagged tab in the CRM will use the new list on the next load.

## API

- **GET /api/posts?q=...** – Search posts by content (optional `q`).
- **GET /api/posts/flagged** – Paginated list of posts that contain any moderation keyword. Each item includes `matchedKeywords: string[]`.

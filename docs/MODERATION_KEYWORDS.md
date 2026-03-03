# Moderation keywords (CRM)

Admins can moderate content efficiently using:

1. **Search bar** – Type any term and click Search to find posts containing that text (Active and Deleted tabs).
2. **Flagged tab** – Posts that contain **any of your moderation keywords** are listed here. Each post shows which keyword(s) matched.
3. **Manage keywords in CRM** – On the Content Moderation page, open **"Manage flagging keywords"** to add, remove, and save keywords (stored in DB, no restart needed). Up to 200 keywords.

## Adding keywords

- **From the CRM:** Open Content Moderation → **Manage flagging keywords** → add terms and click **Save keywords**. These are stored in the database and used immediately by the Flagged tab.
- **Fallback (config):** If no keywords are saved in the DB, the backend uses **`config/moderationKeywords.js`**. Edit that file to set default/placeholder terms; restart the backend after changes.

## API

- **GET /api/posts?q=...** – Search posts by content (optional `q`).
- **GET /api/posts/flagged** – Paginated list of posts that contain any moderation keyword. Each item includes `matchedKeywords: string[]`.

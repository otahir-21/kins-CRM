# Postman – Kins CRM API

## Import collection

1. Open Postman.
2. **Import** → **File** → choose `Kins-CRM-API.postman_collection.json`.
3. The collection **Kins CRM API** appears in the sidebar.

## Variables (set once)

In the collection, click the collection name → **Variables**:

| Variable   | Initial value                         | Current value |
|-----------|---------------------------------------|----------------|
| `baseUrl` | `https://kins-crm.vercel.app`         | Same or `http://localhost:3000` for local |
| `token`   | *(empty)*                             | Filled automatically after **Login** |
| `userId`  | *(empty)*                             | Filled automatically after **Login** (your user id) |
| `postId`  | *(empty)*                             | Set to a post ID when testing posts/likes/comments |
| `commentId` | *(empty)*                           | Set to a comment ID when testing replies |

- For **local**: set `baseUrl` to `http://localhost:3000`.
- **Login** request has a script that saves `token` and `userId` from the response into these variables.

## How to test

1. **Auth → Login**  
   Run **Login**. It will set `token` (and `userId`) in the collection variables. Other requests use **Bearer Token** and will use `token` automatically.

2. **Interests**  
   Run **Interests → List All Interests** (no auth). Copy an interest `_id` and use it in **Set My Interests** and in **Create Text Post** / **Create Poll Post** as `interestIds`.

3. **Feed**  
   **Feed → Get Feed** returns the feed with `isLiked`, `userVote`, `pollResults` per post.

4. **Posts**  
   - **Create Text Post** / **Create Poll Post**: put a valid `interestIds` array in the body.  
   - From the response, copy a post `_id` into the collection variable `postId` (or in **Variables** tab).  
   - Then use **Get Post by ID**, **Like Post**, **Create Comment**, **Vote on Poll**, etc.

5. **Follow**  
   Set `userId` to another user’s id (e.g. from a feed post’s `author._id`), then **Follow User**, **Get Follow Status**, **Get Followers**, etc.

## Folders in the collection

| Folder      | Main requests |
|------------|----------------|
| Auth       | Login (saves token) |
| Health     | Health check (no auth) |
| Me         | Get/update profile, get/set interests |
| Interests  | List all interests |
| Feed       | Get feed (paginated) |
| Posts      | Create (text/poll), get my posts, get by id, delete |
| Likes      | Like / unlike post, get likes, get like status |
| Comments   | Create comment/reply, get comments/replies, delete comment |
| Shares     | Share post, get shares |
| Views      | Increment view |
| Polls      | Vote, get poll results, remove vote |
| Follow     | Get user profile, follow status, follow/unfollow, followers/following |
| Debug      | Debug feed, debug posts |

## Image post (multipart)

Creating an **image** or **video** post needs `multipart/form-data` (files under `media`). In Postman:

- Method: **POST** `{{baseUrl}}/api/v1/posts`
- Body → **form-data**
- Add: `type` = `image`, `content` = `Caption`, `interestIds` = `["id1","id2"]`, `media` = **File** (choose image)

The collection does not include a pre-built image-post request; add one and use the above.

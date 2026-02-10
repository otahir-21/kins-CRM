# MongoDB connection

## 1. Local MongoDB (easiest for local dev)

**Install (Mac with Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**In `.env`:**
```
MONGODB_URI=mongodb://localhost:27017/kins-crm
```

No username/password. Restart the server after changing `.env`.

---

## 2. MongoDB Atlas (cloud)

1. Create a cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → Add user (username + password).
3. **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`) so your machine and Vercel can connect.
4. **Database** → Connect → **Drivers** → copy the connection string.

**In `.env`:**
```
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/kins-crm?retryWrites=true&w=majority
```

Replace `USERNAME`, `PASSWORD`, and `CLUSTER` with your values. If the password has special characters, URL-encode them (e.g. `@` → `%40`).

**If you see `querySrv ECONNREFUSED`:**
- Your network or firewall may be blocking DNS/outbound connections to Atlas.
- Try: different Wi‑Fi, disable VPN, or use **Local MongoDB** (above) for development.

---

## 3. Check connection

```bash
# With server running:
curl http://localhost:3000/health
curl http://localhost:3000/api/interests
```

If MongoDB is connected, `/api/interests` returns JSON. If not, the server may still start but those routes can fail.

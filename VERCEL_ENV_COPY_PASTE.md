# Vercel env vars — where to get each actual value

Use this once: open each “Where to get” link/source, copy the value, paste into Vercel. **Do not commit this file with real secrets.** Add it to `.gitignore` or delete after use.

---

## 1. Firebase (you said you have these)

| Variable | Where to get the actual value |
|----------|-------------------------------|
| **FIREBASE_PROJECT_ID** | Firebase Console → Project Settings → General → “Project ID”. Often `kins-b4afb`. |
| **FIREBASE_STORAGE_BUCKET** | Firebase Console → Project Settings → General → “Storage bucket”. Often `kins-b4afb.firebasestorage.app`. |
| **FIREBASE_SERVICE_ACCOUNT** | Firebase Console → Project Settings → **Service accounts** → “Generate new private key” → download JSON. Open the file, select all (Cmd/Ctrl+A), copy. Paste into Vercel as one line (no line breaks). |

---

## 2. Twilio (Send OTP / Verify OTP)

| Variable | Where to get the actual value |
|----------|-------------------------------|
| **TWILIO_ACCOUNT_SID** | [Twilio Console](https://console.twilio.com) → Dashboard → “Account SID” (starts with `AC`). Copy the whole string. |
| **TWILIO_AUTH_TOKEN** | Same page → “Auth Token” → click “Show” → copy. |
| **TWILIO_VERIFY_SERVICE_SID** | Twilio Console → **Explore Products** → **Verify** → **Services** → create a service or open existing → copy **SID** (starts with `VA`). |

---

## 3. JWT (token after login)

| Variable | Actual value you can use (or replace with your own) |
|----------|------------------------------------------------------|
| **JWT_SECRET** | Use this once, then never share it: `1ZWAU4V7FGCE/mnXC9DbhUX36q1dRG2tkFelBUdgjV4=` |
| **JWT_EXPIRES_IN** | `7d` (or `24h` if you want shorter-lived tokens) |

The JWT_SECRET above was generated with `openssl rand -base64 32`. You can keep it or generate a new one locally with the same command and use that instead.

---

## 4. Bunny CDN (only if you use onboarding image upload)

| Variable | Where to get the actual value |
|----------|-------------------------------|
| **BUNNY_STORAGE_ZONE** | Bunny CDN dashboard → Storage → your storage zone name. |
| **BUNNY_ACCESS_KEY** | Same storage zone → “FTP & API Access” / “Password” (API key). |
| **BUNNY_CDN_URL** | Bunny CDN → Pull Zones → your zone → hostname, e.g. `https://yourzone.b-cdn.net`. |
| **BUNNY_STORAGE_REGION** | e.g. `uk`, `ny`, or leave empty. |

If you don’t use onboarding image upload, skip all BUNNY_* vars.

---

## Quick copy list (names only — you fill values in Vercel)

Paste each **name** into Vercel, then paste the **value** from the source above:

- FIREBASE_PROJECT_ID  
- FIREBASE_STORAGE_BUCKET  
- FIREBASE_SERVICE_ACCOUNT  
- TWILIO_ACCOUNT_SID  
- TWILIO_AUTH_TOKEN  
- TWILIO_VERIFY_SERVICE_SID  
- JWT_SECRET  
- JWT_EXPIRES_IN  

Optional: BUNNY_STORAGE_ZONE, BUNNY_ACCESS_KEY, BUNNY_CDN_URL, BUNNY_STORAGE_REGION

---

**The only “actual” value provided here is JWT_SECRET** (the long base64 string). All others you copy from your Firebase and Twilio (and Bunny) dashboards using the table above.

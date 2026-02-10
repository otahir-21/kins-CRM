# Vercel Environment Variables — What to Add

**Firebase has been removed.** The app uses **MongoDB** and **JWT** only. See **VERCEL_DEPLOY.md** for full deployment steps.

---

## Required (must add in Vercel)

| Variable | Example / notes |
|----------|------------------|
| **MONGODB_URI** | Atlas: `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/kins-crm?retryWrites=true&w=majority&appName=Kins`. Must include database name in path. |
| **JWT_SECRET** | Long random string, **at least 32 characters** (e.g. `openssl rand -base64 32`). |

---

### Optional: Send OTP / Verify OTP (Twilio)

Without these, **Send OTP** and **Verify OTP** will fail.

| Variable | Where to get it |
|----------|------------------|
| `TWILIO_ACCOUNT_SID` | [Twilio Console](https://console.twilio.com) → Dashboard. Starts with `AC...`. |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Dashboard. Click “Show” next to Auth Token. |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Console → **Verify** → **Services** → create or select a service → copy **SID** (starts with `VA...`). |
| `JWT_SECRET` | Create your own: long random string, **at least 32 characters** (e.g. use a password generator or `openssl rand -base64 32`). Used to sign login tokens. |

Optional: `JWT_EXPIRES_IN` = `7d` (default) or e.g. `24h` if you want a different token lifetime.

---

### Optional (only if you use that feature)

| Variable | When to add |
|----------|-------------|
| `BUNNY_STORAGE_ZONE` | Only if you use **onboarding image upload** (Bunny CDN). |
| `BUNNY_ACCESS_KEY` | Same as above. |
| `BUNNY_CDN_URL` | Same as above (e.g. `https://your-zone.b-cdn.net`). |
| `BUNNY_STORAGE_REGION` | e.g. `uk` if you use a specific Bunny region. |

If you don’t use onboarding image upload, you can skip all `BUNNY_*` variables.

---

## Where to add in Vercel

1. Open your project on [vercel.com](https://vercel.com).
2. Go to **Settings** → **Environment Variables**.
3. Add each variable:
   - **Key** = name (e.g. `TWILIO_ACCOUNT_SID`).
   - **Value** = your secret.
   - **Environments** = at least **Production** (and Preview/Development if you use them).
4. Click **Save**.
5. **Redeploy** (Deployments → ⋮ on latest → Redeploy) so new variables are used.

---

## Summary: minimum for auth to work

You already have Firebase. Add these **4** in Vercel:

1. **TWILIO_ACCOUNT_SID**  
2. **TWILIO_AUTH_TOKEN**  
3. **TWILIO_VERIFY_SERVICE_SID**  
4. **JWT_SECRET** (min 32 characters)

Then redeploy. Send OTP and Verify OTP will work.

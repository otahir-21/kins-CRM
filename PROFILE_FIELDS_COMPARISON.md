# Profile Fields - Current vs Required

## ✅ What's Currently Available

### Editable via `PUT /api/v1/me/about`:
| Field | Status | Current Implementation |
|-------|--------|----------------------|
| ✅ **Profile Picture** | Available | `profilePictureUrl` (string - URL) |
| ✅ **Full Name** | Available | `name` (string) |
| ✅ **Bio / Description** | Available | `bio` (string) |
| ✅ **Username** | Available | `username` (string) |
| ⚠️ **Email** | **MISSING** | Field exists in DB but NOT editable |
| ⚠️ **Phone Number** | **MISSING** | Field exists in DB but NOT editable |
| ✅ **Gender** | Available | `gender` (string) |
| ✅ **Date of Birth** | Available | `dateOfBirth` (string - YYYY-MM-DD) |
| ✅ **Status** | Available | `status` (string - motherhood status) |

### Interests/Categories (Separate Endpoint):
| Field | Status | Implementation |
|-------|--------|---------------|
| ✅ **Interests / Tags** | Available | `POST /api/v1/me/interests` |
| ✅ **Add new tag** | Available | Include in `interestIds` array |
| ✅ **Remove tag** | Available | Exclude from `interestIds` array |

### Read-Only Fields (NOT Editable):
| Field | Status | Notes |
|-------|--------|-------|
| ❌ **Followers** | Read-only | `followerCount` - Auto-calculated |
| ❌ **Following** | Read-only | `followingCount` - Auto-calculated |
| ❌ **Posts** | Read-only | Count of user's posts - Auto-calculated |
| ❌ **Reposts/Shares** | Read-only | Count of shares - Auto-calculated |

### Location (Partially Available):
| Field | Status | Notes |
|-------|--------|-------|
| ⚠️ **Location (GPS)** | Available | `location.latitude`, `location.longitude` |
| ❌ **Country** | **MISSING** | Not in database |
| ❌ **City** | **MISSING** | Not in database |

---

## ❌ What's Missing

### Fields That Need to Be Added:

1. **Email** (editable)
   - Exists in DB: ✅
   - Currently editable: ❌
   - **Fix needed:** Add to `ABOUT_FIELDS` array

2. **Phone Number** (editable)
   - Exists in DB: ✅
   - Currently editable: ❌
   - **Fix needed:** Add to `ABOUT_FIELDS` array

3. **Country** (editable)
   - Exists in DB: ❌
   - **Fix needed:** Add field to User model + make editable

4. **City** (editable)
   - Exists in DB: ❌
   - **Fix needed:** Add field to User model + make editable

5. **Posts Count** (read-only)
   - Currently calculated on-the-fly
   - Could be cached in User model for performance

---

## 🔧 Recommended Changes

### Option 1: Add Missing Editable Fields (Quick Fix)

**Step 1:** Update `ABOUT_FIELDS` in `controllers/v1/meController.js`:
```javascript
// OLD
const ABOUT_FIELDS = ['name', 'username', 'bio', 'status', 'gender', 'dateOfBirth', 'profilePictureUrl', 'documentUrl'];

// NEW
const ABOUT_FIELDS = ['name', 'username', 'bio', 'status', 'gender', 'dateOfBirth', 'profilePictureUrl', 'documentUrl', 'email', 'phoneNumber'];
```

**Step 2:** Add country/city to User model:
```javascript
// Add to User schema
country: { type: String, default: null },
city: { type: String, default: null },
```

**Step 3:** Add to ABOUT_FIELDS:
```javascript
const ABOUT_FIELDS = ['name', 'username', 'bio', 'status', 'gender', 'dateOfBirth', 'profilePictureUrl', 'documentUrl', 'email', 'phoneNumber', 'country', 'city'];
```

### Option 2: Create Separate Endpoints (More Secure)

Keep sensitive fields (email, phone) separate:

```
PUT /api/v1/me/about - Basic profile (name, bio, username, etc.)
PUT /api/v1/me/contact - Contact info (email, phone)
PUT /api/v1/me/location - Location (country, city, GPS)
```

---

## 📊 Complete Field Mapping

### Current API Structure:

```javascript
// GET /api/v1/me - Returns all fields
{
  "id": "...",
  "name": "John Doe",              // ✅ Editable
  "username": "johndoe",            // ✅ Editable
  "email": "john@example.com",      // ⚠️ NOT editable (should be)
  "phoneNumber": "+1234567890",     // ⚠️ NOT editable (should be)
  "bio": "My bio",                  // ✅ Editable
  "gender": "male",                 // ✅ Editable
  "dateOfBirth": "1990-01-15",      // ✅ Editable
  "status": "new_mom",              // ✅ Editable
  "profilePictureUrl": "...",       // ✅ Editable
  "followerCount": 150,             // ❌ Read-only
  "followingCount": 200,            // ❌ Read-only
  "interests": ["..."],             // ✅ Editable via POST /me/interests
  // Missing fields:
  "country": null,                  // ❌ Doesn't exist yet
  "city": null,                     // ❌ Doesn't exist yet
  "postsCount": 0                   // ❌ Doesn't exist yet (could add)
}
```

---

## 🎯 Your Requirements vs Current State

| Your Requirement | Field Name | Status | Action Needed |
|------------------|------------|--------|---------------|
| Profile Picture | `profilePictureUrl` | ✅ Available | None |
| Full Name | `name` | ✅ Available | None |
| Bio / Description | `bio` | ✅ Available | None |
| Followers | `followerCount` | ✅ Read-only | None (correct) |
| Following | `followingCount` | ✅ Read-only | None (correct) |
| Posts | N/A | ❌ Missing | Add `postsCount` field (optional) |
| Reposts | N/A | ❌ Missing | Add to shares system |
| Interests/Tags | `interests` | ✅ Available | None |
| Username | `username` | ✅ Available | None |
| Email | `email` | ⚠️ Exists but not editable | **Add to ABOUT_FIELDS** |
| Phone number | `phoneNumber` | ⚠️ Exists but not editable | **Add to ABOUT_FIELDS** |
| Country | N/A | ❌ Missing | **Add field to User model** |
| City | N/A | ❌ Missing | **Add field to User model** |

---

## 🚀 Next Steps

### Immediate Actions Needed:

1. ✅ **Add email to editable fields** - Simple config change
2. ✅ **Add phoneNumber to editable fields** - Simple config change
3. ✅ **Add country field** - Requires DB migration
4. ✅ **Add city field** - Requires DB migration
5. ⚠️ **Add postsCount** (optional) - For performance optimization

**Would you like me to implement these changes now?**

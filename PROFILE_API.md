# Profile Management API

Complete guide for managing user profiles in KINS CRM.

## Base URL
```
Production: https://kins-crm.vercel.app/api/v1
```

## Authentication
All profile endpoints require JWT authentication:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📋 Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/me` | Get current user profile |
| `PUT` | `/me/about` | Update profile information |
| `POST` | `/me/interests` | Update user interests |
| `GET` | `/me/interests` | Get user interests |
| `DELETE` | `/me` | Delete account |

---

## 1. Get Current User Profile

**Endpoint:** `GET /api/v1/me`

**Description:** Retrieve the authenticated user's complete profile.

**Request:**
```bash
curl -X GET "https://kins-crm.vercel.app/api/v1/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "user": {
    "id": "698c3d182c8049e73b50b4d8",
    "provider": "phone",
    "providerUserId": "+1234567890",
    "name": "John Doe",
    "email": null,
    "phoneNumber": "+1234567890",
    "username": "johndoe",
    "profilePictureUrl": "https://example.com/avatar.jpg",
    "bio": "Software developer passionate about tech",
    "status": "active",
    "gender": "male",
    "dateOfBirth": "1990-01-15",
    "documentUrl": null,
    "followerCount": 150,
    "followingCount": 200,
    "interests": ["698b308f20382fdf628a70d8"],
    "interestsUpdatedAt": "2026-02-11T08:26:11.685Z",
    "createdAt": "2026-02-11T08:26:00.711Z",
    "updatedAt": "2026-02-11T12:45:00.000Z"
  }
}
```

---

## 2. Update Profile Information

**Endpoint:** `PUT /api/v1/me/about`

**Description:** Update user profile fields. Only send the fields you want to update.

**Updatable Fields:**
- `name` (string): Full name
- `username` (string): Unique username
- `email` (string): Email address
- `phoneNumber` (string): Phone number
- `bio` (string): User biography/description
- `status` (string): User status (e.g., "Working Mum", "New Mom")
- `gender` (string): Gender (e.g., "male", "female", "other")
- `dateOfBirth` (string): Date in format `YYYY-MM-DD`
- `country` (string): Country of residence
- `city` (string): City of residence
- `profilePictureUrl` (string): URL to profile picture
- `documentUrl` (string): URL to verification document

**Request:**
```bash
curl -X PUT "https://kins-crm.vercel.app/api/v1/me/about" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "bio": "Software developer passionate about tech",
    "gender": "male",
    "dateOfBirth": "1990-01-15",
    "country": "United States",
    "city": "New York",
    "profilePictureUrl": "https://example.com/avatar.jpg"
  }'
```

**Response:** `200 OK`
```json
{
  "success": true,
  "user": {
    "id": "698c3d182c8049e73b50b4d8",
    "name": "John Doe",
    "username": "johndoe",
    "bio": "Software developer passionate about tech",
    "gender": "male",
    "dateOfBirth": "1990-01-15",
    "profilePictureUrl": "https://example.com/avatar.jpg",
    ...
  }
}
```

**Partial Update (Only Update Some Fields):**
```bash
curl -X PUT "https://kins-crm.vercel.app/api/v1/me/about" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Updated bio only!"
  }'
```

**Clear a Field (Set to null):**
```bash
curl -X PUT "https://kins-crm.vercel.app/api/v1/me/about" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": ""
  }'
```

**Error Responses:**

**400 Bad Request** - No fields provided
```json
{
  "success": false,
  "error": "No valid fields to update."
}
```

**400 Bad Request** - Invalid date format
```json
{
  "success": false,
  "error": "dateOfBirth must be yyyy-MM-dd or null."
}
```

---

## 3. Update User Interests

**Endpoint:** `POST /api/v1/me/interests`

**Description:** Replace user's interests completely. This is used to set which content categories the user wants to see.

**Request:**
```bash
curl -X POST "https://kins-crm.vercel.app/api/v1/me/interests" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "interestIds": [
      "698b308f20382fdf628a70d8",
      "698b308f20382fdf628a70d9"
    ]
  }'
```

**Response:** `200 OK`
```json
{
  "success": true,
  "interests": [
    {
      "id": "698b308f20382fdf628a70d8",
      "name": "technologies",
      "isActive": true,
      "createdAt": "2026-02-10T10:00:00.000Z",
      "updatedAt": "2026-02-10T10:00:00.000Z"
    },
    {
      "id": "698b308f20382fdf628a70d9",
      "name": "sports",
      "isActive": true,
      "createdAt": "2026-02-10T10:00:00.000Z",
      "updatedAt": "2026-02-10T10:00:00.000Z"
    }
  ],
  "data": [...]
}
```

**Error Responses:**

**400 Bad Request** - Invalid format
```json
{
  "success": false,
  "error": "interestIds must be an array."
}
```

**400 Bad Request** - Invalid IDs
```json
{
  "success": false,
  "error": "One or more interest IDs are invalid or inactive."
}
```

**Note:** To get available interests, call `GET /api/v1/interests`

---

## 4. Get User Interests

**Endpoint:** `GET /api/v1/me/interests`

**Description:** Get the user's current interests with full details.

**Request:**
```bash
curl -X GET "https://kins-crm.vercel.app/api/v1/me/interests" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "interests": [
    {
      "id": "698b308f20382fdf628a70d8",
      "name": "technologies",
      "isActive": true,
      "createdAt": "2026-02-10T10:00:00.000Z",
      "updatedAt": "2026-02-10T10:00:00.000Z"
    }
  ],
  "data": [...]
}
```

---

## 5. Delete Account

**Endpoint:** `DELETE /api/v1/me`

**Description:** Permanently delete the user's account and all associated data.

⚠️ **Warning:** This is a hard delete and cannot be undone!

**Request:**
```bash
curl -X DELETE "https://kins-crm.vercel.app/api/v1/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Account deleted successfully."
}
```

---

## 📱 Mobile Integration Examples

### React Native Example

```javascript
// Profile update hook
const useUpdateProfile = () => {
  const updateProfile = async (profileData) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch('https://kins-crm.vercel.app/api/v1/me/about', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.user;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };
  
  return { updateProfile };
};

// Usage in component
const EditProfileScreen = () => {
  const { updateProfile } = useUpdateProfile();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  
  const handleSave = async () => {
    try {
      const updatedUser = await updateProfile({
        name,
        username,
        bio,
      });
      Alert.alert('Success', 'Profile updated successfully!');
      // Navigate back or update local state
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
  
  return (
    <View>
      <TextInput 
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput 
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput 
        placeholder="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
      />
      <Button title="Save" onPress={handleSave} />
    </View>
  );
};
```

### Flutter Example

```dart
class ProfileService {
  final String baseUrl = 'https://kins-crm.vercel.app/api/v1';
  
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> profileData) async {
    final token = await storage.read(key: 'authToken');
    
    final response = await http.put(
      Uri.parse('$baseUrl/me/about'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(profileData),
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to update profile');
    }
  }
  
  Future<Map<String, dynamic>> getProfile() async {
    final token = await storage.read(key: 'authToken');
    
    final response = await http.get(
      Uri.parse('$baseUrl/me'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load profile');
    }
  }
}
```

---

## 🎨 Profile Picture Upload

The `profilePictureUrl` field accepts a URL. To upload a profile picture, you have two options:

### Option 1: Upload to Bunny CDN (Recommended)

If you want to use the same Bunny CDN storage as posts:

**You'll need to create an endpoint:**
```bash
POST /api/v1/me/upload-avatar
```

This endpoint doesn't exist yet. Would you like me to create it?

### Option 2: Use External Image Service

Upload to your own image hosting service (AWS S3, Cloudinary, etc.) and then update the profile:

```javascript
// 1. Upload image to your service
const imageUrl = await uploadToImageService(imageFile);

// 2. Update profile with URL
await fetch('https://kins-crm.vercel.app/api/v1/me/about', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    profilePictureUrl: imageUrl
  }),
});
```

---

## 📝 Field Validation Rules

| Field | Type | Format | Required | Notes |
|-------|------|--------|----------|-------|
| `name` | string | Any | No | Trimmed, can be empty |
| `username` | string | Alphanumeric | No | Should be unique (not enforced yet) |
| `email` | string | Email | No | Email address |
| `phoneNumber` | string | Phone | No | Phone number with country code |
| `bio` | string | Any | No | User description |
| `status` | string | Any | No | User status (e.g., "Working Mum") |
| `gender` | string | Any | No | Suggested: "male", "female", "other" |
| `dateOfBirth` | string | YYYY-MM-DD | No | ISO date format |
| `country` | string | Any | No | Country of residence |
| `city` | string | Any | No | City of residence |
| `profilePictureUrl` | string | URL | No | Full URL to image |
| `documentUrl` | string | URL | No | For verification documents |

---

## 🔒 Security Notes

1. **Authentication Required**: All endpoints require valid JWT token
2. **User Isolation**: Users can only update their own profile
3. **Field Sanitization**: All string fields are trimmed
4. **No SQL Injection**: Uses Mongoose with validated inputs

---

## ⚡ Best Practices

### 1. **Update Only Changed Fields**
```javascript
// ✅ Good - only update what changed
await updateProfile({ bio: newBio });

// ❌ Bad - sending all fields even if unchanged
await updateProfile({ name, username, bio, gender, ... });
```

### 2. **Handle Errors Gracefully**
```javascript
try {
  await updateProfile(data);
} catch (error) {
  if (error.message.includes('username')) {
    // Handle username error
  } else {
    // Generic error handling
  }
}
```

### 3. **Validate Before Sending**
```javascript
const validateDateOfBirth = (date) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
};

if (dateOfBirth && !validateDateOfBirth(dateOfBirth)) {
  Alert.alert('Invalid date format. Use YYYY-MM-DD');
  return;
}
```

---

## 🐛 Common Errors

### Error: "No valid fields to update"
**Cause:** Request body is empty or contains no valid fields
**Solution:** Ensure you're sending at least one valid field

### Error: "dateOfBirth must be yyyy-MM-dd or null"
**Cause:** Date format is incorrect
**Solution:** Use format `YYYY-MM-DD` (e.g., "1990-01-15")

### Error: "Invalid token"
**Cause:** JWT token is missing, expired, or invalid
**Solution:** Login again to get a new token

---

## 📞 Support

For issues or questions:
- Check the main API documentation: `API_V1.md`
- Mobile endpoints guide: `MOBILE_ENDPOINTS.md`
- Authentication guide: Contact your backend team

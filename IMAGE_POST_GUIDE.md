# How to Upload Image/Video Posts

## The Issue

When creating image or video posts, you **cannot use JSON**. You must use **`multipart/form-data`** with actual file uploads.

**Error:** `"image post requires media files"`  
**Cause:** Not sending files correctly or using JSON instead of multipart/form-data

---

## ✅ Correct Way: Using multipart/form-data

### Key Requirements

1. **Content-Type:** `multipart/form-data`
2. **Field name for files:** `media` (can upload multiple files)
3. **Other fields:** Send as form fields (not JSON)

### Request Structure

```
POST https://kins-crm.vercel.app/api/v1/posts
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

Form Fields:
- type: "image" (or "video")
- content: "Your caption here" (optional)
- interestIds[]: "interestId1"
- interestIds[]: "interestId2"
- media: [file1.jpg] (actual file)
- media: [file2.jpg] (optional, up to 10 files)
```

---

## 📱 How to Send from Different Platforms

### 1. cURL (Command Line)

```bash
curl -X POST https://kins-crm.vercel.app/api/v1/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "type=image" \
  -F "content=Beautiful sunset today!" \
  -F "interestIds[]=INTEREST_ID_1" \
  -F "interestIds[]=INTEREST_ID_2" \
  -F "media=@/path/to/image1.jpg" \
  -F "media=@/path/to/image2.jpg"
```

**For video:**
```bash
curl -X POST https://kins-crm.vercel.app/api/v1/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "type=video" \
  -F "content=Check out this video!" \
  -F "interestIds[]=INTEREST_ID_1" \
  -F "media=@/path/to/video.mp4"
```

---

### 2. Postman

1. **Select POST method**
2. **URL:** `https://kins-crm.vercel.app/api/v1/posts`
3. **Headers:**
   - Add `Authorization: Bearer YOUR_JWT_TOKEN`
   - Do NOT add `Content-Type` (Postman adds it automatically)
4. **Body:**
   - Select `form-data` (not raw JSON)
   - Add fields:
     ```
     Key: type          Value: image         (Text)
     Key: content       Value: Your caption  (Text)
     Key: interestIds[] Value: interestId1   (Text)
     Key: interestIds[] Value: interestId2   (Text)
     Key: media         Value: [Select File] (File)
     Key: media         Value: [Select File] (File) - optional
     ```

---

### 3. JavaScript (Fetch API)

```javascript
const formData = new FormData();
formData.append('type', 'image');
formData.append('content', 'Beautiful sunset!');
formData.append('interestIds[]', 'interestId1');
formData.append('interestIds[]', 'interestId2');

// Add files from input element
const fileInput = document.getElementById('imageInput');
for (let file of fileInput.files) {
  formData.append('media', file);
}

const response = await fetch('https://kins-crm.vercel.app/api/v1/posts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    // Do NOT set Content-Type - browser sets it automatically with boundary
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

---

### 4. JavaScript (Axios)

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const formData = new FormData();
formData.append('type', 'image');
formData.append('content', 'Amazing photo!');
formData.append('interestIds[]', 'interestId1');
formData.append('interestIds[]', 'interestId2');

// Append files
formData.append('media', fs.createReadStream('/path/to/image.jpg'));

const response = await axios.post(
  'https://kins-crm.vercel.app/api/v1/posts',
  formData,
  {
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
      ...formData.getHeaders() // Important: includes Content-Type with boundary
    }
  }
);

console.log(response.data);
```

---

### 5. Python (Requests)

```python
import requests

url = 'https://kins-crm.vercel.app/api/v1/posts'
headers = {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
}

# Don't set Content-Type in headers - requests will set it automatically

data = {
    'type': 'image',
    'content': 'Beautiful sunset!',
    'interestIds[]': ['interestId1', 'interestId2']
}

files = {
    'media': ('image1.jpg', open('/path/to/image1.jpg', 'rb'), 'image/jpeg'),
    'media': ('image2.jpg', open('/path/to/image2.jpg', 'rb'), 'image/jpeg')
}

response = requests.post(url, headers=headers, data=data, files=files)
print(response.json())
```

---

### 6. Flutter/Dart

```dart
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

Future<void> uploadImagePost() async {
  var uri = Uri.parse('https://kins-crm.vercel.app/api/v1/posts');
  var request = http.MultipartRequest('POST', uri);
  
  // Add headers
  request.headers['Authorization'] = 'Bearer YOUR_JWT_TOKEN';
  
  // Add fields
  request.fields['type'] = 'image';
  request.fields['content'] = 'Beautiful sunset!';
  request.fields['interestIds[]'] = 'interestId1';
  request.fields['interestIds[]'] = 'interestId2';
  
  // Add files
  request.files.add(await http.MultipartFile.fromPath(
    'media',
    '/path/to/image.jpg',
    contentType: MediaType('image', 'jpeg'),
  ));
  
  // Send request
  var response = await request.send();
  var responseData = await response.stream.bytesToString();
  print(responseData);
}
```

---

### 7. React Native (with react-native-image-picker)

```javascript
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

const uploadImage = async () => {
  // Pick image
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
  });

  if (result.assets && result.assets[0]) {
    const image = result.assets[0];
    
    const formData = new FormData();
    formData.append('type', 'image');
    formData.append('content', 'My photo!');
    formData.append('interestIds[]', 'interestId1');
    formData.append('media', {
      uri: image.uri,
      type: image.type,
      name: image.fileName,
    });

    try {
      const response = await axios.post(
        'https://kins-crm.vercel.app/api/v1/posts',
        formData,
        {
          headers: {
            'Authorization': 'Bearer YOUR_JWT_TOKEN',
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      console.log('Success:', response.data);
    } catch (error) {
      console.error('Error:', error.response?.data);
    }
  }
};
```

---

## 📋 Supported File Types

### Images
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)

### Videos
- MP4 (`.mp4`)
- QuickTime (`.mov`)
- AVI (`.avi`)

**Max file size:** 100MB per file  
**Max files:** 10 files per post

---

## ⚠️ Common Mistakes

### ❌ WRONG: Using JSON

```javascript
// This will NOT work for image posts!
fetch('https://kins-crm.vercel.app/api/v1/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer TOKEN'
  },
  body: JSON.stringify({
    type: 'image',
    content: 'My photo',
    interestIds: ['id1']
    // Missing: actual file!
  })
});
```

**Error:** `"image post requires media files"`

### ❌ WRONG: Wrong field name

```javascript
// Field name must be 'media' not 'image' or 'file'
formData.append('image', file); // WRONG
formData.append('file', file);  // WRONG
formData.append('media', file); // CORRECT ✅
```

### ❌ WRONG: Setting Content-Type manually

```javascript
// Don't do this - browser/library sets it automatically with boundary
headers: {
  'Content-Type': 'multipart/form-data' // WRONG - missing boundary
}

// Instead, let it be set automatically or include boundary:
headers: {
  'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary...'
}
```

---

## 🎯 Complete Working Example (cURL)

### Test Locally

1. **Get your JWT token:**
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"provider":"phone","providerUserId":"+1234567890","name":"Test"}' \
  | jq -r '.token')

echo $TOKEN
```

2. **Get an interest ID:**
```bash
INTEREST_ID=$(curl -s http://localhost:3000/api/v1/interests | jq -r '.interests[0].id')

echo $INTEREST_ID
```

3. **Upload image post:**
```bash
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer $TOKEN" \
  -F "type=image" \
  -F "content=Test image post!" \
  -F "interestIds[]=$INTEREST_ID" \
  -F "media=@/path/to/your/image.jpg"
```

---

## 📖 For Text/Poll Posts (Use JSON)

**Text and poll posts** use regular JSON (not multipart/form-data):

```bash
# Text post (JSON)
curl -X POST https://kins-crm.vercel.app/api/v1/posts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": "Hello world!",
    "interestIds": ["interestId1"]
  }'

# Poll post (JSON)
curl -X POST https://kins-crm.vercel.app/api/v1/posts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "poll",
    "poll": {
      "question": "Favorite color?",
      "options": [{"text": "Red"}, {"text": "Blue"}]
    },
    "interestIds": ["interestId1"]
  }'
```

---

## 📊 Summary Table

| Post Type | Content-Type | Files Required | Format |
|-----------|-------------|----------------|--------|
| **text** | `application/json` | ❌ No | JSON |
| **image** | `multipart/form-data` | ✅ Yes | FormData |
| **video** | `multipart/form-data` | ✅ Yes | FormData |
| **poll** | `application/json` | ❌ No | JSON |

---

## 🔧 Troubleshooting

### Error: "image post requires media files"
**Solution:** Use `multipart/form-data` and include files with field name `media`

### Error: "Invalid file type"
**Solution:** Only upload JPEG, PNG, GIF, WebP images or MP4, MOV, AVI videos

### Error: "Media upload not configured (Bunny CDN)"
**Solution:** Bunny CDN env vars not set on server. Contact backend team.

### Files upload but URL is missing
**Solution:** Check Bunny CDN configuration (BUNNY_STORAGE_ZONE, BUNNY_ACCESS_KEY, BUNNY_CDN_URL)

---

## 🚀 Quick Start (Postman)

1. Open Postman
2. POST → `https://kins-crm.vercel.app/api/v1/posts`
3. Headers → Add `Authorization: Bearer YOUR_TOKEN`
4. Body → Select `form-data`
5. Add:
   - `type` = `image` (Text)
   - `content` = `Your caption` (Text)
   - `interestIds[]` = `YOUR_INTEREST_ID` (Text)
   - `media` = Select File (File)
6. Click Send

You should get a 201 response with the post including CDN URLs!

---

**Need help?** Check the logs or contact the backend team if Bunny CDN is not configured.

# Kindash

A comprehensive Customer Relationship Management (CRM) system for managing KINS mobile app users, built with Node.js backend and React frontend.

## 🚀 Features

### Backend API
- ✅ **User Management** - Complete CRUD operations for users
- ✅ **Interests Management** - Admin-controlled interests with user selection (max 10)
- ✅ **Document Management** - View and manage user documents
- ✅ **Push Notifications** - Firebase Cloud Messaging (FCM) integration
- ✅ **Analytics & Statistics** - User statistics and analytics
- ✅ **Search & Filter** - Advanced user search and filtering

### Frontend Dashboard
- ✅ **Dashboard** - Overview with charts and statistics
- ✅ **User Management** - View, search, filter, and manage users
- ✅ **Interests Management** - Create and manage interests
- ✅ **Notifications** - Send push notifications and view history
- ✅ **Documents** - Browse and download user documents
- ✅ **Analytics** - Detailed charts and reports
- ✅ **Settings** - System configuration

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase project with Firestore enabled
- Firebase service account key

## 🔧 Installation

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/otahir-21/kins-CRM.git
   cd kins-CRM
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select project: **kins-b4afb**
   - Go to **Project Settings** → **Service Accounts**
   - Click **Generate New Private Key**
   - Save the JSON file as `serviceAccountKey.json` in the root directory

4. **Configure environment variables** (optional)
   ```bash
   cp .env.example .env
   ```
   Edit `.env` if needed (defaults are already set)

5. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

The backend API will be available at `http://localhost:3000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

## 🔐 Default Login Credentials

- **Email**: `admin@kins.com`
- **Password**: `password123`

## 📡 API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:userId` - Get user by ID
- `GET /api/users/search/:term` - Search users
- `GET /api/users/filter/gender/:gender` - Filter by gender
- `PUT /api/users/:userId` - Update user

### Interests
- `POST /api/interests` - Create interest
- `GET /api/interests` - Get all interests
- `PUT /api/interests/:id` - Update interest
- `DELETE /api/interests/:id` - Delete interest
- `POST /api/users/:userId/interests` - Add interest to user
- `GET /api/users/:userId/interests` - Get user's interests

### Notifications
- `POST /api/notifications/send` - Send notification
- `POST /api/notifications/send-bulk` - Send bulk notifications
- `GET /api/users/:userId/notifications` - Get user notifications
- `PUT /api/users/:userId/notifications/:id/read` - Mark as read

### Statistics
- `GET /api/statistics` - Get user statistics

See [INTERESTS_API.md](./INTERESTS_API.md) for detailed API documentation.

## 📁 Project Structure

```
kins-CRM/
├── server.js                  # Express API server
├── firebase-config.js         # Firebase Admin SDK setup
├── data-helpers.js            # User data functions
├── interests-helpers.js       # Interests CRUD operations
├── notifications-helpers.js    # FCM notification functions
├── package.json               # Backend dependencies
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
│
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── utils/            # Utility functions
│   │   └── App.jsx           # Main app component
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite configuration
│
└── README.md                  # This file
```

## 🗂️ Firebase Structure

### Collections
- `users/{userId}` - User profiles
- `users/{userId}/documents/{docId}` - User documents
- `users/{userId}/notifications/{notifId}` - User notifications
- `interests/{interestId}` - Available interests

### User Document Structure
```javascript
{
  "name": "string",
  "gender": "male" | "female" | "other",
  "phoneNumber": "string",
  "documentUrl": "string | null",
  "interests": ["string"],  // Array of interest IDs (max 10)
  "fcmToken": "string | null",
  "updatedAt": "timestamp"
}
```

## 🎨 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Firebase Admin SDK** - Firebase integration
- **CORS** - Cross-origin resource sharing

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Recharts** - Charts and graphs
- **Axios** - HTTP client
- **Lucide React** - Icons

## 🔔 Notification System

The system supports Firebase Cloud Messaging (FCM) for push notifications:

1. **FCM Token Management** - Store and manage user FCM tokens
2. **Send Notifications** - Send push notifications from CRM
3. **Notification History** - View all sent notifications
4. **Read/Unread Tracking** - Track notification status

### Notification Types
- `system` - System/admin notifications
- `liked_post` - User liked a post
- `commented_post` - User commented
- `followed_you` - User followed you
- `message` - New message
- `document_approved` - Document verification
- `interest_match` - Interest match

## 📊 Features in Detail

### User Management
- View all users with complete information
- Search users by name or phone number
- Filter by gender or document status
- View detailed user profiles
- See user interests and documents

### Interests Management
- Create and manage interests (admin only)
- Users can select up to 10 interests
- Activate/deactivate interests
- Search and filter interests

### Analytics Dashboard
- User growth charts
- Gender distribution
- Document upload statistics
- Weekly activity reports

## 🛠️ Development

### Backend Development
```bash
npm run dev  # Start with nodemon (auto-reload)
```

### Frontend Development
```bash
cd frontend
npm run dev  # Start Vite dev server
```

### Build for Production
```bash
# Backend
npm start

# Frontend
cd frontend
npm run build
```

## 🔒 Security Notes

1. **Never commit `serviceAccountKey.json`** - It's in `.gitignore`
2. **Use environment variables** for sensitive data in production
3. **Add API authentication** before deploying to production
4. **Implement rate limiting** for API endpoints
5. **Set up CORS** properly for your frontend domain

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
FIREBASE_PROJECT_ID=kins-b4afb
FIREBASE_STORAGE_BUCKET=kins-b4afb.firebasestorage.app
PORT=3000
NODE_ENV=development
```

## 🐛 Troubleshooting

### Backend Issues
- **Port 3000 already in use**: Kill the process or change PORT in `.env`
- **Firebase connection error**: Check service account key and project ID
- **Module not found**: Run `npm install` again

### Frontend Issues
- **Port 5173 already in use**: Change port in `vite.config.js`
- **API connection errors**: Ensure backend is running on port 3000
- **Build errors**: Clear `node_modules` and reinstall

## 📚 Documentation

- [Interests API Documentation](./INTERESTS_API.md) - Complete API reference for interests
- [Firebase Setup Guide](./README.md#installation) - Firebase configuration
- API endpoints are documented in the root endpoint: `GET /`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

ISC

## 👥 Authors

- **KINS Development Team**

## 🙏 Acknowledgments

- Firebase for backend services
- React community for excellent tools
- All contributors and users

---

**Last Updated**: January 23, 2026  
**Version**: 1.0.0  
**Firebase Project**: kins-b4afb

# KINS CRM Frontend

React-based frontend application for the KINS CRM system.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

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

The application will be available at `http://localhost:5173`

## 📱 Features

### Screens

1. **Splash Screen** (`/splash`)
   - Animated loading screen
   - Auto-redirects to login or dashboard

2. **Login Screen** (`/login`)
   - Hardcoded credentials:
     - Email: `admin@kins.com`
     - Password: `password123`
   - Form validation
   - Error handling

3. **Dashboard** (`/dashboard`)
   - Overview statistics cards
   - User growth chart (line chart)
   - Document uploads chart (bar chart)
   - Gender distribution (pie chart)
   - Real-time data from API

4. **Navigation Sidebar**
   - Dashboard
   - Users
   - Documents
   - Analytics
   - Settings
   - Logout

## 🛠️ Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Recharts** - Charts and graphs
- **Lucide React** - Icons
- **Axios** - HTTP client

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── SplashScreen.jsx
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Layout.jsx
│   │   └── ProtectedRoute.jsx
│   ├── utils/
│   │   ├── api.js
│   │   └── auth.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🔐 Authentication

The app uses localStorage for authentication state. Credentials are hardcoded:
- Email: `admin@kins.com`
- Password: `password123`

## 📊 API Integration

The frontend connects to the backend API at `http://localhost:3000`. Make sure the backend server is running.

API endpoints used:
- `/api/users` - Get all users
- `/api/statistics` - Get statistics
- `/health` - Health check

## 🎨 Styling

The app uses Tailwind CSS with a custom color scheme:
- Primary color: Blue (#0ea5e9)
- Responsive design
- Modern UI components

## 🚀 Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 📝 Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3000
```

## 🐛 Troubleshooting

### Port already in use
Change the port in `vite.config.js` or use:
```bash
npm run dev -- --port 5174
```

### API connection issues
- Ensure backend server is running on port 3000
- Check CORS settings in backend
- Verify API URL in `.env` file

---

**Last Updated**: January 23, 2026

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Users from './components/Users';
import UserDetail from './components/UserDetail';
import Documents from './components/Documents';
import Interests from './components/Interests';
import Surveys from './components/Surveys';
import SurveyAnalytics from './components/SurveyAnalytics';
import Notifications from './components/Notifications';
import PostsModeration from './components/PostsModeration';
import Onboarding from './components/Onboarding';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Groups from './components/Groups';
import GroupChat from './components/GroupChat';
import Ads from './components/Ads';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/:userId" element={<UserDetail />} />
          <Route path="/users/:userId/notifications" element={<Notifications />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/interests" element={<Interests />} />
          <Route path="/surveys" element={<Surveys />} />
          <Route path="/surveys/:surveyId/analytics" element={<SurveyAnalytics />} />
          <Route path="/posts-moderation" element={<PostsModeration />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/ads" element={<Ads />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:groupId/chat" element={<GroupChat />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="*" element={<Navigate to="/splash" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

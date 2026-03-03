import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  UserCheck,
  Calendar,
  TrendingUp,
  MessageCircle,
  ThumbsUp,
  FileText,
  Download,
  Loader,
} from 'lucide-react';
import { apiService } from '../utils/api';

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setError(null);
      const response = await apiService.getStatistics();
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-12 h-12 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
          <p className="font-medium">Could not load analytics</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const s = stats || {};
  const tau = s.totalRegisteredUsers ?? 0;
  const dau = s.dailyActiveUsers ?? 0;
  const wau = s.weeklyActiveUsers ?? 0;
  const mau = s.monthlyActiveUsers ?? 0;
  const activationRate = s.activationRate ?? 0;
  const newPosts = s.newPosts || { daily: 0, weekly: 0, monthly: 0 };
  const newPostsMp = s.newPostsMarketplace || { daily: 0, weekly: 0, monthly: 0 };
  const newGroups = s.newGroups || { daily: 0, weekly: 0, monthly: 0 };
  const totalPosts = s.totalAggregatePosts ?? 0;
  const totalLikes = s.totalAggregateLikes ?? 0;
  const totalComments = s.totalAggregateComments ?? 0;

  const newPostsChart = [
    { period: 'Daily', feed: newPosts.daily, marketplace: newPostsMp.daily },
    { period: 'Weekly', feed: newPosts.weekly, marketplace: newPostsMp.weekly },
    { period: 'Monthly', feed: newPosts.monthly, marketplace: newPostsMp.monthly },
  ];
  const newGroupsChart = [
    { period: 'Daily', count: newGroups.daily },
    { period: 'Weekly', count: newGroups.weekly },
    { period: 'Monthly', count: newGroups.monthly },
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-600 mt-2">Key platform metrics — users, activity, posts, and engagement</p>
        </div>
        <button
          type="button"
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          onClick={fetchAnalytics}
        >
          <Download className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Users */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Users</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Registered (TAU)</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{tau.toLocaleString()}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Monthly Active (MAU)</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{mau.toLocaleString()}</p>
              </div>
              <UserCheck className="w-10 h-10 text-indigo-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Weekly Active (WAU)</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{wau.toLocaleString()}</p>
              </div>
              <Calendar className="w-10 h-10 text-cyan-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Daily Active (DAU)</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{dau.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-emerald-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Activation Rate</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{activationRate}%</p>
                <p className="text-gray-500 text-xs mt-1">Posted in first 7 days</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Posts & New Groups */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">New content</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">New Posts (Feed / Marketplace)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={newPostsChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="feed" name="Feed" fill="#0ea5e9" />
                <Bar dataKey="marketplace" name="Marketplace" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">New Groups</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={newGroupsChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Groups" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Totals */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Total aggregate</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Posts</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{totalPosts.toLocaleString()}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Likes</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{totalLikes.toLocaleString()}</p>
              </div>
              <ThumbsUp className="w-10 h-10 text-rose-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Comments</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{totalComments.toLocaleString()}</p>
              </div>
              <MessageCircle className="w-10 h-10 text-amber-500" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Analytics;

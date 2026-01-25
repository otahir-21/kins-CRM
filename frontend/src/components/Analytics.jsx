import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { TrendingUp, Users, FileText, Calendar, Download } from 'lucide-react';
import { apiService } from '../utils/api';

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await apiService.getStatistics();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setStats({
        totalUsers: 150,
        usersByGender: { male: 85, female: 60, other: 5 },
        usersWithDocuments: 120,
        usersWithoutDocuments: 30
      });
    } finally {
      setLoading(false);
    }
  };

  // Dummy data for various charts
  const monthlyUserGrowth = [
    { month: 'Jan', users: 45, new: 5 },
    { month: 'Feb', users: 52, new: 7 },
    { month: 'Mar', users: 68, new: 16 },
    { month: 'Apr', users: 75, new: 7 },
    { month: 'May', users: 88, new: 13 },
    { month: 'Jun', users: 95, new: 7 },
    { month: 'Jul', users: 110, new: 15 },
    { month: 'Aug', users: 125, new: 15 },
    { month: 'Sep', users: 135, new: 10 },
    { month: 'Oct', users: 142, new: 7 },
    { month: 'Nov', users: 148, new: 6 },
    { month: 'Dec', users: stats?.totalUsers || 150, new: 2 },
  ];

  const documentUploadTrend = [
    { month: 'Jan', uploads: 12, pending: 8 },
    { month: 'Feb', uploads: 18, pending: 5 },
    { month: 'Mar', uploads: 25, pending: 3 },
    { month: 'Apr', uploads: 30, pending: 2 },
    { month: 'May', uploads: 35, pending: 1 },
    { month: 'Jun', uploads: 42, pending: 0 },
    { month: 'Jul', uploads: 48, pending: 0 },
    { month: 'Aug', uploads: 55, pending: 0 },
    { month: 'Sep', uploads: 62, pending: 0 },
    { month: 'Oct', uploads: 68, pending: 0 },
    { month: 'Nov', uploads: 75, pending: 0 },
    { month: 'Dec', uploads: 82, pending: 0 },
  ];

  const genderData = stats?.usersByGender ? [
    { name: 'Male', value: stats.usersByGender.male, color: '#0ea5e9' },
    { name: 'Female', value: stats.usersByGender.female, color: '#ec4899' },
    { name: 'Other', value: stats.usersByGender.other, color: '#8b5cf6' },
  ] : [
    { name: 'Male', value: 85, color: '#0ea5e9' },
    { name: 'Female', value: 60, color: '#ec4899' },
    { name: 'Other', value: 5, color: '#8b5cf6' },
  ];

  const documentStatusData = [
    { name: 'With Documents', value: stats?.usersWithDocuments || 120, color: '#10b981' },
    { name: 'Without Documents', value: stats?.usersWithoutDocuments || 30, color: '#ef4444' },
  ];

  const dailyActivity = [
    { day: 'Mon', signups: 3, uploads: 5 },
    { day: 'Tue', signups: 5, uploads: 8 },
    { day: 'Wed', signups: 2, uploads: 4 },
    { day: 'Thu', signups: 4, uploads: 6 },
    { day: 'Fri', signups: 6, uploads: 9 },
    { day: 'Sat', signups: 1, uploads: 2 },
    { day: 'Sun', signups: 2, uploads: 3 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-600 mt-2">Detailed insights and statistics</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats?.totalUsers || 150}</p>
              <p className="text-green-600 text-sm mt-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                +12% this month
              </p>
            </div>
            <Users className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Documents</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats?.usersWithDocuments || 120}</p>
              <p className="text-green-600 text-sm mt-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                +8% this month
              </p>
            </div>
            <FileText className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {stats ? Math.round((stats.usersWithDocuments / stats.totalUsers) * 100) : 80}%
              </p>
              <p className="text-gray-600 text-sm mt-2">Document upload</p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats?.usersWithoutDocuments || 30}</p>
              <p className="text-red-600 text-sm mt-2">Need documents</p>
            </div>
            <Calendar className="w-12 h-12 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth Area Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">User Growth Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyUserGrowth}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="users" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorUsers)" name="Total Users" />
              <Line type="monotone" dataKey="new" stroke="#10b981" strokeWidth={2} name="New Users" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Document Upload Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Document Upload Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={documentUploadTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="uploads" fill="#10b981" name="Uploaded" />
              <Bar dataKey="pending" fill="#ef4444" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* More Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gender Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Gender Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Document Status */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Document Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={documentStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {documentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Weekly Activity</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="signups" fill="#0ea5e9" name="New Signups" />
            <Bar dataKey="uploads" fill="#10b981" name="Document Uploads" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analytics;

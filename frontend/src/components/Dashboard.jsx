import { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  FileText, 
  UserPlus,
} from 'lucide-react';
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
  ResponsiveContainer
} from 'recharts';
import { apiService } from '../utils/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiService.getStatistics();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Dummy data for charts
  const totalUsers = stats?.totalRegisteredUsers ?? stats?.totalUsers ?? 0;
  const userGrowthData = [
    { month: 'Jan', users: Math.round(totalUsers * 0.3) },
    { month: 'Feb', users: Math.round(totalUsers * 0.35) },
    { month: 'Mar', users: Math.round(totalUsers * 0.45) },
    { month: 'Apr', users: Math.round(totalUsers * 0.5) },
    { month: 'May', users: Math.round(totalUsers * 0.6) },
    { month: 'Jun', users: Math.round(totalUsers * 0.65) },
    { month: 'Jul', users: Math.round(totalUsers * 0.75) },
    { month: 'Aug', users: Math.round(totalUsers * 0.85) },
    { month: 'Sep', users: Math.round(totalUsers * 0.9) },
    { month: 'Oct', users: Math.round(totalUsers * 0.95) },
    { month: 'Nov', users: Math.round(totalUsers * 0.98) },
    { month: 'Dec', users: totalUsers },
  ];

  const g = stats?.usersByGender || {};
  const genderData = [
    { name: 'Male', value: g.male ?? 0, color: '#0ea5e9' },
    { name: 'Female', value: g.female ?? 0, color: '#ec4899' },
    { name: 'Other', value: g.other ?? 0, color: '#8b5cf6' },
    { name: 'Unknown', value: g.unknown ?? 0, color: '#94a3b8' },
  ].filter((d) => d.value > 0);

  const statCards = [
    {
      title: 'Total Registered (TAU)',
      value: stats?.totalRegisteredUsers ?? stats?.totalUsers ?? 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Monthly Active (MAU)',
      value: stats?.monthlyActiveUsers ?? 0,
      icon: UserCheck,
      color: 'bg-green-500',
    },
    {
      title: 'New Posts (Month)',
      value: stats?.newPosts?.monthly ?? 0,
      icon: FileText,
      color: 'bg-purple-500',
    },
    {
      title: 'New Groups (Month)',
      value: stats?.newGroups?.monthly ?? 0,
      icon: UserPlus,
      color: 'bg-orange-500',
    },
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with your users.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{card.value}</p>
                </div>
                <div className={`${card.color} p-4 rounded-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">User Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#0ea5e9" 
                strokeWidth={2}
                name="Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Active users snapshot */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Active users (snapshot)</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-800">{stats?.monthlyActiveUsers ?? 0}</p>
              <p className="text-sm text-gray-600">MAU</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-800">{stats?.weeklyActiveUsers ?? 0}</p>
              <p className="text-sm text-gray-600">WAU</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-800">{stats?.dailyActiveUsers ?? 0}</p>
              <p className="text-sm text-gray-600">DAU</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gender Distribution */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">User Distribution by Gender</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className="flex flex-col justify-center space-y-4">
            {genderData.map((item, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  <p className="text-gray-600 text-sm">{item.value} users</p>
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {totalUsers > 0 ? ((item.value / totalUsers) * 100).toFixed(1) : 0}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

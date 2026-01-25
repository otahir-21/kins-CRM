import { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  FileText, 
  TrendingUp,
  UserPlus,
  FileCheck
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
      // Use dummy data if API fails
      setStats({
        totalUsers: 150,
        usersByGender: {
          male: 85,
          female: 60,
          other: 5,
          unknown: 0
        },
        usersWithDocuments: 120,
        usersWithoutDocuments: 30
      });
    } finally {
      setLoading(false);
    }
  };

  // Dummy data for charts
  const userGrowthData = [
    { month: 'Jan', users: 45 },
    { month: 'Feb', users: 52 },
    { month: 'Mar', users: 68 },
    { month: 'Apr', users: 75 },
    { month: 'May', users: 88 },
    { month: 'Jun', users: 95 },
    { month: 'Jul', users: 110 },
    { month: 'Aug', users: 125 },
    { month: 'Sep', users: 135 },
    { month: 'Oct', users: 142 },
    { month: 'Nov', users: 148 },
    { month: 'Dec', users: stats?.totalUsers || 150 },
  ];

  const documentUploadData = [
    { month: 'Jan', uploads: 12 },
    { month: 'Feb', uploads: 18 },
    { month: 'Mar', uploads: 25 },
    { month: 'Apr', uploads: 30 },
    { month: 'May', uploads: 35 },
    { month: 'Jun', uploads: 42 },
    { month: 'Jul', uploads: 48 },
    { month: 'Aug', uploads: 55 },
    { month: 'Sep', uploads: 62 },
    { month: 'Oct', uploads: 68 },
    { month: 'Nov', uploads: 75 },
    { month: 'Dec', uploads: 82 },
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

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 150,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: 'Users with Documents',
      value: stats?.usersWithDocuments || 120,
      icon: FileCheck,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      title: 'Active Users',
      value: stats?.usersWithDocuments || 120,
      icon: UserCheck,
      color: 'bg-purple-500',
      change: '+15%',
    },
    {
      title: 'New This Month',
      value: 12,
      icon: UserPlus,
      color: 'bg-orange-500',
      change: '+5%',
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
                  <p className="text-green-600 text-sm mt-2 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {card.change} from last month
                  </p>
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

        {/* Document Uploads Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Document Uploads</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={documentUploadData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="uploads" fill="#10b981" name="Uploads" />
            </BarChart>
          </ResponsiveContainer>
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
                  {((item.value / (stats?.totalUsers || 150)) * 100).toFixed(1)}%
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

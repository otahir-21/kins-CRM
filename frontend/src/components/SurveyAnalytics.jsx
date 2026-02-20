import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, TrendingUp, PieChart } from 'lucide-react';
import { apiService } from '../utils/api';
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const SurveyAnalytics = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [surveyId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSurveyAnalytics(surveyId);
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Survey analytics not found</p>
        </div>
      </div>
    );
  }

  const optionStats = Array.isArray(analytics.optionStats) ? analytics.optionStats : [];
  const chartData = optionStats.map((stat, index) => ({
    name: stat.optionText,
    value: stat.count,
    percentage: stat.percentage,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <button
        onClick={() => navigate('/surveys')}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Surveys
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{analytics.surveyTitle}</h1>
        <p className="text-gray-600 mt-2">{analytics.surveyQuestion}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Responses</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{analytics.totalResponses}</p>
            </div>
            <Users className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Options</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{optionStats.length}</p>
            </div>
            <BarChart3 className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Most Popular</p>
              <p className="text-lg font-bold text-gray-800 mt-2">
                {optionStats.length > 0
                  ? optionStats.reduce((max, stat) =>
                      stat.count > max.count ? stat : max
                    ).optionText
                  : 'N/A'}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Response Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#0ea5e9" name="Responses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Response Percentage</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Option Statistics</h2>
        <div className="space-y-4">
          {optionStats.map((stat, index) => (
            <div key={stat.optionId} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="font-medium text-gray-900">{stat.optionText}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-800">{stat.count}</span>
                  <span className="text-gray-600 ml-2">({stat.percentage}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${stat.percentage}%`,
                    backgroundColor: COLORS[index % COLORS.length],
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Responses */}
      {analytics.responses && analytics.responses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Responses</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selected Option</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Answered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.responses.slice(0, 10).map((response, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{response.userId}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{response.selectedOption}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {response.answeredAt
                        ? (response.answeredAt.seconds
                            ? new Date(response.answeredAt.seconds * 1000)
                            : new Date(response.answeredAt)
                          ).toLocaleString()
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyAnalytics;

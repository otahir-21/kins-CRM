import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Mail, Phone, Eye, AlertTriangle } from 'lucide-react';
import { apiService } from '../utils/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllUsers(true);
      setUsers(response.data.data || []);
      setFilteredUsers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Use dummy data if API fails
      const dummyUsers = [
        {
          id: '1',
          name: 'John Doe',
          email: null,
          phoneNumber: '+971507276823',
          auth: { phoneNumber: '+971507276823', creationTime: '2024-01-15' },
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: null,
          phoneNumber: '+971501234567',
          auth: { phoneNumber: '+971501234567', creationTime: '2024-01-20' },
        },
      ];
      setUsers(dummyUsers);
      setFilteredUsers(dummyUsers);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber?.includes(searchTerm) ||
        user.auth?.phoneNumber?.includes(searchTerm)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleViewUser = (userId) => {
    navigate(`/users/${userId}`);
  };

  const getGenderColor = (gender) => {
    switch (gender) {
      case 'male':
        return 'bg-blue-100 text-blue-800';
      case 'female':
        return 'bg-pink-100 text-pink-800';
      case 'other':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-800">Users</h1>
        <p className="text-gray-600 mt-2">Manage and view all registered users</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredUsers.length}</span> of <span className="font-semibold">{users.length}</span> users
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posts</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warnings</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {user.phoneNumber || user.auth?.phoneNumber || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {user.email != null && user.email !== '' ? user.email : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.postsCount != null ? `${user.postsCount} post${user.postsCount !== 1 ? 's' : ''}` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.warningsCount != null ? (
                        <span className={user.warningsCount > 0 ? 'inline-flex items-center text-amber-700' : ''}>
                          {user.warningsCount > 0 && <AlertTriangle className="w-4 h-4 mr-1 text-amber-600" />}
                          {user.warningsCount} warning{user.warningsCount !== 1 ? 's' : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewUser(user.id)}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;

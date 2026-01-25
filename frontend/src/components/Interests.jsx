import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, Tag, Users, Check, X } from 'lucide-react';
import { apiService } from '../utils/api';
import { formatFirestoreDate } from '../utils/dateHelpers';

const Interests = () => {
  const [interests, setInterests] = useState([]);
  const [filteredInterests, setFilteredInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInterest, setEditingInterest] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const [filterActive, setFilterActive] = useState('all');

  useEffect(() => {
    fetchInterests();
  }, []);

  useEffect(() => {
    filterInterests();
  }, [searchTerm, filterActive, interests]);

  const fetchInterests = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllInterests();
      setInterests(response.data.data || []);
      setFilteredInterests(response.data.data || []);
    } catch (error) {
      console.error('Error fetching interests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInterests = () => {
    let filtered = [...interests];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(interest =>
        interest.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Active filter
    if (filterActive === 'active') {
      filtered = filtered.filter(interest => interest.isActive === true);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter(interest => interest.isActive === false);
    }

    setFilteredInterests(filtered);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiService.createInterest(formData);
      setShowAddModal(false);
      setFormData({ name: '' });
      fetchInterests();
    } catch (error) {
      alert(error.response?.data?.error || 'Error creating interest');
    }
  };

  const handleEdit = (interest) => {
    setEditingInterest(interest);
    setFormData({ name: interest.name });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await apiService.updateInterest(editingInterest.id, formData);
      setShowEditModal(false);
      setEditingInterest(null);
      setFormData({ name: '' });
      fetchInterests();
    } catch (error) {
      alert(error.response?.data?.error || 'Error updating interest');
    }
  };

  const handleDelete = async (interestId) => {
    if (!confirm('Are you sure you want to deactivate this interest?')) {
      return;
    }
    try {
      await apiService.deleteInterest(interestId);
      fetchInterests();
    } catch (error) {
      alert(error.response?.data?.error || 'Error deleting interest');
    }
  };

  const handleToggleActive = async (interest) => {
    try {
      await apiService.updateInterest(interest.id, { isActive: !interest.isActive });
      fetchInterests();
    } catch (error) {
      alert(error.response?.data?.error || 'Error updating interest');
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Interests Management</h1>
          <p className="text-gray-600 mt-2">Create and manage available interests for users</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Interest
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search interests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none appearance-none bg-white"
            >
              <option value="all">All Interests</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredInterests.length}</span> of <span className="font-semibold">{interests.length}</span> interests
        </div>
      </div>

      {/* Interests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInterests.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No interests found</p>
          </div>
        ) : (
          filteredInterests.map((interest) => (
            <div
              key={interest.id}
              className={`bg-white rounded-xl shadow-sm p-6 border-2 transition-all ${
                interest.isActive
                  ? 'border-gray-200 hover:border-primary-300'
                  : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${interest.isActive ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <Tag className={`w-6 h-6 ${interest.isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-900">{interest.name}</h3>
                    <p className="text-sm text-gray-500">
                      Created {formatFirestoreDate(interest.createdAt)}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    interest.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {interest.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <button
                  onClick={() => handleToggleActive(interest)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    interest.isActive
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {interest.isActive ? (
                    <>
                      <X className="w-4 h-4 inline mr-1" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 inline mr-1" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleEdit(interest)}
                  className="px-3 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(interest.id)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Interest</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Interest Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="e.g., Technology, Sports, Music"
                  required
                />
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ name: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingInterest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Interest</h2>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Interest Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingInterest(null);
                    setFormData({ name: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interests;

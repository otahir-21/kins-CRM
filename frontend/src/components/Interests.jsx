import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, Tag, FolderOpen, Check, X } from 'lucide-react';
import { apiService } from '../utils/api';
import { formatFirestoreDate } from '../utils/dateHelpers';

const Interests = () => {
  const [categories, setCategories] = useState([]);
  const [uncategorized, setUncategorized] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [addTagCategoryId, setAddTagCategoryId] = useState(null);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [showEditTag, setShowEditTag] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingTag, setEditingTag] = useState(null);

  const [formCategory, setFormCategory] = useState({ name: '', order: 0 });
  const [formTag, setFormTag] = useState({ name: '', categoryId: '' });

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAllInterests(null, true);
      const data = response.data?.data || response.data;
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setUncategorized(Array.isArray(data.uncategorized) ? data.uncategorized : []);
    } catch (err) {
      console.error('Error fetching interests:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load interests.');
      setCategories([]);
      setUncategorized([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTags = (tags) => {
    if (!Array.isArray(tags)) return [];
    let list = [...tags];
    if (searchTerm) {
      list = list.filter((t) => t.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterActive === 'active') list = list.filter((t) => t.isActive === true);
    if (filterActive === 'inactive') list = list.filter((t) => t.isActive === false);
    return list;
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await apiService.createCategory(formCategory);
      setShowAddCategory(false);
      setFormCategory({ name: '', order: 0 });
      fetchInterests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create category.');
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    try {
      await apiService.createInterest({
        name: formTag.name.trim(),
        categoryId: formTag.categoryId || undefined,
      });
      setShowAddTag(false);
      setAddTagCategoryId(null);
      setFormTag({ name: '', categoryId: '' });
      fetchInterests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create tag.');
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await apiService.updateCategory(editingCategory.id, formCategory);
      setShowEditCategory(false);
      setEditingCategory(null);
      setFormCategory({ name: '', order: 0 });
      fetchInterests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update category.');
    }
  };

  const handleUpdateTag = async (e) => {
    e.preventDefault();
    if (!editingTag) return;
    try {
      await apiService.updateInterest(editingTag.id, {
        name: formTag.name.trim(),
        categoryId: formTag.categoryId || null,
      });
      setShowEditTag(false);
      setEditingTag(null);
      setFormTag({ name: '', categoryId: '' });
      fetchInterests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update tag.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Deactivate this category? Its tags will become uncategorized.')) return;
    try {
      await apiService.deleteCategory(id);
      fetchInterests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete category.');
    }
  };

  const handleDeleteTag = async (id) => {
    if (!confirm('Deactivate this tag?')) return;
    try {
      await apiService.deleteInterest(id);
      fetchInterests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete tag.');
    }
  };

  const handleToggleTagActive = async (tag) => {
    try {
      await apiService.updateInterest(tag.id, { isActive: !tag.isActive });
      fetchInterests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update tag.');
    }
  };

  const openAddTag = (categoryId = null) => {
    setAddTagCategoryId(categoryId);
    setFormTag({ name: '', categoryId: categoryId || '' });
    setShowAddTag(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => fetchInterests()} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Topics & Tags</h1>
          <p className="text-gray-600 mt-2">Manage categories and tags (interests) for users</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            Add Category
          </button>
          <button
            onClick={() => openAddTag()}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Tag
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
          >
            <option value="all">All tags</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
      </div>

      <div className="space-y-8">
        {categories.map((cat) => {
          const tags = filterTags(cat.tags || []);
          return (
            <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-800">{cat.name}</h2>
                  <span className="text-sm text-gray-500">({(cat.tags || []).length} tags)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAddTag(cat.id)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                    title="Add tag to this category"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button onClick={() => { setEditingCategory(cat); setFormCategory({ name: cat.name, order: cat.order ?? 0 }); setShowEditCategory(true); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tags in this category</p>
                ) : (
                  tags.map((tag) => (
                    <div
                      key={tag.id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                        tag.isActive ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-200 opacity-70'
                      }`}
                    >
                      <Tag className={`w-4 h-4 ${tag.isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                      <span className="font-medium text-gray-800">{tag.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${tag.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                        {tag.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button onClick={() => handleToggleTagActive(tag)} className="p-1 hover:bg-white/50 rounded" title={tag.isActive ? 'Deactivate' : 'Activate'}>
                        {tag.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { setEditingTag(tag); setFormTag({ name: tag.name, categoryId: cat.id }); setShowEditTag(true); }} className="p-1 text-primary-600 hover:bg-primary-100 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTag(tag.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}

        {uncategorized.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-amber-50 border-b border-amber-200">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-gray-800">Uncategorized</h2>
                <span className="text-sm text-gray-500">({uncategorized.length} tags)</span>
              </div>
              <button onClick={() => openAddTag(null)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg" title="Add uncategorized tag">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {filterTags(uncategorized).map((tag) => (
                <div
                  key={tag.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                    tag.isActive ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200 opacity-70'
                  }`}
                >
                  <Tag className={`w-4 h-4 ${tag.isActive ? 'text-amber-600' : 'text-gray-400'}`} />
                  <span className="font-medium text-gray-800">{tag.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${tag.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                    {tag.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => handleToggleTagActive(tag)} className="p-1 hover:bg-white/50 rounded">{tag.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}</button>
                  <button onClick={() => { setEditingTag(tag); setFormTag({ name: tag.name, categoryId: '' }); setShowEditTag(true); }} className="p-1 text-primary-600 hover:bg-primary-100 rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteTag(tag.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {categories.length === 0 && uncategorized.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No categories or tags yet</p>
            <p className="text-gray-500 mt-2">Add a category, then add tags inside it.</p>
            <div className="mt-6 flex justify-center gap-4">
              <button onClick={() => setShowAddCategory(true)} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">
                Add Category
              </button>
              <button onClick={() => openAddTag()} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Add Tag (uncategorized)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Category</h2>
            <form onSubmit={handleCreateCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category name</label>
                <input
                  type="text"
                  value={formCategory.name}
                  onChange={(e) => setFormCategory((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Health, Lifestyle"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Order (number)</label>
                <input
                  type="number"
                  value={formCategory.order}
                  onChange={(e) => setFormCategory((p) => ({ ...p, order: Number(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">Create</button>
                <button type="button" onClick={() => { setShowAddCategory(false); setFormCategory({ name: '', order: 0 }); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategory && editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Category</h2>
            <form onSubmit={handleUpdateCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category name</label>
                <input
                  type="text"
                  value={formCategory.name}
                  onChange={(e) => setFormCategory((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                <input
                  type="number"
                  value={formCategory.order}
                  onChange={(e) => setFormCategory((p) => ({ ...p, order: Number(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Update</button>
                <button type="button" onClick={() => { setShowEditCategory(false); setEditingCategory(null); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tag Modal */}
      {showAddTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Tag</h2>
            <form onSubmit={handleCreateTag}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formTag.categoryId}
                  onChange={(e) => setFormTag((p) => ({ ...p, categoryId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tag name</label>
                <input
                  type="text"
                  value={formTag.name}
                  onChange={(e) => setFormTag((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Sleep, Fitness"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Create</button>
                <button type="button" onClick={() => { setShowAddTag(false); setFormTag({ name: '', categoryId: '' }); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tag Modal */}
      {showEditTag && editingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Tag</h2>
            <form onSubmit={handleUpdateTag}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formTag.categoryId}
                  onChange={(e) => setFormTag((p) => ({ ...p, categoryId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tag name</label>
                <input
                  type="text"
                  value={formTag.name}
                  onChange={(e) => setFormTag((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Update</button>
                <button type="button" onClick={() => { setShowEditTag(false); setEditingTag(null); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interests;

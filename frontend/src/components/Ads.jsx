import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Image as ImageIcon, ExternalLink, Loader } from 'lucide-react';
import { apiService } from '../utils/api';

export default function Ads() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ link: '', title: '', isActive: true, order: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const res = await apiService.getAds({ limit: 50 });
      setAds(res.data.ads || []);
    } catch (err) {
      console.error(err);
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ link: '', title: '', isActive: true, order: '' });
    setImageFile(null);
    setImagePreview(null);
    setEditingAd(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (ad) => {
    setEditingAd(ad);
    setFormData({
      link: ad.link || '',
      title: ad.title || '',
      isActive: ad.isActive !== false,
      order: ad.order != null ? String(ad.order) : '',
    });
    setImagePreview(ad.imageUrl || null);
    setImageFile(null);
    setShowModal(true);
  };

  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    setImageFile(file || null);
    setImagePreview(file ? URL.createObjectURL(file) : (editingAd?.imageUrl || null));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const link = formData.link.trim();
    if (!link) {
      alert('Link is required.');
      return;
    }
    if (!editingAd && !imageFile) {
      alert('Please select an image for the ad.');
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('link', link);
      if (formData.title) fd.append('title', formData.title.trim());
      fd.append('isActive', formData.isActive);
      if (formData.order !== '') fd.append('order', formData.order);
      if (imageFile) fd.append('image', imageFile);

      if (editingAd) {
        await apiService.updateAd(editingAd.id, fd);
      } else {
        await apiService.createAd(fd);
      }
      setShowModal(false);
      resetForm();
      fetchAds();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to save ad.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ad) => {
    if (!window.confirm('Delete this ad?')) return;
    try {
      await apiService.deleteAd(ad.id);
      fetchAds();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to delete.');
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Ads</h1>
          <p className="text-gray-600 mt-1">Upload image ads. They appear in the mobile app; tapping opens the link.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Ad
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : ads.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No ads yet. Click &quot;Add Ad&quot; to upload an image and set the link.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad) => (
            <div key={ad.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="aspect-video bg-gray-100 relative">
                {ad.imageUrl ? (
                  <img src={ad.imageUrl} alt={ad.title || 'Ad'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                {!ad.isActive && (
                  <span className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">Inactive</span>
                )}
              </div>
              <div className="p-4">
                {ad.title && <p className="font-medium text-gray-800 truncate">{ad.title}</p>}
                <a href={ad.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 truncate block flex items-center gap-1 mt-1">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  {ad.link}
                </a>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(ad)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => handleDelete(ad)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">{editingAd ? 'Edit Ad' : 'New Ad'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image *</label>
                  <input type="file" accept="image/*" onChange={onImageChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700" />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="mt-2 h-32 object-cover rounded border border-gray-200" />
                  )}
                  {editingAd && !imageFile && <p className="text-xs text-gray-500 mt-1">Leave empty to keep current image.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link (URL when user taps) *</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData((f) => ({ ...f, link: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Ad title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Active (show in app)</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order (optional, lower = first)</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData((f) => ({ ...f, order: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader className="w-4 h-4 animate-spin" /> : null}
                    {editingAd ? 'Update' : 'Create'}
                  </button>
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

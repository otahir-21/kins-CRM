import { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2, Image as ImageIcon, Loader, BookOpen, Upload } from 'lucide-react';
import { apiService } from '../utils/api';

const Onboarding = () => {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    order: '',
    isActive: true,
  });

  useEffect(() => {
    fetchSteps();
  }, []);

  const fetchSteps = async () => {
    try {
      setLoading(true);
      const res = await apiService.getOnboardingSteps(false);
      setSteps(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      imageUrl: '',
      order: '',
      isActive: true,
    });
    setEditingStep(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEdit = (step) => {
    setEditingStep(step);
    setFormData({
      title: step.title ?? '',
      subtitle: step.subtitle ?? '',
      description: step.description ?? '',
      imageUrl: step.imageUrl ?? '',
      order: step.order ?? '',
      isActive: step.isActive !== false,
    });
    setShowEditModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        description: formData.description.trim(),
        imageUrl: formData.imageUrl.trim(),
        isActive: formData.isActive,
      };
      if (formData.order !== '' && formData.order !== null) {
        payload.order = Number(formData.order);
      }
      await apiService.createOnboardingStep(payload);
      setShowAddModal(false);
      resetForm();
      fetchSteps();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to create step');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingStep) return;
    try {
      setSaving(true);
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        description: formData.description.trim(),
        imageUrl: formData.imageUrl.trim(),
        isActive: formData.isActive,
      };
      if (formData.order !== '' && formData.order !== null) {
        payload.order = Number(formData.order);
      }
      await apiService.updateOnboardingStep(editingStep.id, payload);
      setShowEditModal(false);
      resetForm();
      fetchSteps();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to update step');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (step) => {
    if (!confirm(`Delete step "${step.title}"?`)) return;
    try {
      await apiService.deleteOnboardingStep(step.id);
      fetchSteps();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to delete step');
    }
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image (JPEG, PNG, GIF, or WebP).');
      return;
    }
    try {
      setUploadingImage(true);
      const res = await apiService.uploadImage(file);
      const url = res.data?.url;
      if (url) setFormData((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const showModal = showAddModal || showEditModal;
  const modalTitle = showEditModal ? 'Edit onboarding step' : 'Add onboarding step';
  const handleModalSubmit = showEditModal ? handleUpdate : handleCreate;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Onboarding (Walkthrough)</h1>
          <p className="text-gray-600 mt-1">
            Manage the screens shown when users first open the app. Text and images are loaded from here.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          Add step
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="w-10 h-10 text-primary-600 animate-spin" />
        </div>
      ) : steps.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No onboarding steps yet</p>
          <p className="text-gray-500 text-sm mt-2">Add steps to show title, subtitle, description, and image in the app walkthrough.</p>
          <button
            onClick={handleAdd}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Add first step
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row gap-4"
            >
              <div className="flex-shrink-0">
                {step.imageUrl ? (
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                    <img
                      src={step.imageUrl}
                      alt={step.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">#{step.order ?? index}</span>
                  {!step.isActive && <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Hidden</span>}
                </div>
                <h3 className="font-semibold text-gray-800 mt-1">{step.title || '—'}</h3>
                {step.subtitle && <p className="text-sm text-gray-600">{step.subtitle}</p>}
                {step.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{step.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEdit(step)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Edit"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(step)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">{modalTitle}</h2>
            </div>
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. Lorem Ipsum"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData((f) => ({ ...f, subtitle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. Expert & Share Stories"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="e.g. Lorem Ipsum is simply dummy text..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleUploadImage}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploadingImage ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingImage ? 'Uploading…' : 'Upload image'}
                  </button>
                  <span className="text-sm text-gray-500">or paste URL below</span>
                </div>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData((f) => ({ ...f, imageUrl: e.target.value }))}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://... (or use Upload above)"
                />
                {formData.imageUrl && (
                  <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order (optional)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.order}
                  onChange={(e) => setFormData((f) => ({ ...f, order: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0, 1, 2..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="onboarding-isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="onboarding-isActive" className="text-sm text-gray-700">Show in app walkthrough</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader className="w-5 h-5 animate-spin" /> : null}
                  {showEditModal ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                  className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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

export default Onboarding;

import { useEffect, useState } from 'react';
import { Search, Tag, DollarSign, User as UserIcon } from 'lucide-react';
import { apiService } from '../utils/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'sold', label: 'Sold' },
  { value: 'archived', label: 'Archived' },
];

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, hasMore: false });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    sellerId: '',
    title: '',
    description: '',
    price: '',
    currency: 'AED',
    category: '',
    condition: 'good',
    imageUrls: '',
    locationCity: '',
    locationCountry: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, searchDebounced]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getMarketplaceListings({
        page,
        limit: 20,
        status,
        q: searchDebounced,
      });
      setListings(res.data.listings || []);
      setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, hasMore: false });
    } catch (err) {
      console.error('Error fetching marketplace listings:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load listings.');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      sellerId: '',
      title: '',
      description: '',
      price: '',
      currency: 'AED',
      category: '',
      condition: 'good',
      imageUrls: '',
      locationCity: '',
      locationCountry: '',
      status: 'active',
    });
  };

  const openCreate = () => {
    resetForm();
    setEditing({ id: null });
  };

  const openEdit = async (listing) => {
    try {
      setError(null);
      const res = await apiService.getMarketplaceListingById(listing.id);
      const l = res.data.listing || listing;
      setEditing(l);
      setForm({
        sellerId: l.sellerId || '',
        title: l.title || '',
        description: l.description || '',
        price: l.price != null ? String(l.price) : '',
        currency: l.currency || 'AED',
        category: l.category || '',
        condition: l.condition || 'good',
        imageUrls: (l.imageUrls || []).join('\n'),
        locationCity: l.locationCity || '',
        locationCountry: l.locationCountry || '',
        status: l.status || 'active',
      });
    } catch (err) {
      console.error('Error loading listing detail:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load listing detail.');
    }
  };

  const handleDelete = async (listing) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      setError(null);
      await apiService.deleteMarketplaceListing(listing.id);
      fetchListings();
    } catch (err) {
      console.error('Error deleting listing:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete listing.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sellerId.trim()) {
      alert('Seller ID is required (MongoDB user id).');
      return;
    }
    if (!form.title.trim()) {
      alert('Title is required.');
      return;
    }
    if (!form.price.trim()) {
      alert('Price is required.');
      return;
    }
    const priceNum = parseFloat(form.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      alert('Price must be a non-negative number.');
      return;
    }
    const payload = {
      sellerId: form.sellerId.trim(),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      price: priceNum,
      currency: form.currency.trim() || 'AED',
      category: form.category.trim() || undefined,
      condition: form.condition.trim() || undefined,
      locationCity: form.locationCity.trim() || undefined,
      locationCountry: form.locationCountry.trim() || undefined,
      status: form.status.trim() || 'active',
      imageUrls: form.imageUrls
        .split('\n')
        .map((u) => u.trim())
        .filter((u) => u.length > 0),
    };

    try {
      setSaving(true);
      setError(null);
      if (editing && editing.id) {
        await apiService.updateMarketplaceListing(editing.id, payload);
      } else {
        await apiService.createMarketplaceListing(payload);
      }
      resetForm();
      setEditing(null);
      fetchListings();
    } catch (err) {
      console.error('Error saving listing:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save listing.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Marketplace Listings</h1>
          <p className="text-gray-600 mt-2">Manage marketplace listings created by users or brands</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
        >
          + New listing
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by title, category, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-semibold">{listings.length}</span> of{' '}
          <span className="font-semibold">{pagination.total}</span> listings
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}{' '}
          <button type="button" onClick={fetchListings} className="underline ml-2">
            Retry
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Listing
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seller
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    {error ? 'Failed to load listings.' : 'No listings found.'}
                  </td>
                </tr>
              ) : (
                listings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {listing.imageUrls && listing.imageUrls.length > 0 ? (
                          <img
                            src={listing.imageUrls[0]}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Tag className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 line-clamp-1">
                            {listing.title}
                          </span>
                          {listing.category && (
                            <span className="text-xs text-gray-500">{listing.category}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center">
                        <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                        {listing.price != null ? listing.price.toLocaleString() : '—'}{' '}
                        {listing.currency || 'AED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mr-2">
                          {listing.seller?.profilePictureUrl ? (
                            <img
                              src={listing.seller.profilePictureUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">
                            {listing.seller?.name || listing.seller?.username || 'User'}
                          </span>
                          {listing.seller?.username && (
                            <span className="text-xs text-gray-500">@{listing.seller.username}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                        {listing.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button
                        onClick={() => openEdit(listing)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(listing)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination.total > pagination.limit && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasMore}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                {editing.id ? 'Edit listing' : 'New listing'}
              </h2>
              <button
                onClick={() => {
                  resetForm();
                  setEditing(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Seller ID (MongoDB user _id)
                  </label>
                  <input
                    type="text"
                    value={form.sellerId}
                    onChange={(e) => setForm((f) => ({ ...f, sellerId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="64f..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="sold">Sold</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Product name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Car seats, strollers..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
                  <select
                    value={form.condition}
                    onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="new">New</option>
                    <option value="like_new">Like new</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                    <input
                      type="text"
                      value={form.locationCity}
                      onChange={(e) => setForm((f) => ({ ...f, locationCity: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                    <input
                      type="text"
                      value={form.locationCountry}
                      onChange={(e) => setForm((f) => ({ ...f, locationCountry: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Image URLs (one per line)</label>
                <textarea
                  rows={3}
                  value={form.imageUrls}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrls: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="https://cdn.../image1.jpg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Details about the item..."
                />
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setEditing(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


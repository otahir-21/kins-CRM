import { useEffect, useState } from 'react';
import { Search, CheckCircle2, XCircle, Clock, User as UserIcon } from 'lucide-react';
import { apiService } from '../utils/api';

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

export default function BrandVerification() {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, hasMore: false });
  const [status, setStatus] = useState(''); // empty = all statuses in CRM list
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, searchDebounced]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getBrandVerificationRequests({
        status,
        page,
        limit: 20,
        q: searchDebounced,
      });
      setRequests(res.data.requests || []);
      setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, hasMore: false });
    } catch (err) {
      console.error('Error fetching brand verification requests:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load brand verification requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (req) => {
    try {
      setError(null);
      const res = await apiService.getBrandVerificationRequestById(req.id);
      setSelected(res.data.request || req);
      setReviewNotes(res.data.request?.reviewNotes || '');
    } catch (err) {
      console.error('Error loading request detail:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load request detail.');
    }
  };

  const handleDecision = async (action) => {
    if (!selected) return;
    if (!window.confirm(`Are you sure you want to ${action} this brand?`)) return;
    try {
      setSavingDecision(true);
      setError(null);
      if (action === 'approve') {
        await apiService.approveBrandVerification(selected.id, reviewNotes || undefined);
      } else {
        await apiService.rejectBrandVerification(selected.id, reviewNotes || undefined);
      }
      setSelected(null);
      setReviewNotes('');
      fetchRequests();
    } catch (err) {
      console.error(`Error trying to ${action} brand verification:`, err);
      setError(err.response?.data?.error || err.message || `Failed to ${action} brand verification.`);
    } finally {
      setSavingDecision(false);
    }
  };

  const renderStatusPill = (s) => {
    const key = s || 'pending';
    const label = STATUS_LABELS[key] || key;
    const classes = STATUS_COLORS[key] || 'bg-gray-100 text-gray-800';
    return <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${classes}`}>{label}</span>;
  };

  if (loading && requests.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-800">Verification</h1>
          <p className="text-gray-600 mt-2">Review and approve verification requests</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by brand name, company, or user..."
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
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-semibold">{requests.length}</span> of{' '}
          <span className="font-semibold">{pagination.total}</span> requests
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}{' '}
          <button type="button" onClick={fetchRequests} className="underline ml-2">
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
                  Brand
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
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
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    {error ? 'Failed to load brand verification requests.' : 'No brand verification requests found.'}
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{req.brandName}</span>
                        {req.companyName && (
                          <span className="text-xs text-gray-500">{req.companyName}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        {req.contactEmail && <span>{req.contactEmail}</span>}
                        {req.contactPhone && <span>{req.contactPhone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mr-2">
                          {req.user?.profilePictureUrl ? (
                            <img
                              src={req.user.profilePictureUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">
                            {req.user?.name || req.user?.username || 'User'}
                          </span>
                          {req.user?.username && (
                            <span className="text-xs text-gray-500">@{req.user.username}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {renderStatusPill(req.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openDetail(req)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View
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

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{selected.brandName}</h2>
                {selected.companyName && (
                  <p className="text-sm text-gray-500">{selected.companyName}</p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                Close
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {selected.user?.profilePictureUrl ? (
                    <img
                      src={selected.user.profilePictureUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {selected.user?.name || selected.user?.username || 'User'}
                  </div>
                  {selected.user?.username && (
                    <div className="text-xs text-gray-500">@{selected.user.username}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Website</p>
                  <p className="text-gray-800 break-all">{selected.website || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Contact email</p>
                  <p className="text-gray-800 break-all">{selected.contactEmail || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Contact phone</p>
                  <p className="text-gray-800 break-all">{selected.contactPhone || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Industry</p>
                  <p className="text-gray-800 break-all">{selected.industry || '—'}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-sm mb-1">Description</p>
                <p className="text-gray-800 text-sm whitespace-pre-wrap">
                  {selected.description || '—'}
                </p>
              </div>

              {Array.isArray(selected.socialLinks) && selected.socialLinks.length > 0 && (
                <div>
                  <p className="text-gray-500 text-sm mb-1">Social links</p>
                  <ul className="space-y-1 text-sm text-primary-700">
                    {selected.socialLinks.map((s, idx) => (
                      <li key={idx}>
                        {s.type && <span className="font-medium capitalize">{s.type}: </span>}
                        {s.url || s.handle || '—'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(selected.documentUrls) && selected.documentUrls.length > 0 && (
                <div>
                  <p className="text-gray-500 text-sm mb-1">Documents</p>
                  <ul className="space-y-1 text-sm">
                    {selected.documentUrls.map((u, idx) => (
                      <li key={idx}>
                        <a
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 hover:underline break-all"
                        >
                          {u}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Status</span>
                {renderStatusPill(selected.status)}
                <span className="text-gray-400 flex items-center gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}
                </span>
              </div>

              <div>
                <p className="text-gray-500 text-sm mb-1">Review notes (visible in CRM only)</p>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Add notes about why the brand was approved or rejected..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={savingDecision || selected.status === 'approved'}
                  onClick={() => handleDecision('approve')}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Approve
                </button>
                <button
                  type="button"
                  disabled={savingDecision || selected.status === 'rejected'}
                  onClick={() => handleDecision('reject')}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


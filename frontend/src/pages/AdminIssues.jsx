import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const statusStyles = { open: 'bg-blue-100 text-blue-700', 'in-progress': 'bg-yellow-100 text-yellow-700', resolved: 'bg-emerald-100 text-emerald-700' };
const CATEGORIES = ['Electrical', 'Plumbing', 'HVAC', 'General', 'Appliances'];

export default function AdminIssues() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [deleting, setDeleting] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchIssues = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setLoading(true);
    api.get(`/issues?${params}`)
      .then((res) => { setIssues(res.data); setSelected(new Set()); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchIssues(); }, [filters]);

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const allIds = issues.map(i => i._id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds));

  const deleteIssue = async (e, id) => {
    e.stopPropagation();
    if (!confirm(t('issues.deleteConfirm') || 'Delete this issue?')) return;
    setDeleting(id);
    try {
      await api.delete(`/issues/${id}`);
      setIssues(prev => prev.filter(i => i._id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast.success(t('issues.deleteSuccess') || 'Issue deleted');
    } catch {
      toast.error(t('issues.deleteFailed') || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected issues?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map(id => api.delete(`/issues/${id}`)));
      setIssues(prev => prev.filter(i => !selected.has(i._id)));
      toast.success(`${selected.size} issues deleted`);
      setSelected(new Set());
    } catch {
      toast.error('Some deletions failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const exportCSV = () => {
    const rows = [['Title', 'Category', 'Status', 'Tenant', 'Unit', 'Date']];
    issues.forEach(i => rows.push([
      `"${i.title}"`, i.category, i.status,
      `"${i.tenantId?.name || ''}"`, i.unit,
      new Date(i.createdAt).toLocaleDateString(),
    ]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'issues.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const update = (field) => (e) => setFilters({ ...filters, [field]: e.target.value });

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{t('issues.allIssues')}</h1>
              <p className="text-gray-500 text-sm mt-1">{issues.length} {t('issues.allIssues').toLowerCase()}</p>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button onClick={bulkDelete} disabled={bulkDeleting}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                  {bulkDeleting ? '...' : `🗑 Delete ${selected.size} selected`}
                </button>
              )}
              <button onClick={exportCSV} className="text-xs text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors">
                ⬇ Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
          <div className="flex flex-wrap gap-3">
            <input type="text" placeholder={t('issues.search')} value={filters.search} onChange={update('search')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 flex-1 min-w-0 w-full sm:min-w-40" />
            <select value={filters.status} onChange={update('status')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
              <option value="">{t('issues.allStatuses')}</option>
              {['open', 'in-progress', 'resolved'].map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
            <select value={filters.category} onChange={update('category')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
              <option value="">{t('issues.allCategories')}</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-24" />)}
          </div>
        ) : issues.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">{t('issues.noIssues')}</p>
          </div>
        ) : (
          <>
            {/* Select all row */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <input type="checkbox" checked={allSelected} onChange={toggleAll}
                className="w-4 h-4 accent-emerald-500 cursor-pointer" />
              <span className="text-xs text-gray-500">
                {allSelected ? 'Deselect all' : `Select all (${issues.length})`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {issues.map(issue => (
                <div key={issue._id}
                  onClick={() => navigate(`/admin/issues/${issue._id}`)}
                  className={`bg-white rounded-xl border p-4 hover:shadow-md cursor-pointer transition-shadow relative ${selected.has(issue._id) ? 'border-emerald-400 bg-emerald-50/30' : 'border-gray-200'}`}>

                  {/* Checkbox */}
                  <div className="absolute top-3 left-3" onClick={e => toggleSelect(issue._id, e)}>
                    <input type="checkbox" checked={selected.has(issue._id)} onChange={() => {}}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer" />
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => deleteIssue(e, issue._id)}
                    disabled={deleting === issue._id}
                    className="absolute top-3 right-3 text-xs bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 px-2 py-1 rounded-lg disabled:opacity-40 transition-colors"
                  >
                    {deleting === issue._id ? '…' : '🗑'}
                  </button>

                  <div className="flex items-start justify-between gap-2 mb-2 pl-7 pr-8">
                    <h3 className="font-semibold text-gray-800 text-sm leading-snug">{issue.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2 pl-7">{issue.description}</p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyles[issue.status]}`}>
                        {t(`status.${issue.status}`)}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        {t(`categories.${issue.category}`)}
                      </span>
                      {issue.responsibility && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${issue.responsibility === 'tenant' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {t(`responsibility.${issue.responsibility}`)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{issue.tenantId?.name} · {issue.unit}</p>
                      <p className="text-xs text-gray-400">{new Date(issue.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

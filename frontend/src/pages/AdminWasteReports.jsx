import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const statusStyles = { open: 'bg-blue-100 text-blue-700', investigating: 'bg-yellow-100 text-yellow-700', resolved: 'bg-emerald-100 text-emerald-700' };
const STATUSES = ['open', 'investigating', 'resolved'];

export default function AdminWasteReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [notes, setNotes] = useState({});
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/waste')
      .then(r => setReports(r.data))
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  const updateReport = async (id, payload) => {
    setUpdating(id);
    try {
      const res = await api.put(`/waste/${id}`, payload);
      setReports(prev => prev.map(r => r._id === id ? res.data : r));
      toast.success('Updated');
    } catch {
      toast.error('Failed to update');
    } finally {
      setUpdating(null);
    }
  };

  const deleteReport = async (id) => {
    if (!confirm('Delete this report?')) return;
    try {
      await api.delete(`/waste/${id}`);
      setReports(prev => prev.filter(r => r._id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = filter ? reports.filter(r => r.status === filter) : reports;
  const counts = { open: reports.filter(r => r.status === 'open').length, investigating: reports.filter(r => r.status === 'investigating').length, resolved: reports.filter(r => r.status === 'resolved').length };

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">♻️ Waste & Environment Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Tenant-submitted reports about improper waste disposal and littering</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[['open', 'Open', 'bg-blue-50 border-blue-200 text-blue-700'], ['investigating', 'Investigating', 'bg-yellow-50 border-yellow-200 text-yellow-700'], ['resolved', 'Resolved', 'bg-emerald-50 border-emerald-200 text-emerald-700']].map(([s, label, cls]) => (
            <button key={s} onClick={() => setFilter(filter === s ? '' : s)}
              className={`border rounded-xl p-4 text-center transition-all ${cls} ${filter === s ? 'ring-2 ring-offset-1 ring-current' : 'opacity-80 hover:opacity-100'}`}>
              <p className="text-2xl font-bold">{counts[s]}</p>
              <p className="text-xs font-medium capitalize mt-1">{label}</p>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-20" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">No reports found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const isOpen = expanded === r._id;
              return (
                <div key={r._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Header row */}
                  <button onClick={() => setExpanded(isOpen ? null : r._id)}
                    className="w-full flex items-start justify-between gap-3 px-5 py-4 hover:bg-gray-50 text-left transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded-full">📍 {r.location}</span>
                        {r.anonymous
                          ? <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-full">Anonymous</span>
                          : r.reportedBy && <span className="text-xs text-gray-500">{r.reportedBy.name} · {r.reportedBy.unit}</span>
                        }
                        {r.building && <span className="text-xs text-gray-400">🏢 {r.building}</span>}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">{r.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusStyles[r.status]}`}>{r.status}</span>
                      <span className="text-gray-300 text-sm">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                      <p className="text-sm text-gray-700">{r.description}</p>

                      {r.images?.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {r.images.map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noreferrer">
                              <img src={img} alt="evidence" className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-400">Reported: {new Date(r.createdAt).toLocaleString()}</p>

                      {/* Status buttons */}
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Update Status</p>
                        <div className="flex gap-2 flex-wrap">
                          {STATUSES.map(s => (
                            <button key={s} disabled={r.status === s || updating === r._id}
                              onClick={() => updateReport(r._id, { status: s })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${r.status === s ? 'bg-emerald-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Admin note */}
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Note to tenant (optional)</p>
                        <textarea rows={2} value={notes[r._id] ?? r.adminNote}
                          onChange={e => setNotes(n => ({ ...n, [r._id]: e.target.value }))}
                          placeholder="e.g. We have issued a warning to the responsible party..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                        <button disabled={updating === r._id}
                          onClick={() => updateReport(r._id, { adminNote: notes[r._id] ?? r.adminNote })}
                          className="mt-1.5 text-xs bg-gray-800 hover:bg-gray-900 text-white px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                          Save Note
                        </button>
                      </div>

                      <div className="flex justify-end">
                        <button onClick={() => deleteReport(r._id)}
                          className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                          🗑 Delete Report
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

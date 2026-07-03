import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const categoryColors = {
  general: 'bg-blue-100 text-blue-700',
  bug: 'bg-red-100 text-red-700',
  feature: 'bg-purple-100 text-purple-700',
  design: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-600',
};

const categoryIcons = { general: '💬', bug: '🐛', feature: '💡', design: '🎨', other: '📝' };

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/feedback').then(r => setFeedback(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      const res = await api.put(`/feedback/${id}/read`);
      setFeedback(prev => prev.map(f => f._id === id ? res.data : f));
    } catch { toast.error('Failed to mark as read'); }
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm('Delete this feedback?')) return;
    try {
      await api.delete(`/feedback/${id}`);
      setFeedback(prev => prev.filter(f => f._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = filter === 'all' ? feedback
    : filter === 'unread' ? feedback.filter(f => !f.isRead)
    : feedback.filter(f => f.category === filter);

  const unreadCount = feedback.filter(f => !f.isRead).length;
  const avgRating = feedback.length ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1) : '—';

  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">App Feedback</h1>
            <p className="text-gray-500 text-sm mt-1">Feedback submitted by tenants about the app</p>
          </div>
          <div className="flex gap-3 text-center">
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm">
              <p className="text-xl font-bold text-emerald-600">{avgRating}</p>
              <p className="text-xs text-gray-400">Avg rating</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm">
              <p className="text-xl font-bold text-amber-500">{unreadCount}</p>
              <p className="text-xs text-gray-400">Unread</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {['all', 'unread', 'general', 'bug', 'feature', 'design', 'other'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {f === 'all' ? `All (${feedback.length})` : f === 'unread' ? `Unread (${unreadCount})` : `${categoryIcons[f]} ${f}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-24" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">No feedback yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(fb => (
              <div key={fb._id} className={`bg-white rounded-xl border p-5 transition-colors ${fb.isRead ? 'border-gray-100' : 'border-emerald-200 bg-emerald-50/20'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-gray-800">{fb.tenantId?.name || 'Unknown'}</p>
                      {fb.tenantId?.unit && <span className="text-xs text-gray-400">Unit {fb.tenantId.unit}</span>}
                      {!fb.isRead && <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">New</span>}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{'⭐'.repeat(fb.rating)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${categoryColors[fb.category]}`}>
                        {categoryIcons[fb.category]} {fb.category}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(fb.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{fb.message}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!fb.isRead && (
                      <button onClick={() => markRead(fb._id)}
                        className="text-xs text-emerald-600 hover:text-emerald-800 border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors">
                        Mark read
                      </button>
                    )}
                    <button onClick={() => deleteFeedback(fb._id)}
                      className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

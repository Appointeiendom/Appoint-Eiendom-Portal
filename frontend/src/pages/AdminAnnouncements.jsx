import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

export default function AdminAnnouncements() {
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: '', body: '', building: '' });
  const [buildings, setBuildings] = useState([]);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    api.get('/announcements').then(r => { setAnnouncements(r.data); setSelected(new Set()); }).catch(console.error);
    api.get('/announcements/buildings').then(r => setBuildings(r.data)).catch(console.error);
  }, []);

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allIds = announcements.map(a => a._id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds));

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title || !form.body) return toast.error(t('announcements.required'));
    setSending(true);
    try {
      const res = await api.post('/announcements', form);
      setAnnouncements(prev => [res.data, ...prev]);
      setForm({ title: '', body: '', building: '' });
      setShowForm(false);
      toast.success(t('announcements.sentSuccess')(res.data.sentToCount));
    } catch (err) {
      toast.error(err.response?.data?.message || t('announcements.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('announcements.deleteConfirm'))) return;
    try {
      await api.delete(`/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a._id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast.success(t('announcements.deleted'));
    } catch {
      toast.error(t('announcements.deleteFailed'));
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected announcements?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map(id => api.delete(`/announcements/${id}`)));
      setAnnouncements(prev => prev.filter(a => !selected.has(a._id)));
      toast.success(`${selected.size} announcements deleted`);
      setSelected(new Set());
    } catch {
      toast.error('Some deletions failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const target = form.building || t('announcements.allTenants');

  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('announcements.title')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('announcements.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button onClick={bulkDelete} disabled={bulkDeleting}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                {bulkDeleting ? '...' : `🗑 Delete ${selected.size}`}
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              {showForm ? t('announcements.cancel') : t('announcements.newBtn')}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSend} className="bg-white rounded-xl border border-emerald-200 p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-gray-700">{t('announcements.formTitle')}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('announcements.titleLabel')} *</label>
              <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={t('announcements.titlePlaceholder')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('announcements.message')} *</label>
              <textarea required rows={5} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder={t('announcements.messagePlaceholder')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('announcements.sendTo')}</label>
              <select value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                <option value="">{t('announcements.allTenants')}</option>
                {buildings.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <button type="submit" disabled={sending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {sending ? t('announcements.sending') : t('announcements.sendBtn')(target)}
            </button>
          </form>
        )}

        {announcements.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">{t('announcements.noAnnouncements')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 px-1">
              <input type="checkbox" checked={allSelected} onChange={toggleAll}
                className="w-4 h-4 accent-emerald-500 cursor-pointer" />
              <span className="text-xs text-gray-500">
                {allSelected ? 'Deselect all' : `Select all (${announcements.length})`}
              </span>
            </div>
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a._id} className={`bg-white rounded-xl border p-5 ${selected.has(a._id) ? 'border-emerald-400 bg-emerald-50/30' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selected.has(a._id)} onChange={() => toggleSelect(a._id)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">📢</span>
                        <h3 className="font-semibold text-gray-800">{a.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{a.body}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <p className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <span className="text-xs text-gray-300">·</span>
                        <p className="text-xs text-emerald-600">{t('announcements.sentTo')(a.sentToCount, a.building)}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(a._id)}
                      className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors shrink-0">
                      {t('common.delete')}
                    </button>
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

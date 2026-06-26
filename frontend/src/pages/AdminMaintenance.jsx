import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const TRADES = ['Electrical', 'Plumbing', 'HVAC', 'General', 'Appliances'];

export default function AdminMaintenance() {
  const { t } = useLanguage();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = { name: '', email: '', trade: 'Electrical', bio: '', phone: '', password: '', photo: null };
  const [form, setForm] = useState(emptyForm);

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/maintenance');
      setWorkers(res.data);
    } catch {
      toast.error(t('maintenance.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkers(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditWorker(null); setShowForm(true); };
  const openEdit = (w) => {
    setForm({ name: w.name, email: w.email, trade: w.trade, bio: w.bio || '', phone: w.phone || '', password: '', photo: null });
    setEditWorker(w);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v && k !== 'photo') data.append(k, v); });
      if (form.photo) data.append('photo', form.photo);

      if (editWorker) {
        await api.put(`/maintenance/${editWorker._id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(t('maintenance.updateSuccess'));
      } else {
        await api.post('/maintenance', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(t('maintenance.addSuccess'));
      }

      setShowForm(false);
      fetchWorkers();
    } catch (err) {
      toast.error(err.response?.data?.message || t('maintenance.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteWorker = async (id) => {
    if (!confirm(t('maintenance.deleteConfirm'))) return;
    try {
      await api.delete(`/maintenance/${id}`);
      setWorkers(w => w.filter(x => x._id !== id));
      toast.success(t('maintenance.deleted'));
    } catch {
      toast.error(t('maintenance.deleteFailed'));
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('maintenance.companiesTitle')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('maintenance.companiesSubtitle')}</p>
          </div>
          <button onClick={openAdd} className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">
            {t('maintenance.addCompany')}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-gray-700 mb-4">{editWorker ? t('maintenance.editCompany') : t('maintenance.addNewCompany')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenance.fullName')} *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenance.email')} *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                    disabled={!!editWorker}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenance.trade')} *</label>
                  <select required value={form.trade} onChange={e => setForm(f => ({...f, trade: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {TRADES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenance.phone')}</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                {!editWorker && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenance.password')}</label>
                    <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                      placeholder={t('maintenance.passwordHint')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenance.photo')}</label>
                  <input type="file" accept="image/*" onChange={e => setForm(f => ({...f, photo: e.target.files[0]}))}
                    className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-lg file:text-sm file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenance.bio')}</label>
                <textarea rows={2} value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))}
                  placeholder={t('maintenance.bioPlaceholder')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting}
                  className="bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-60 transition-colors">
                  {submitting ? t('common.saving') : editWorker ? t('maintenance.saveChanges') : t('maintenance.addCompanyBtn')}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        {/* Workers list */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : workers.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-lg">{t('maintenance.noCompanies')}</p>
            <button onClick={openAdd} className="mt-4 text-emerald-600 hover:underline text-sm">{t('maintenance.addFirstCompany')}</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map(w => (
              <div key={w._id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-3">
                  {w.photo ? (
                    <img src={w.photo} alt={w.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-2xl shrink-0">👷</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{w.name}</p>
                    <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{w.trade}</span>
                    {w.avgRating !== null && w.avgRating !== undefined ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-amber-400 text-sm">{'★'.repeat(Math.round(w.avgRating))}{'☆'.repeat(5 - Math.round(w.avgRating))}</span>
                        <span className="text-xs text-gray-500">{w.avgRating} ({t('rating.reviews')(w.ratingCount)})</span>
                      </div>
                    ) : <p className="text-xs text-gray-400 mt-1">{t('rating.noRatings')}</p>}
                    {w.phone && <p className="text-xs text-gray-500 mt-1">{w.phone}</p>}
                  </div>
                </div>
                {w.bio && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{w.bio}</p>}
                <p className="text-xs text-gray-400 mb-3">{w.email}</p>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(w)} className="flex-1 text-xs border border-gray-300 text-gray-700 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">{t('common.edit')}</button>
                  <button onClick={() => deleteWorker(w._id)} className="flex-1 text-xs border border-red-200 text-red-600 py-1.5 rounded-lg hover:bg-red-50 transition-colors">{t('common.delete')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

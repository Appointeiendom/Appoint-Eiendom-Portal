import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

function PhotoCell({ tenant, uploadingId, onPhotoUpload, onPhotoDelete, onPhotoView }) {
  return (
    <div className="relative shrink-0 w-10 h-10 group">
      {tenant.photo ? (
        <>
          <img src={tenant.photo} alt={tenant.name} onClick={() => onPhotoView(tenant.photo)}
            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer group-hover:border-emerald-400 transition-colors" />
          <button onClick={() => onPhotoDelete(tenant._id)}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs leading-none items-center justify-center hidden group-hover:flex">
            ✕
          </button>
          <label className="absolute inset-0 rounded-full cursor-pointer opacity-0">
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => onPhotoUpload(tenant._id, e.target.files[0])} />
          </label>
        </>
      ) : (
        <label className="cursor-pointer block w-10 h-10">
          <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 group-hover:border-emerald-400 flex items-center justify-center transition-colors">
            <span className="text-gray-500 text-xs font-bold">{tenant.name?.[0]?.toUpperCase()}</span>
          </div>
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => onPhotoUpload(tenant._id, e.target.files[0])} />
        </label>
      )}
      {uploadingId === tenant._id && (
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function TenantRow({ tenant, uploadingId, onPhotoUpload, onPhotoDelete, onPhotoView, onReset, onDelete, t }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
      <PhotoCell tenant={tenant} uploadingId={uploadingId}
        onPhotoUpload={onPhotoUpload} onPhotoDelete={onPhotoDelete} onPhotoView={onPhotoView} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{tenant.name}</p>
        <p className="text-xs text-gray-500 truncate">{tenant.email}{tenant.phone ? ` · ${tenant.phone}` : ''}</p>
        {tenant.building && <p className="text-xs text-gray-400">{tenant.building}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => onReset(tenant)}
          className="text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
          {t('tenants.resetPassword')}
        </button>
        <button onClick={() => onDelete(tenant._id, tenant.name)}
          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors">
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
}

function BuildingGroups({ tenants, uploadingId, onPhotoUpload, onPhotoDelete, onPhotoView, onReset, onDelete, t }) {
  const groups = tenants.reduce((acc, tenant) => {
    const key = (tenant.unit && tenant.unit.trim()) ? tenant.unit.trim() : t('tenants.noBuilding');
    if (!acc[key]) acc[key] = [];
    acc[key].push(tenant);
    return acc;
  }, {});

  const noBuilding = t('tenants.noBuilding');
  const sorted = Object.keys(groups).sort((a, b) =>
    a === noBuilding ? 1 : b === noBuilding ? -1 : a.localeCompare(b, 'no')
  );

  const [open, setOpen] = useState(() => Object.fromEntries(sorted.map(k => [k, true])));
  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-3">
      {sorted.map(address => {
        const group = groups[address];
        const isOpen = open[address];
        return (
          <div key={address} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button onClick={() => toggle(address)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <span className="text-lg">🏢</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{address}</p>
                  <p className="text-xs text-gray-400">{t('tenants.tenantCount')(group.length)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {group.slice(0, 4).map(tenant => (
                    tenant.photo
                      ? <img key={tenant._id} src={tenant.photo} alt={tenant.name} className="w-7 h-7 rounded-full object-cover border-2 border-white" />
                      : <div key={tenant._id} className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{tenant.name?.[0]?.toUpperCase()}</span>
                        </div>
                  ))}
                  {group.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                      <span className="text-gray-600 text-xs font-bold">+{group.length - 4}</span>
                    </div>
                  )}
                </div>
                <span className="text-gray-400 text-sm ml-2">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-gray-100">
                {group.map(tenant => (
                  <TenantRow key={tenant._id} tenant={tenant} uploadingId={uploadingId} t={t}
                    onPhotoUpload={onPhotoUpload} onPhotoDelete={onPhotoDelete}
                    onPhotoView={onPhotoView} onReset={onReset} onDelete={onDelete} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminTenants() {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', unit: '', building: '', phone: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchTenants = () => {
    api.get('/users').then(res => setTenants(res.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.unit) return toast.error('Name, email and address are required');
    if (form.password && form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success(t('tenants.addSuccess'));
      setForm({ name: '', email: '', unit: '', building: '', phone: '', password: '' });
      setShowForm(false);
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || t('tenants.addFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setResetting(true);
    try {
      await api.put(`/users/${resetTarget._id}/reset-password`, { password: newPassword });
      toast.success(t('tenants.resetSuccess'));
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || t('tenants.resetFailed'));
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(t('tenants.deleteConfirm')(name))) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success(t('tenants.deleteSuccess'));
      setTenants(prev => prev.filter(t => t._id !== id));
    } catch {
      toast.error(t('tenants.deleteFailed'));
    }
  };

  const handlePhotoUpload = async (tenantId, file) => {
    if (!file) return;
    setUploadingId(tenantId);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await api.put(`/users/${tenantId}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTenants(prev => prev.map(t => t._id === tenantId ? { ...t, photo: res.data.photo } : t));
      toast.success(t('tenants.photoUpdated'));
    } catch {
      toast.error(t('tenants.photoFailed'));
    } finally {
      setUploadingId(null);
    }
  };

  const handlePhotoDelete = async (tenantId) => {
    if (!window.confirm(t('tenants.photoDeleteConfirm'))) return;
    try {
      await api.delete(`/users/${tenantId}/photo`);
      setTenants(prev => prev.map(t => t._id === tenantId ? { ...t, photo: null } : t));
      toast.success(t('tenants.photoDeleted'));
    } catch {
      toast.error(t('tenants.photoDeleteFailed'));
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('tenants.title')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('tenants.registered')(tenants.length)}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {showForm ? t('tenants.cancel') : t('tenants.addTenant')}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-emerald-200 p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-gray-700">{t('tenants.newTenant')}</h2>
            <p className="text-xs text-gray-500">{t('tenants.newTenantHint')}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.name')} *</label>
                <input type="text" required value={form.name} onChange={update('name')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.email')} *</label>
                <input type="email" required value={form.email} onChange={update('email')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.unit')} *</label>
                <input type="text" required value={form.unit} onChange={update('unit')}
                  placeholder={t('tenants.unitPlaceholder')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.aptNumber')}</label>
                <input type="text" value={form.building} onChange={update('building')}
                  placeholder={t('tenants.aptPlaceholder')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.phone')}</label>
                <input type="tel" value={form.phone} onChange={update('phone')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tenants.password')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
                </label>
                <input type="text" value={form.password} onChange={update('password')}
                  placeholder={t('tenants.passwordHint')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {saving ? t('tenants.creating') : t('tenants.createBtn')}
            </button>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-16" />)}
          </div>
        ) : tenants.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">{t('tenants.noTenants')}</p>
          </div>
        ) : (
          <BuildingGroups tenants={tenants} uploadingId={uploadingId} t={t}
            onPhotoUpload={handlePhotoUpload} onPhotoDelete={handlePhotoDelete}
            onPhotoView={setLightbox}
            onReset={(tenant) => { setResetTarget(tenant); setNewPassword(''); }}
            onDelete={handleDelete} />
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300">✕</button>
          <img src={lightbox} alt="profil" className="max-w-sm max-h-full rounded-2xl shadow-2xl object-cover" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-semibold text-gray-800 mb-1">{t('tenants.resetTitle')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('tenants.resetDesc')(resetTarget.name, resetTarget.email)}</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.resetNewPw')} *</label>
                <input type="text" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder={t('tenants.resetPlaceholder')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setResetTarget(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={resetting}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
                  {resetting ? t('tenants.resetting') : t('tenants.resetBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

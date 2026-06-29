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

function TenantRow({ tenant, uploadingId, onPhotoUpload, onPhotoDelete, onPhotoView, onReset, onDelete, onEdit, onToggleActive, selected, onToggleSelect, t }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${!tenant.isActive ? 'opacity-60 bg-gray-50' : ''} ${selected ? 'bg-emerald-50/40' : ''}`}>
      <input type="checkbox" checked={selected} onChange={() => onToggleSelect(tenant._id)}
        className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" onClick={e => e.stopPropagation()} />
      <PhotoCell tenant={tenant} uploadingId={uploadingId}
        onPhotoUpload={onPhotoUpload} onPhotoDelete={onPhotoDelete} onPhotoView={onPhotoView} />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(tenant)}>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-800 hover:text-emerald-600 transition-colors">{tenant.name}</p>
          {!tenant.isActive && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">{t('tenants.expired')}</span>}
        </div>
        <p className="text-xs text-gray-500 truncate">{tenant.email}{tenant.phone ? ` · ${tenant.phone}` : ''}</p>
        {tenant.building && <p className="text-xs text-gray-400">{t('tenants.apartment')(tenant.building)}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => onEdit(tenant)}
          className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-2 py-1 rounded transition-colors">
          {t('common.edit')}
        </button>
        <button onClick={() => onReset(tenant)}
          className="text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
          {t('tenants.resetPassword')}
        </button>
        <button onClick={() => onToggleActive(tenant)}
          className={`text-xs px-2 py-1 rounded transition-colors ${tenant.isActive ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50' : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'}`}>
          {tenant.isActive ? t('tenants.expire') : t('tenants.reactivate')}
        </button>
        <button onClick={() => onDelete(tenant._id, tenant.name)}
          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors">
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
}

function BuildingGroups({ tenants, uploadingId, onPhotoUpload, onPhotoDelete, onPhotoView, onReset, onDelete, onEdit, onToggleActive, selectedSet, onToggleSelect, t }) {
  const normalize = (str) => str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const groups = tenants.reduce((acc, tenant) => {
    const key = (tenant.unit && tenant.unit.trim()) ? normalize(tenant.unit) : t('tenants.noBuilding');
    if (!acc[key]) acc[key] = [];
    acc[key].push(tenant);
    return acc;
  }, {});

  const noBuilding = t('tenants.noBuilding');
  const sorted = Object.keys(groups).sort((a, b) =>
    a === noBuilding ? 1 : b === noBuilding ? -1 : a.localeCompare(b, 'no')
  );

  const [open, setOpen] = useState({});
  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-3">
      {sorted.map(address => {
        const group = groups[address];
        const isOpen = !!open[address];
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
                    selected={selectedSet.has(tenant._id)}
                    onToggleSelect={onToggleSelect}
                    onPhotoUpload={onPhotoUpload} onPhotoDelete={onPhotoDelete}
                    onPhotoView={onPhotoView} onReset={onReset} onDelete={onDelete} onEdit={onEdit} onToggleActive={onToggleActive} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Reusable building+apartment selector
function BuildingApartmentPicker({ buildings, buildingId, apartmentId, onBuildingChange, onApartmentChange, excludeTenantId }) {
  const [apts, setApts] = useState([]);
  const [loadingApts, setLoadingApts] = useState(false);

  useEffect(() => {
    if (!buildingId) { setApts([]); return; }
    setLoadingApts(true);
    const url = `/buildings/${buildingId}/apartments${excludeTenantId ? `?excludeTenant=${excludeTenantId}` : ''}`;
    api.get(url).then(r => setApts(r.data)).catch(() => setApts([])).finally(() => setLoadingApts(false));
  }, [buildingId, excludeTenantId]);

  if (buildings.length === 0) {
    return (
      <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-700">
        No buildings registered yet. Add buildings in{' '}
        <a href="/admin/buildings" className="underline font-medium">Properties</a> first.
      </div>
    );
  }

  return (
    <>
      <div className="col-span-2 sm:col-span-1">
        <label className="block text-xs font-medium text-gray-600 mb-1">Building *</label>
        <select required value={buildingId} onChange={e => { onBuildingChange(e.target.value); onApartmentChange(''); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
          <option value="">Select building…</option>
          {buildings.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className="block text-xs font-medium text-gray-600 mb-1">Apartment *</label>
        <select required value={apartmentId} onChange={e => onApartmentChange(e.target.value)}
          disabled={!buildingId || loadingApts}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white disabled:bg-gray-50 disabled:text-gray-400">
          <option value="">{loadingApts ? 'Loading…' : 'Select apartment…'}</option>
          {apts.map(apt => (
            <option key={apt._id} value={apt._id} disabled={apt.isOccupied}>
              {apt.number}{apt.floor ? ` (${apt.floor})` : ''}{apt.type ? ` — ${apt.type}` : ''}{apt.isOccupied ? ` · Occupied by ${apt.occupantName}` : ''}
            </option>
          ))}
        </select>
        {buildingId && apts.length === 0 && !loadingApts && (
          <p className="text-xs text-gray-400 mt-1">No apartments in this building yet.</p>
        )}
      </div>
    </>
  );
}

function EditModal({ tenant, buildings, onClose, onSaved, t }) {
  const toDateInput = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
  const [form, setForm] = useState({
    name: tenant.name || '',
    email: tenant.email || '',
    phone: tenant.phone || '',
    leaseStart: toDateInput(tenant.leaseStart),
    leaseEnd: toDateInput(tenant.leaseEnd),
    buildingId: tenant.buildingId || '',
    apartmentId: tenant.apartmentId || '',
    // Legacy fallbacks (used if no building system)
    unit: tenant.unit || '',
    building: tenant.building || '',
  });
  const [saving, setSaving] = useState(false);
  const up = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasBuilding = buildings.length > 0;
    if (hasBuilding && (!form.buildingId || !form.apartmentId)) return toast.error('Please select a building and apartment');
    if (!hasBuilding && !form.unit) return toast.error(t('tenants.required'));
    setSaving(true);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone, leaseStart: form.leaseStart, leaseEnd: form.leaseEnd };
      if (form.buildingId && form.apartmentId) {
        payload.buildingId = form.buildingId;
        payload.apartmentId = form.apartmentId;
      } else {
        payload.unit = form.unit;
        payload.building = form.building;
      }
      const res = await api.put(`/users/${tenant._id}`, payload);
      toast.success(t('tenants.editSuccess'));
      onSaved(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || t('tenants.editFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4 p-6 border-b border-gray-100">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            {tenant.photo
              ? <img src={tenant.photo} alt={tenant.name} className="w-14 h-14 rounded-full object-cover" />
              : <span className="text-emerald-700 font-bold text-xl">{tenant.name?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-800 text-lg">{tenant.name}</h2>
            <p className="text-sm text-gray-500">{tenant.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('tenants.name')} *</label>
              <input type="text" required value={form.name} onChange={up('name')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('tenants.email')} *</label>
              <input type="email" required value={form.email} onChange={up('email')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            {buildings.length > 0 ? (
              <BuildingApartmentPicker
                buildings={buildings}
                buildingId={form.buildingId}
                apartmentId={form.apartmentId}
                excludeTenantId={tenant._id}
                onBuildingChange={v => setForm(f => ({ ...f, buildingId: v }))}
                onApartmentChange={v => setForm(f => ({ ...f, apartmentId: v }))}
              />
            ) : (
              <>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('tenants.unit')} *</label>
                  <input type="text" required value={form.unit} onChange={up('unit')}
                    placeholder={t('tenants.unitPlaceholder')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('tenants.aptNumber')}</label>
                  <input type="text" value={form.building} onChange={up('building')}
                    placeholder={t('tenants.aptPlaceholder')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </>
            )}

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('tenants.phone')}</label>
              <input type="tel" value={form.phone} onChange={up('phone')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('tenants.leaseStart')}</label>
              <input type="date" value={form.leaseStart} onChange={up('leaseStart')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('tenants.leaseEnd')}</label>
              <input type="date" value={form.leaseEnd} onChange={up('leaseEnd')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminTenants() {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', leaseStart: '', leaseEnd: '', buildingId: '', apartmentId: '', unit: '', building: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchTenants = () => {
    api.get('/users').then(res => { setTenants(res.data); setSelected(new Set()); }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTenants();
    api.get('/buildings').then(r => setBuildings(r.data)).catch(() => setBuildings([]));
  }, []);

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filteredTenants = tenants.filter(tn => !search || tn.name.toLowerCase().includes(search.toLowerCase()) || tn.email.toLowerCase().includes(search.toLowerCase()));
  const allVisible = filteredTenants.map(t => t._id);
  const allSelected = allVisible.length > 0 && allVisible.every(id => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allVisible));

  const handleCreate = async (e) => {
    e.preventDefault();
    const hasBuildings = buildings.length > 0;
    if (hasBuildings && (!form.buildingId || !form.apartmentId)) return toast.error('Please select a building and apartment');
    if (!hasBuildings && !form.unit) return toast.error(t('tenants.required'));
    if (form.password && form.password.length < 6) return toast.error(t('tenants.passwordMin'));
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success(t('tenants.addSuccess'));
      setForm({ name: '', email: '', phone: '', password: '', leaseStart: '', leaseEnd: '', buildingId: '', apartmentId: '', unit: '', building: '' });
      setShowForm(false);
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || t('tenants.addFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (tenant) => {
    const msg = tenant.isActive ? t('tenants.expireConfirm')(tenant.name) : t('tenants.reactivateConfirm')(tenant.name);
    if (!window.confirm(msg)) return;
    try {
      const res = await api.put(`/users/${tenant._id}/toggle-active`);
      setTenants(prev => prev.map(tn => tn._id === tenant._id ? { ...tn, isActive: res.data.isActive } : tn));
      toast.success(res.data.isActive ? t('tenants.reactivated')(tenant.name) : t('tenants.accessExpired')(tenant.name));
    } catch {
      toast.error(t('tenants.toggleFailed'));
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error(t('tenants.passwordMin'));
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
      setTenants(prev => prev.filter(tn => tn._id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch {
      toast.error(t('tenants.deleteFailed'));
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected tenants?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map(id => api.delete(`/users/${id}`)));
      setTenants(prev => prev.filter(tn => !selected.has(tn._id)));
      toast.success(`${selected.size} tenants deleted`);
      setSelected(new Set());
    } catch {
      toast.error('Some deletions failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handlePhotoUpload = async (tenantId, file) => {
    if (!file) return;
    setUploadingId(tenantId);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await api.put(`/users/${tenantId}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTenants(prev => prev.map(tn => tn._id === tenantId ? { ...tn, photo: res.data.photo } : tn));
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
      setTenants(prev => prev.map(tn => tn._id === tenantId ? { ...tn, photo: null } : tn));
      toast.success(t('tenants.photoDeleted'));
    } catch {
      toast.error(t('tenants.photoDeleteFailed'));
    }
  };

  const handleSaved = (updated) => {
    setTenants(prev => prev.map(tn => tn._id === updated._id ? { ...tn, ...updated } : tn));
    setEditTarget(null);
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
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button onClick={bulkDelete} disabled={bulkDeleting}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                {bulkDeleting ? '...' : `🗑 Delete ${selected.size}`}
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              {showForm ? t('tenants.cancel') : t('tenants.addTenant')}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('tenants.search')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
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
              {buildings.length > 0 ? (
                <BuildingApartmentPicker
                  buildings={buildings}
                  buildingId={form.buildingId}
                  apartmentId={form.apartmentId}
                  onBuildingChange={v => setForm(f => ({ ...f, buildingId: v, apartmentId: '' }))}
                  onApartmentChange={v => setForm(f => ({ ...f, apartmentId: v }))}
                />
              ) : (
                <>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.unit')} *</label>
                    <input type="text" value={form.unit} onChange={update('unit')}
                      placeholder={t('tenants.unitPlaceholder')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.aptNumber')}</label>
                    <input type="text" value={form.building} onChange={update('building')}
                      placeholder={t('tenants.aptPlaceholder')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                </>
              )}
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
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.leaseStart')}</label>
                <input type="date" value={form.leaseStart} onChange={update('leaseStart')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.leaseEnd')}</label>
                <input type="date" value={form.leaseEnd} onChange={update('leaseEnd')}
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
          <>
            <div className="flex items-center gap-2 mb-2 px-1">
              <input type="checkbox" checked={allSelected} onChange={toggleAll}
                className="w-4 h-4 accent-emerald-500 cursor-pointer" />
              <span className="text-xs text-gray-500">
                {allSelected ? 'Deselect all' : `Select all (${filteredTenants.length})`}
              </span>
            </div>
            <BuildingGroups
              tenants={filteredTenants}
              uploadingId={uploadingId}
              t={t}
              selectedSet={selected}
              onToggleSelect={toggleSelect}
              onPhotoUpload={handlePhotoUpload}
              onPhotoDelete={handlePhotoDelete}
              onPhotoView={setLightbox}
              onReset={(tenant) => { setResetTarget(tenant); setNewPassword(''); }}
              onDelete={handleDelete}
              onEdit={setEditTarget}
              onToggleActive={handleToggleActive}
            />
          </>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300">✕</button>
          <img src={lightbox} alt="profil" className="max-w-sm max-h-full rounded-2xl shadow-2xl object-cover" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {editTarget && (
        <EditModal tenant={editTarget} t={t} buildings={buildings}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved} />
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

import { useState, useEffect, useRef } from 'react';
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

function TenantRow({ tenant, uploadingId, onPhotoUpload, onPhotoDelete, onPhotoView, onReset, onDelete, onEdit, onMoveOut, selected, onToggleSelect, t }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${selected ? 'bg-emerald-50/40' : ''}`}>
      <input type="checkbox" checked={selected} onChange={() => onToggleSelect(tenant._id)}
        className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" onClick={e => e.stopPropagation()} />
      <PhotoCell tenant={tenant} uploadingId={uploadingId}
        onPhotoUpload={onPhotoUpload} onPhotoDelete={onPhotoDelete} onPhotoView={onPhotoView} />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(tenant)}>
        <p className="text-sm font-medium text-gray-800 hover:text-emerald-600 transition-colors">{tenant.name}</p>
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
        <button onClick={() => onMoveOut(tenant)}
          className="text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded transition-colors">
          Move Out
        </button>
        <button onClick={() => onDelete(tenant._id, tenant.name)}
          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors">
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
}

function FormerTenantRow({ tenant, onDelete, onReAdd }) {
  const movedOutDate = tenant.movedOutAt
    ? new Date(tenant.movedOutAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Unknown date';
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
        {tenant.photo
          ? <img src={tenant.photo} alt={tenant.name} className="w-9 h-9 rounded-full object-cover" />
          : <span className="text-gray-500 text-sm font-bold">{tenant.name?.[0]?.toUpperCase()}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{tenant.name}</p>
        <p className="text-xs text-gray-400 truncate">{tenant.email}{tenant.phone ? ` · ${tenant.phone}` : ''}</p>
        <p className="text-xs text-gray-400">
          {tenant.unit}{tenant.building ? ` · Unit ${tenant.building}` : ''} · Moved out {movedOutDate}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => onReAdd(tenant)}
          className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 px-2 py-1 rounded transition-colors">
          Re-add
        </button>
        <button onClick={() => onDelete(tenant._id, tenant.name)}
          className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

function BuildingGroups({ tenants, uploadingId, onPhotoUpload, onPhotoDelete, onPhotoView, onReset, onDelete, onEdit, onMoveOut, selectedSet, onToggleSelect, t }) {
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
                    onPhotoView={onPhotoView} onReset={onReset} onDelete={onDelete} onEdit={onEdit} onMoveOut={onMoveOut} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Searchable dropdown component
function SearchableSelect({ options, value, onChange, placeholder, disabled, renderOption, getLabel, getKey, isDisabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = options.filter(o => getLabel(o).toLowerCase().includes(search.toLowerCase()));
  const selectedOption = options.find(o => getKey(o) === value);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm text-left flex justify-between items-center transition-colors ${disabled ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 bg-white hover:border-emerald-400 focus:outline-none'} ${open ? 'ring-2 ring-emerald-400 border-emerald-400' : ''}`}>
        <span className={selectedOption ? 'text-gray-800' : 'text-gray-400'}>
          {selectedOption ? getLabel(selectedOption) : (disabled ? '—' : placeholder)}
        </span>
        <span className="text-gray-400 text-xs ml-2">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 px-4 py-3 text-center">No results</p>
            ) : filtered.map(opt => {
              const key = getKey(opt);
              const dis = isDisabled ? isDisabled(opt) : false;
              return (
                <button key={key} type="button" disabled={dis}
                  onClick={() => { onChange(key); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${key === value ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700 hover:bg-gray-50'} ${dis ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  {renderOption ? renderOption(opt) : getLabel(opt)}
                </button>
              );
            })}
          </div>
        </div>
      )}
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
        <SearchableSelect
          options={buildings}
          value={buildingId}
          onChange={v => { onBuildingChange(v); onApartmentChange(''); }}
          placeholder="Select building…"
          getKey={b => b._id}
          getLabel={b => b.name + (b.address ? ` — ${b.address}` : '')}
        />
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className="block text-xs font-medium text-gray-600 mb-1">Unit Number *</label>
        <SearchableSelect
          options={apts}
          value={apartmentId}
          onChange={onApartmentChange}
          placeholder={loadingApts ? 'Loading…' : buildingId ? 'Select unit…' : 'Select building first'}
          disabled={!buildingId || loadingApts}
          getKey={a => a._id}
          getLabel={a => a.number + (a.floor ? ` (${a.floor})` : '') + (a.type ? ` — ${a.type}` : '')}
          renderOption={a => (
            <span className={a.isOccupied ? 'opacity-50' : ''}>
              <span className="font-medium">{a.number}</span>
              {a.floor && <span className="text-gray-400 text-xs ml-1">({a.floor})</span>}
              {a.type && <span className="text-gray-400 text-xs ml-1">— {a.type}</span>}
              {a.isOccupied && <span className="text-xs text-red-400 ml-2">Occupied · {a.occupantName}</span>}
            </span>
          )}
          isDisabled={a => a.isOccupied}
        />
        {buildingId && apts.length === 0 && !loadingApts && (
          <p className="text-xs text-gray-400 mt-1">No units in this building yet.</p>
        )}
      </div>
    </>
  );
}

function NeverLoggedIn({ tenants, onReset }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <span className="text-sm font-semibold text-amber-800">Never Logged In</span>
          <span className="text-xs bg-amber-200 text-amber-800 font-semibold px-2 py-0.5 rounded-full">{tenants.length}</span>
        </div>
        <span className="text-amber-500 text-sm">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="border-t border-amber-200 divide-y divide-amber-100">
          <div className="px-4 py-2 bg-amber-100/50 text-xs text-amber-700">
            These tenants have accounts but have never logged in. Contact them and share their credentials.
          </div>
          {tenants.map(tn => (
            <div key={tn._id} className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50">
              <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                <span className="text-amber-700 text-xs font-bold">{tn.name?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{tn.name}</p>
                <p className="text-xs text-gray-500 truncate">{tn.email}{tn.phone ? ` · ${tn.phone}` : ''}</p>
                {tn.unit && <p className="text-xs text-gray-400">{tn.unit}{tn.building ? ` · ${tn.building}` : ''}</p>}
              </div>
              <button
                onClick={() => onReset(tn)}
                className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Send New Password
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReAddModal({ tenant, buildings, onClose, onConfirm }) {
  const [buildingId, setBuildingId] = useState('');
  const [apartmentId, setApartmentId] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (!buildingId || !apartmentId) return;
    setSaving(true);
    try {
      await onConfirm({ buildingId, apartmentId, tenantId: tenant._id, leaseStart, leaseEnd });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4 p-6 border-b border-gray-100">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="text-emerald-700 font-bold text-lg">{tenant.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-800">Re-add {tenant.name}</h2>
            <p className="text-xs text-gray-400">Previously at {tenant.unit}{tenant.building ? ` · Unit ${tenant.building}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
        </div>
        <form onSubmit={handle} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Select the new unit for this tenant. They will be re-activated with access to the portal.</p>
          <div className="grid grid-cols-2 gap-4">
            <BuildingApartmentPicker
              buildings={buildings}
              buildingId={buildingId}
              apartmentId={apartmentId}
              onBuildingChange={v => { setBuildingId(v); setApartmentId(''); }}
              onApartmentChange={setApartmentId}
            />
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Lease Start</label>
              <input type="date" value={leaseStart} onChange={e => setLeaseStart(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Lease End</label>
              <input type="date" value={leaseEnd} onChange={e => setLeaseEnd(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !buildingId || !apartmentId}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {saving ? 'Saving…' : 'Re-add Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    if (hasBuilding && (!form.buildingId || !form.apartmentId)) return toast.error('Please select a building and unit');
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

            <BuildingApartmentPicker
              buildings={buildings}
              buildingId={form.buildingId}
              apartmentId={form.apartmentId}
              excludeTenantId={tenant._id}
              onBuildingChange={v => setForm(f => ({ ...f, buildingId: v }))}
              onApartmentChange={v => setForm(f => ({ ...f, apartmentId: v }))}
            />

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
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [formerTenants, setFormerTenants] = useState([]);
  const [formerOpen, setFormerOpen] = useState(false);
  const [reAddTarget, setReAddTarget] = useState(null);

  const fetchTenants = () => {
    api.get('/users').then(res => { setTenants(res.data); setSelected(new Set()); }).catch(console.error).finally(() => setLoading(false));
  };

  const fetchFormerTenants = () => {
    api.get('/users?status=moved_out').then(res => setFormerTenants(res.data)).catch(console.error);
  };

  useEffect(() => {
    fetchTenants();
    fetchFormerTenants();
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
    if (hasBuildings && (!form.buildingId || !form.apartmentId)) return toast.error('Please select a building and unit');
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

  const handleMoveOut = async (tenant) => {
    if (!window.confirm(`Mark ${tenant.name} as moved out? Their records will be kept in Former Tenants. The unit will become available for a new tenant.`)) return;
    try {
      await api.put(`/users/${tenant._id}/moveout`);
      setTenants(prev => prev.filter(tn => tn._id !== tenant._id));
      fetchFormerTenants();
      toast.success(`${tenant.name} marked as moved out`);
    } catch {
      toast.error('Failed to move out tenant');
    }
  };

  const handleReAdd = async ({ buildingId, apartmentId, tenantId, leaseStart, leaseEnd }) => {
    try {
      const res = await api.put(`/users/${tenantId}`, { buildingId, apartmentId, leaseStart, leaseEnd });
      await api.put(`/users/${tenantId}/toggle-active`); // re-activate
      setFormerTenants(prev => prev.filter(tn => tn._id !== tenantId));
      setTenants(prev => [...prev, { ...res.data, isActive: true }]);
      setReAddTarget(null);
      toast.success('Tenant re-added successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to re-add tenant');
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
      setFormerTenants(prev => prev.filter(tn => tn._id !== id));
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

  const handleImportFile = (file) => {
    if (!file) return;
    setImportFile(file);
    setImportResult(null);
    setImportPreview(null);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await api.post('/users/bulk-import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(res.data);
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
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
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button onClick={bulkDelete} disabled={bulkDeleting}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                {bulkDeleting ? '...' : `🗑 Delete ${selected.size}`}
              </button>
            )}
            <button onClick={() => { setImportModal(true); setImportFile(null); setImportPreview(null); setImportResult(null); }}
              className="border border-emerald-400 text-emerald-600 hover:bg-emerald-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              📥 Import
            </button>
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
              <BuildingApartmentPicker
                buildings={buildings}
                buildingId={form.buildingId}
                apartmentId={form.apartmentId}
                onBuildingChange={v => setForm(f => ({ ...f, buildingId: v, apartmentId: '' }))}
                onApartmentChange={v => setForm(f => ({ ...f, apartmentId: v }))}
              />
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

        {/* Never logged in alert */}
        {!loading && (() => {
          const neverLogged = tenants.filter(tn => !tn.firstLoginAt);
          if (!neverLogged.length) return null;
          return (
            <NeverLoggedIn tenants={neverLogged} onReset={(tenant) => { setResetTarget(tenant); setNewPassword(''); }} />
          );
        })()}

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
              onMoveOut={handleMoveOut}
            />
          </>
        )}

        {/* Former Tenants section */}
        {formerTenants.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setFormerOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📦</span>
                <span className="text-sm font-semibold text-gray-700">Former Tenants</span>
                <span className="text-xs bg-gray-300 text-gray-600 font-medium px-2 py-0.5 rounded-full">{formerTenants.length}</span>
              </div>
              <span className="text-gray-400 text-sm">{formerOpen ? '▾' : '▸'}</span>
            </button>

            {formerOpen && (
              <div className="mt-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <p className="text-xs text-gray-400 px-4 py-2 border-b border-gray-100 bg-gray-50">
                  Tenants who have moved out. Records are kept for reference. You can re-add them to a new unit or permanently delete.
                </p>
                {formerTenants.map(tenant => (
                  <FormerTenantRow
                    key={tenant._id}
                    tenant={tenant}
                    onDelete={handleDelete}
                    onReAdd={() => setReAddTarget(tenant)}
                  />
                ))}
              </div>
            )}
          </div>
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

      {reAddTarget && (
        <ReAddModal
          tenant={reAddTarget}
          buildings={buildings}
          onClose={() => setReAddTarget(null)}
          onConfirm={handleReAdd}
        />
      )}

      {importModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">📥 Import Tenants</h2>
                <p className="text-xs text-gray-400 mt-0.5">Upload a CSV or Excel file with columns: name, email, phone, unit</p>
              </div>
              <button onClick={() => setImportModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {!importResult ? (
                <>
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${importFile ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400'}`}>
                    <span className="text-3xl mb-2">{importFile ? '📄' : '📁'}</span>
                    <span className="text-sm font-medium text-gray-700">{importFile ? importFile.name : 'Click to choose file'}</span>
                    <span className="text-xs text-gray-400 mt-1">.xlsx, .xls, or .csv</span>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => handleImportFile(e.target.files[0])} />
                  </label>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                    <p className="font-semibold mb-1">Required columns (any order, case-insensitive):</p>
                    <p><span className="font-mono bg-blue-100 px-1 rounded">name</span> · <span className="font-mono bg-blue-100 px-1 rounded">email</span> · <span className="font-mono bg-blue-100 px-1 rounded">unit</span> · <span className="font-mono bg-blue-100 px-1 rounded">phone</span> (optional)</p>
                    <p className="mt-1 text-blue-600">Each tenant gets a welcome email with a random password. Duplicates are skipped.</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setImportModal(false)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleImportSubmit} disabled={!importFile || importing}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                      {importing ? 'Importing…' : 'Import Tenants'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-2xl font-bold text-emerald-700">{importResult.created.length}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Created</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-2xl font-bold text-amber-700">{importResult.skipped.length}</p>
                      <p className="text-xs text-amber-600 mt-0.5">Skipped (existing)</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-2xl font-bold text-red-700">{importResult.errors.length}</p>
                      <p className="text-xs text-red-600 mt-0.5">Errors</p>
                    </div>
                  </div>

                  {importResult.created.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">✅ Created:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResult.created.map((u, i) => (
                          <div key={i} className="text-xs text-gray-700 bg-emerald-50 px-2 py-1 rounded flex justify-between">
                            <span>{u.name}</span><span className="text-gray-400">{u.email} · {u.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResult.errors.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">❌ Errors:</p>
                      <div className="max-h-24 overflow-y-auto space-y-1">
                        {importResult.errors.map((e, i) => (
                          <div key={i} className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
                            {e.row} — {e.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => setImportModal(false)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

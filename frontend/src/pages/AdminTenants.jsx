import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

function PhotoCell({ t, uploadingId, onPhotoUpload, onPhotoDelete, onPhotoView }) {
  return (
    <div className="relative shrink-0 w-10 h-10 group">
      {t.photo ? (
        <>
          <img
            src={t.photo}
            alt={t.name}
            onClick={() => onPhotoView(t.photo)}
            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer group-hover:border-emerald-400 transition-colors"
          />
          {/* Delete button */}
          <button
            onClick={() => onPhotoDelete(t._id)}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs leading-none items-center justify-center hidden group-hover:flex"
            title="Slett bilde"
          >✕</button>
          {/* Replace on click of avatar handled via view; upload via label below */}
          <label className="absolute inset-0 rounded-full cursor-pointer opacity-0">
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => onPhotoUpload(t._id, e.target.files[0])} />
          </label>
        </>
      ) : (
        <label className="cursor-pointer block w-10 h-10">
          <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 group-hover:border-emerald-400 flex items-center justify-center transition-colors">
            <span className="text-gray-500 text-xs font-bold">{t.name?.[0]?.toUpperCase()}</span>
          </div>
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => onPhotoUpload(t._id, e.target.files[0])} />
        </label>
      )}
      {uploadingId === t._id && (
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function TenantRow({ t, uploadingId, onPhotoUpload, onPhotoDelete, onPhotoView, onReset, onDelete }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
      <PhotoCell t={t} uploadingId={uploadingId}
        onPhotoUpload={onPhotoUpload} onPhotoDelete={onPhotoDelete} onPhotoView={onPhotoView} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{t.name}</p>
        <p className="text-xs text-gray-500 truncate">{t.email}{t.phone ? ` · ${t.phone}` : ''}</p>
        <p className="text-xs text-gray-400">{t.unit}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => onReset(t)}
          className="text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
          Reset passord
        </button>
        <button onClick={() => onDelete(t._id, t.name)}
          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors">
          Fjern
        </button>
      </div>
    </div>
  );
}

function BuildingGroups({ tenants, uploadingId, onPhotoUpload, onPhotoDelete, onPhotoView, onReset, onDelete }) {
  // Group by exact unit field (full address like "Storgata 1")
  const groups = tenants.reduce((acc, t) => {
    const key = (t.unit && t.unit.trim()) ? t.unit.trim() : 'Ukjent adresse';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const sorted = Object.keys(groups).sort((a, b) =>
    a === 'Ukjent adresse' ? 1 : b === 'Ukjent adresse' ? -1 : a.localeCompare(b, 'no')
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
            <button
              onClick={() => toggle(address)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🏢</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{address}</p>
                  <p className="text-xs text-gray-400">{group.length} leietaker{group.length !== 1 ? 'e' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {group.slice(0, 4).map(t => (
                    t.photo
                      ? <img key={t._id} src={t.photo} alt={t.name} className="w-7 h-7 rounded-full object-cover border-2 border-white" />
                      : <div key={t._id} className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{t.name?.[0]?.toUpperCase()}</span>
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
                {group.map(t => (
                  <TenantRow key={t._id} t={t} uploadingId={uploadingId}
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
    api.get('/users')
      .then((res) => setTenants(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.unit) return toast.error('Name, email and unit are required');
    if (form.password && form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success(`Account created — login details sent to ${form.email}`);
      setForm({ name: '', email: '', unit: '', building: '', phone: '', password: '' });
      setShowForm(false);
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tenant');
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
      toast.success(`Password updated and emailed to ${resetTarget.email}`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Slett ${name}s konto? Dette kan ikke angres.`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Leietaker fjernet');
      setTenants(prev => prev.filter(t => t._id !== id));
    } catch {
      toast.error('Kunne ikke slette leietaker');
    }
  };

  const handlePhotoUpload = async (tenantId, file) => {
    if (!file) return;
    setUploadingId(tenantId);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await api.put(`/users/${tenantId}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTenants(prev => prev.map(t => t._id === tenantId ? { ...t, photo: res.data.photo } : t));
      toast.success('Profilbilde oppdatert');
    } catch {
      toast.error('Kunne ikke laste opp bilde');
    } finally {
      setUploadingId(null);
    }
  };

  const handlePhotoDelete = async (tenantId) => {
    if (!window.confirm('Slett profilbilde?')) return;
    try {
      await api.delete(`/users/${tenantId}/photo`);
      setTenants(prev => prev.map(t => t._id === tenantId ? { ...t, photo: null } : t));
      toast.success('Profilbilde slettet');
    } catch {
      toast.error('Kunne ikke slette bilde');
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Leietakere</h1>
            <p className="text-gray-500 text-sm mt-1">{tenants.length} leietaker{tenants.length !== 1 ? 'e' : ''} registrert</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {showForm ? 'Avbryt' : '+ Legg til leietaker'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-emerald-200 p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-gray-700">Ny leietakerkonto</h2>
            <p className="text-xs text-gray-500">La passord stå tomt for å auto-generere. Innloggingsdetaljer sendes på e-post.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fullt navn *</label>
                <input type="text" required value={form.name} onChange={update('name')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">E-post *</label>
                <input type="email" required value={form.email} onChange={update('email')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (gatenavn + nr.) *</label>
                <input type="text" required value={form.unit} onChange={update('unit')}
                  placeholder="f.eks. Storgata 1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Leilighetsnummer</label>
                <input type="text" value={form.building} onChange={update('building')}
                  placeholder="f.eks. Leilighet 3A"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="tel" value={form.phone} onChange={update('phone')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passord <span className="text-gray-400 font-normal">(valgfritt)</span>
                </label>
                <input type="text" value={form.password} onChange={update('password')}
                  placeholder="Min. 6 tegn"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {saving ? 'Oppretter...' : 'Opprett konto og send innloggingsdetaljer'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-16" />)}
          </div>
        ) : tenants.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">Ingen leietakere enda. Legg til ovenfor.</p>
          </div>
        ) : (
          <BuildingGroups
            tenants={tenants}
            uploadingId={uploadingId}
            onPhotoUpload={handlePhotoUpload}
            onPhotoDelete={handlePhotoDelete}
            onPhotoView={setLightbox}
            onReset={(t) => { setResetTarget(t); setNewPassword(''); }}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Photo lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300">✕</button>
          <img src={lightbox} alt="profil" className="max-w-sm max-h-full rounded-2xl shadow-2xl object-cover"
            onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-semibold text-gray-800 mb-1">Tilbakestill passord</h2>
            <p className="text-sm text-gray-500 mb-4">
              Sett nytt passord for <strong>{resetTarget.name}</strong>. Det sendes på e-post til {resetTarget.email}.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nytt passord *</label>
                <input type="text" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 tegn"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setResetTarget(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Avbryt
                </button>
                <button type="submit" disabled={resetting}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
                  {resetting ? 'Lagrer...' : 'Oppdater og send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

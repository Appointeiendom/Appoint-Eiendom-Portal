import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

export default function AdminTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', unit: '', building: '', phone: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState(null); // { _id, name, email }
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
    if (!window.confirm(`Delete ${name}'s account? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Tenant removed');
      setTenants((prev) => prev.filter((t) => t._id !== id));
    } catch {
      toast.error('Failed to delete tenant');
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

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Manage Tenants</h1>
            <p className="text-gray-500 text-sm mt-1">{tenants.length} tenant(s) registered</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {showForm ? 'Cancel' : '+ Add Tenant'}
          </button>
        </div>

        {/* Create Tenant Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-emerald-200 p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-gray-700">New Tenant Account</h2>
            <p className="text-xs text-gray-500">Leave password blank to auto-generate one. Credentials are emailed to the tenant.</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" required value={form.name} onChange={update('name')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={update('email')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit / Address *</label>
                <input type="text" required value={form.unit} onChange={update('unit')}
                  placeholder="e.g. Storgata 12 - Unit 3A"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                <input type="text" value={form.building} onChange={update('building')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={update('phone')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-gray-400 font-normal">(optional — leave blank to auto-generate)</span>
                </label>
                <input type="text" value={form.password} onChange={update('password')}
                  placeholder="Min 6 characters"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Account & Send Credentials'}
            </button>
          </form>
        )}

        {/* Tenants List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-16" />)}
          </div>
        ) : tenants.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">No tenants yet. Add one above.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Photo</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium hidden sm:table-cell">Unit</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium hidden md:table-cell">Phone</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <label className="cursor-pointer group relative block w-10 h-10">
                        {t.photo
                          ? <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 group-hover:border-emerald-400 transition-colors" />
                          : <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 group-hover:border-emerald-400 flex items-center justify-center transition-colors">
                              <span className="text-gray-400 text-xs">+</span>
                            </div>
                        }
                        {uploadingId === t._id && (
                          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => handlePhotoUpload(t._id, e.target.files[0])} />
                      </label>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                    <td className="px-4 py-3 text-gray-500">{t.email}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{t.unit}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{t.phone || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setResetTarget(t); setNewPassword(''); }}
                          className="text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                          Reset Password
                        </button>
                        <button onClick={() => handleDelete(t._id, t.name)}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-semibold text-gray-800 mb-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">
              Set a new password for <strong>{resetTarget.name}</strong>. It will be emailed to {resetTarget.email}.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setResetTarget(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={resetting}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
                  {resetting ? 'Saving...' : 'Update & Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

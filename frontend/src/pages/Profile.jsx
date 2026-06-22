import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';

  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fields = [
    { label: t('profile.fullName'), value: user?.name },
    { label: t('profile.email'), value: user?.email },
    { label: t('profile.phone'), value: user?.phone || '—' },
    ...(user?.role === 'tenant' ? [
      { label: t('profile.unitAddress'), value: user?.unit },
      { label: t('profile.building'), value: user?.building || '—' },
    ] : []),
    { label: t('profile.role'), value: user?.role },
  ];

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/update-email', emailForm);
      updateUser({ email: res.data.email });
      toast.success('E-post oppdatert');
      setEmailForm({ email: '', password: '' });
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Noe gikk galt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('profile.title')}</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
            </div>
          </div>

          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{f.label}</span>
                <span className="text-sm font-medium text-gray-800 capitalize">{f.value}</span>
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Endre e-post</p>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {showForm ? 'Avbryt' : 'Endre'}
                </button>
              </div>

              {showForm && (
                <form onSubmit={handleEmailChange} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ny e-post</label>
                    <input
                      type="email" required value={emailForm.email}
                      onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="ny@epost.no"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bekreft med passord</label>
                    <input
                      type="password" required value={emailForm.password}
                      onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="••••••••"
                    />
                  </div>
                  <button
                    type="submit" disabled={saving}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Lagrer…' : 'Lagre ny e-post'}
                  </button>
                </form>
              )}
            </div>
          )}

          {!isAdmin && (
            <p className="text-xs text-gray-400 mt-4 text-center">{t('profile.contactAdmin')}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

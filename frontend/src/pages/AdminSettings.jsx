import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const DEFAULT_BODY = `Your tenant account has been created. You can now log in and report maintenance issues directly through the portal.

Please change your password after your first login.`;

export default function AdminSettings() {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(r => setBody(r.data.welcomeEmailBody || DEFAULT_BODY))
      .catch(() => setBody(DEFAULT_BODY))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', { welcomeEmailBody: body });
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => setBody(DEFAULT_BODY);

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure email templates and portal preferences</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-1">Welcome Email Message</h2>
          <p className="text-sm text-gray-500 mb-4">
            This message is sent to new tenants when their account is created, along with their login credentials.
          </p>

          {loading ? (
            <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <textarea
              rows={7}
              value={body}
              onChange={e => setBody(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
          )}

          <div className="flex items-center justify-between mt-4">
            <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Reset to default
            </button>
            <button onClick={save} disabled={saving || loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

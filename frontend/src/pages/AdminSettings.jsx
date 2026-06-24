import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const DEFAULT_BODY = `Your tenant account has been created. You can now log in and report maintenance issues directly through the portal.

Please change your password after your first login.`;

export default function AdminSettings() {
  const { t } = useLanguage();
  const [body, setBody] = useState('');
  const [digestTime, setDigestTime] = useState('08:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDigest, setSavingDigest] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(r => {
        setBody(r.data.welcomeEmailBody || DEFAULT_BODY);
        setDigestTime(r.data.digestReminderTime || '08:00');
      })
      .catch(() => setBody(DEFAULT_BODY))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', { welcomeEmailBody: body });
      toast.success(t('settings.saved'));
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const saveDigest = async () => {
    setSavingDigest(true);
    try {
      await api.put('/settings', { digestReminderTime: digestTime });
      toast.success(digestTime ? t('settings.reminderSet')(digestTime) : t('settings.reminderDisabled'));
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setSavingDigest(false);
    }
  };

  const reset = () => setBody(DEFAULT_BODY);

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('settings.title')}</h1>
        </div>

        {/* Daily message digest reminder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h2 className="font-semibold text-gray-700 mb-1">{t('settings.digestTitle')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('settings.digestDesc')}</p>
          {loading ? (
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse w-40" />
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <input type="time" value={digestTime} onChange={e => setDigestTime(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <button onClick={saveDigest} disabled={savingDigest}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                {savingDigest ? t('common.saving') : t('settings.saveTime')}
              </button>
              {digestTime && (
                <button onClick={() => setDigestTime('')} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  {t('settings.disable')}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-1">{t('settings.welcomeTitle')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('settings.welcomeDesc')}</p>

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
              {t('settings.resetDefault')}
            </button>
            <button onClick={save} disabled={saving || loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Layout from '../components/Layout';
import api from '../services/api';

export default function MaintenanceDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user?._id) return;
    api.get(`/maintenance/${user._id}`).then(r => setProfile(r.data)).catch(console.error);
  }, [user]);

  return (
    <Layout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('maintenance.welcomeMsg')} {user?.name}</h1>
        <p className="text-gray-500 text-sm mb-6">{t('maintenance.tradeLabel')} {user?.trade || profile?.trade}</p>

        <div className="grid gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="font-semibold text-gray-700 mb-4">{t('maintenance.yourProfile')}</h2>
            <div className="flex gap-4 items-center">
              {profile?.photo
                ? <img src={profile.photo} alt={user?.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
                : <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl">👷</div>
              }
              <div>
                <p className="font-medium text-gray-800">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                {profile?.phone && <p className="text-sm text-gray-500">{profile.phone}</p>}
                {profile?.bio && <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>}
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <h2 className="font-semibold text-gray-700 mb-1">{t('nav.availability')}</h2>
            <p className="text-sm text-gray-500 mb-3">{t('maintenance.manageHint')}</p>
            <a href="/maintenance/availability"
              className="inline-block bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors">
              {t('maintenance.manageAvailability')}
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}

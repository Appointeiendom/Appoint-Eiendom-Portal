import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Layout from '../components/Layout';

export default function Profile() {
  const { user } = useAuth();
  const { t } = useLanguage();

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
          <p className="text-xs text-gray-400 mt-4 text-center">{t('profile.contactAdmin')}</p>
        </div>
      </div>
    </Layout>
  );
}

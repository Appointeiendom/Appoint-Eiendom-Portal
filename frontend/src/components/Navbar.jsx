import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { lang, toggleLang, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard'
    : user?.role === 'maintenance' ? '/maintenance/dashboard'
    : '/tenant/dashboard';

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label={t('nav.openMenu')}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect y="3" width="20" height="2" rx="1" />
            <rect y="9" width="20" height="2" rx="1" />
            <rect y="15" width="20" height="2" rx="1" />
          </svg>
        </button>

        <Link to={dashboardPath} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AE</span>
          </div>
          <span className="font-semibold text-gray-800 text-lg">Service Portal</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          title={lang === 'no' ? 'Switch to English' : 'Bytt til norsk'}
        >
          {lang === 'no' ? '🇬🇧 EN' : '🇳🇴 NO'}
        </button>

        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-800">{user?.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}{user?.unit ? ` · ${user.unit}` : ''}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors"
        >
          {t('common.logout')}
        </button>
      </div>
    </nav>
  );
}

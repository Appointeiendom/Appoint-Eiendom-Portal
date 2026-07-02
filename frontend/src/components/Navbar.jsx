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
    <nav className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between" style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-800 text-lg">Service Portal</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="text-xs font-semibold px-2.5 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          title={lang === 'no' ? 'Switch to English' : 'Bytt til norsk'}
        >
          {lang === 'no' ? '🇬🇧 EN' : '🇳🇴 NO'}
        </button>

        <div className="text-right">
          <p className="text-xs sm:text-sm font-medium text-gray-800 truncate max-w-[120px] sm:max-w-none">{user?.role === 'admin' ? 'Admin' : user?.name}</p>
          <p className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">{user?.unit || <span className="capitalize">{user?.role}</span>}{user?.building ? ` · ${t('profile.building')} ${user.building}` : ''}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs sm:text-sm border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-500 px-2.5 sm:px-3 py-2 rounded-lg transition-colors"
        >
          {t('common.logout')}
        </button>
      </div>
    </nav>
  );
}

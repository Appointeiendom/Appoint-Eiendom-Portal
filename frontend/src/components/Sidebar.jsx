import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUnread } from '../context/UnreadContext';

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unreadCount, maintenanceUnread } = useUnread();

  const adminLinks = [
    { to: '/admin/dashboard', label: t('nav.dashboard'), icon: '🏠' },
    { to: '/admin/issues', label: t('nav.allIssues'), icon: '📋' },
    { to: '/admin/tenants', label: t('nav.tenants'), icon: '👥' },
    { to: '/admin/maintenance', label: t('nav.maintenance'), icon: '🔧' },
    { to: '/admin/announcements', label: t('nav.announcements'), icon: '📢' },
    { to: '/admin/documents', label: t('nav.documents'), icon: '📁' },
    { to: '/admin/waste', label: t('nav.wasteReports'), icon: '♻️' },
    { to: '/admin/analytics', label: t('nav.analytics'), icon: '📊' },
    { to: '/admin/inspections', label: 'Inspections', icon: '🔥' },
    { to: '/admin/settings', label: t('nav.settings'), icon: '⚙️' },
    { to: '/admin/profile', label: t('nav.profile'), icon: '👤' },
  ];

  const tenantLinks = [
    { to: '/tenant/dashboard', label: t('nav.dashboard'), icon: '🏠' },
    { to: '/tenant/issues', label: t('nav.myIssues'), icon: '📋' },
    { to: '/tenant/issues/new', label: t('nav.reportIssue'), icon: '➕' },
    { to: '/tenant/notices', label: t('nav.noticesDocs'), icon: '📢', badge: unreadCount },
    { to: '/tenant/waste', label: t('nav.wasteEnv'), icon: '♻️' },
    { to: '/tenant/profile', label: t('nav.profile'), icon: '👤' },
  ];

  const maintenanceLinks = [
    { to: '/maintenance/dashboard', label: t('nav.dashboard'), icon: '🏠' },
    { to: '/maintenance/inbox', label: t('maintenance.inbox'), icon: '💬', badge: maintenanceUnread },
    { to: '/maintenance/jobs', label: t('maintenance.jobHistory'), icon: '📋' },
  ];

  const links = user?.role === 'admin' ? adminLinks
    : user?.role === 'maintenance' ? maintenanceLinks
    : tenantLinks;

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-56 bg-gray-900 text-white flex flex-col pt-16 z-30 transition-transform duration-300
        md:static md:translate-x-0 md:z-auto md:min-h-screen md:pt-6
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white md:hidden" aria-label={t('nav.closeMenu')}>
          ✕
        </button>

        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span>{link.icon}</span>
            <span className="flex-1">{link.label}</span>
            {link.badge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </aside>
    </>
  );
}

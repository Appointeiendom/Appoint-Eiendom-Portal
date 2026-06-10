import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/admin/issues', label: 'All Issues', icon: '📋' },
  { to: '/admin/tenants', label: 'Tenants', icon: '👥' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📊' },
  { to: '/admin/profile', label: 'Profile', icon: '👤' },
];

const tenantLinks = [
  { to: '/tenant/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/tenant/issues', label: 'My Issues', icon: '📋' },
  { to: '/tenant/issues/new', label: 'Report Issue', icon: '➕' },
  { to: '/tenant/profile', label: 'Profile', icon: '👤' },
];

export default function Sidebar() {
  const { user } = useAuth();
  const links = user?.role === 'admin' ? adminLinks : tenantLinks;

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col pt-6">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-emerald-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`
          }
        >
          <span>{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </aside>
  );
}

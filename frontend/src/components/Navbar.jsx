import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/tenant/dashboard';

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
      <Link to={dashboardPath} className="flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">SS</span>
        </div>
        <span className="font-semibold text-gray-800 text-lg">Appoint Eiendom AS</span>
      </Link>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-800">{user?.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}{user?.unit ? ` · ${user.unit}` : ''}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

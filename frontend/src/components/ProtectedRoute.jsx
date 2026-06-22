import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    const home = user.role === 'admin' ? '/admin/dashboard'
      : user.role === 'maintenance' ? '/maintenance/dashboard'
      : '/tenant/dashboard';
    return <Navigate to={home} replace />;
  }

  return children;
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import TenantDashboard from './pages/TenantDashboard';
import MyIssues from './pages/MyIssues';
import ReportIssue from './pages/ReportIssue';
import IssueDetails from './pages/IssueDetails';
import AdminDashboard from './pages/AdminDashboard';
import AdminIssues from './pages/AdminIssues';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminTenants from './pages/AdminTenants';
import AdminMaintenance from './pages/AdminMaintenance';
import MaintenanceDashboard from './pages/MaintenanceDashboard';
import MaintenanceAvailability from './pages/MaintenanceAvailability';
import Profile from './pages/Profile';

export default function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Tenant */}
          <Route path="/tenant/dashboard" element={<ProtectedRoute role="tenant"><TenantDashboard /></ProtectedRoute>} />
          <Route path="/tenant/issues" element={<ProtectedRoute role="tenant"><MyIssues /></ProtectedRoute>} />
          <Route path="/tenant/issues/new" element={<ProtectedRoute role="tenant"><ReportIssue /></ProtectedRoute>} />
          <Route path="/tenant/issues/:id" element={<ProtectedRoute role="tenant"><IssueDetails /></ProtectedRoute>} />
          <Route path="/tenant/profile" element={<ProtectedRoute role="tenant"><Profile /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/issues" element={<ProtectedRoute role="admin"><AdminIssues /></ProtectedRoute>} />
          <Route path="/admin/issues/:id" element={<ProtectedRoute role="admin"><IssueDetails /></ProtectedRoute>} />
          <Route path="/admin/tenants" element={<ProtectedRoute role="admin"><AdminTenants /></ProtectedRoute>} />
          <Route path="/admin/maintenance" element={<ProtectedRoute role="admin"><AdminMaintenance /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute role="admin"><Profile /></ProtectedRoute>} />

          {/* Maintenance */}
          <Route path="/maintenance/dashboard" element={<ProtectedRoute role="maintenance"><MaintenanceDashboard /></ProtectedRoute>} />
          <Route path="/maintenance/availability" element={<ProtectedRoute role="maintenance"><MaintenanceAvailability /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  );
}

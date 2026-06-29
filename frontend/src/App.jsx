import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { UnreadProvider } from './context/UnreadContext';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import api from './services/api';

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
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminDocuments from './pages/AdminDocuments';
import MaintenanceDashboard from './pages/MaintenanceDashboard';
import MaintenanceInbox from './pages/MaintenanceInbox';
import MaintenanceJobHistory from './pages/MaintenanceJobHistory';
import TenantDocuments from './pages/TenantDocuments';
import Profile from './pages/Profile';
import TenantWasteReport from './pages/TenantWasteReport';
import AdminWasteReports from './pages/AdminWasteReports';
import AdminSettings from './pages/AdminSettings';
import AdminInspections from './pages/AdminInspections';
import TenantInspection from './pages/TenantInspection';

// Blocks tenant portal access when an active inspection needs a response
function InspectionGate({ children }) {
  const { user } = useAuth();
  const [activeInspection, setActiveInspection] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (user?.role !== 'tenant') { setChecked(true); return; }
    api.get('/inspections/active').then(r => {
      if (r.data && !r.data.responded) setActiveInspection(r.data.inspection);
    }).catch(() => {}).finally(() => setChecked(true));
  }, [user?._id]);

  if (!checked) return null;
  if (activeInspection) {
    return (
      <>
        {children}
        <TenantInspection inspection={activeInspection} onComplete={() => setActiveInspection(null)} />
      </>
    );
  }
  return children;
}

// Syncs language based on logged-in user's role, runs once per role change
function LangSync() {
  const { user } = useAuth();
  const { lang, setLang } = useLanguage();

  useEffect(() => {
    if (user?.role === 'admin' && lang !== 'en') {
      setLang('en');
    } else if ((user?.role === 'tenant' || user?.role === 'maintenance') && lang !== 'no') {
      // Only set to 'no' if no explicit user preference — do nothing, leave as-is
    }
  }, [user?.role]); // eslint-disable-line

  return null;
}

export default function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
    <UnreadProvider>
      <BrowserRouter>
        <LangSync />
        <Toaster position="top-right" toastOptions={{ duration: 3000, error: { duration: 5000 } }} />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Tenant — wrapped in InspectionGate to block if inspection is pending */}
          <Route path="/tenant/dashboard" element={<ProtectedRoute role="tenant"><InspectionGate><TenantDashboard /></InspectionGate></ProtectedRoute>} />
          <Route path="/tenant/issues" element={<ProtectedRoute role="tenant"><MyIssues /></ProtectedRoute>} />
          <Route path="/tenant/issues/new" element={<ProtectedRoute role="tenant"><ReportIssue /></ProtectedRoute>} />
          <Route path="/tenant/issues/:id" element={<ProtectedRoute role="tenant"><IssueDetails /></ProtectedRoute>} />
          <Route path="/tenant/notices" element={<ProtectedRoute role="tenant"><TenantDocuments /></ProtectedRoute>} />
          <Route path="/tenant/profile" element={<ProtectedRoute role="tenant"><Profile /></ProtectedRoute>} />
          <Route path="/tenant/waste" element={<ProtectedRoute role="tenant"><TenantWasteReport /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/issues" element={<ProtectedRoute role="admin"><AdminIssues /></ProtectedRoute>} />
          <Route path="/admin/issues/:id" element={<ProtectedRoute role="admin"><IssueDetails /></ProtectedRoute>} />
          <Route path="/admin/tenants" element={<ProtectedRoute role="admin"><AdminTenants /></ProtectedRoute>} />
          <Route path="/admin/maintenance" element={<ProtectedRoute role="admin"><AdminMaintenance /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/announcements" element={<ProtectedRoute role="admin"><AdminAnnouncements /></ProtectedRoute>} />
          <Route path="/admin/documents" element={<ProtectedRoute role="admin"><AdminDocuments /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute role="admin"><Profile /></ProtectedRoute>} />
          <Route path="/admin/waste" element={<ProtectedRoute role="admin"><AdminWasteReports /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/inspections" element={<ProtectedRoute role="admin"><AdminInspections /></ProtectedRoute>} />

          {/* Maintenance */}
          <Route path="/maintenance/dashboard" element={<ProtectedRoute role="maintenance"><MaintenanceDashboard /></ProtectedRoute>} />
          <Route path="/maintenance/inbox" element={<ProtectedRoute role="maintenance"><MaintenanceInbox /></ProtectedRoute>} />
          <Route path="/maintenance/jobs" element={<ProtectedRoute role="maintenance"><MaintenanceJobHistory /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </UnreadProvider>
    </AuthProvider>
    </LanguageProvider>
  );
}

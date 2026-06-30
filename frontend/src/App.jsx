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
import AdminBuildings from './pages/AdminBuildings';
import TenantInspection from './pages/TenantInspection';

// Blocks tenant portal access when an active inspection needs a response
// Also shows a "Redo" banner when already responded
function InspectionGate({ children }) {
  const { user } = useAuth();
  const [activeInspection, setActiveInspection] = useState(null);
  const [responded, setResponded] = useState(false);
  const [redoing, setRedoing] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (user?.role !== 'tenant') { setChecked(true); return; }
    api.get('/inspections/active').then(r => {
      if (r.data) {
        setActiveInspection(r.data.inspection);
        setResponded(r.data.responded);
        if (!r.data.responded) setRedoing(false);
      }
    }).catch(() => {}).finally(() => setChecked(true));
  }, [user?._id]);

  if (!checked) return null;

  // Show form if not yet responded, OR if tenant chose to redo
  if (activeInspection && (!responded || redoing)) {
    return (
      <>
        {children}
        <TenantInspection
          inspection={activeInspection}
          onComplete={() => { setResponded(true); setRedoing(false); }}
        />
      </>
    );
  }

  // Show a subtle redo banner if they've already responded to active inspection
  return (
    <>
      {children}
      {activeInspection && responded && (
        <div className="fixed bottom-4 right-4 z-40 bg-white border border-emerald-200 rounded-2xl shadow-lg px-5 py-3 flex items-center gap-3 max-w-xs">
          <span className="text-2xl">✅</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Inspection submitted</p>
            <p className="text-xs text-gray-400 truncate">Made a mistake?</p>
          </div>
          <button
            onClick={() => setRedoing(true)}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 whitespace-nowrap border border-emerald-200 hover:border-emerald-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            Redo
          </button>
        </div>
      )}
    </>
  );
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
          <Route path="/admin/buildings" element={<ProtectedRoute role="admin"><AdminBuildings /></ProtectedRoute>} />

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

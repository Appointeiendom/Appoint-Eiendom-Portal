import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Layout from '../components/Layout';
import api from '../services/api';

export default function MaintenanceDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [assignedIssues, setAssignedIssues] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    api.get(`/maintenance/${user._id}`).then(r => setProfile(r.data)).catch(console.error);
    api.get('/issues').then(r => setAssignedIssues(r.data)).catch(console.error);
  }, [user]);

  const updateStatus = async (issueId, status) => {
    try {
      const res = await api.put(`/issues/${issueId}`, { status });
      setAssignedIssues(prev => prev.map(i => i._id === issueId ? res.data : i));
    } catch {}
  };

  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          {profile?.photo
            ? <img src={profile.photo} alt={user?.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shrink-0" />
            : <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-2xl shrink-0">👷</div>
          }
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('maintenance.welcomeMsg')} {user?.name}</h1>
            <p className="text-gray-500 text-sm">{t('maintenance.tradeLabel')} {user?.trade || profile?.trade}</p>
          </div>
        </div>

        <h2 className="font-semibold text-gray-700 mb-3">🔧 Assigned Issues ({assignedIssues.length})</h2>
        {assignedIssues.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
            No issues assigned to you yet.
          </div>
        ) : (
          <div className="space-y-3">
            {assignedIssues.map(issue => (
              <div key={issue._id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-medium text-gray-800">{issue.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{issue.tenantId?.name} · {issue.unit}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{issue.category} · {new Date(issue.createdAt).toLocaleDateString()}</p>
                    {issue.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{issue.description}</p>}
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${issue.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : issue.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                    {t(`status.${issue.status}`)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {['open', 'in-progress', 'resolved'].map(s => (
                    <button key={s} disabled={issue.status === s}
                      onClick={() => updateStatus(issue._id, s)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${issue.status === s ? 'bg-emerald-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {t(`status.${s}`)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

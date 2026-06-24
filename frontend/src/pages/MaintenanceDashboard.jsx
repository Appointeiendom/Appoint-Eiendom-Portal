import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Layout from '../components/Layout';
import MaintenanceChatBox from '../components/MaintenanceChatBox';
import api from '../services/api';

export default function MaintenanceDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [threads, setThreads] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [activeThread, setActiveThread] = useState(null);

  useEffect(() => {
    if (!user?._id) return;
    api.get(`/maintenance/${user._id}`).then(r => setProfile(r.data)).catch(console.error);
    api.get('/messages/maintenance/threads').then(r => setThreads(r.data)).catch(console.error);
    api.get(`/maintenance/${user._id}/jobs`).then(r => setJobs(r.data)).catch(console.error);
    api.get('/issues').then(r => setAssignedIssues(r.data)).catch(console.error);
  }, [user]);

  const updateStatus = async (issueId, status) => {
    try {
      const res = await api.put(`/issues/${issueId}`, { status });
      setAssignedIssues(prev => prev.map(i => i._id === issueId ? res.data : i));
    } catch {}
  };

  const totalUnread = threads.reduce((sum, th) => sum + (th.unreadCount || 0), 0);

  return (
    <Layout>
      <div className="flex gap-5 h-[calc(100vh-80px)] overflow-hidden">

        {/* ── Left sidebar ── */}
        <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">

          {/* Profile */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex gap-3 items-center">
              {profile?.photo
                ? <img src={profile.photo} alt={user?.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 shrink-0" />
                : <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl shrink-0">👷</div>
              }
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                {profile?.phone && <p className="text-xs text-gray-500">{profile.phone}</p>}
              </div>
            </div>
            {profile?.bio && <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">{profile.bio}</p>}
          </div>

          {/* Inbox */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-700 text-sm">💬 Inbox</p>
              {totalUnread > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{totalUnread}</span>}
            </div>
            {threads.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">{t('chat.noMessages')}</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {threads.map(({ issue, lastMessage, unreadCount }) => {
                  const isActive = activeThread?.issue._id === issue._id;
                  return (
                    <button key={issue._id} onClick={() => setActiveThread(isActive ? null : { issue })}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isActive ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''}`}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{issue.title}</p>
                          <p className="text-xs text-gray-400 truncate">{issue.tenantId?.name} · {issue.unit}</p>
                          {lastMessage && <p className="text-xs text-gray-400 truncate mt-0.5">{lastMessage.message}</p>}
                        </div>
                        {unreadCount > 0 && <span className="shrink-0 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Job History */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-700 text-sm">📋 Job History ({jobs.length})</p>
            </div>
            {jobs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No job history yet.</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {jobs.map(job => (
                  <div key={job._id} className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{job.title}</p>
                    <p className="text-xs text-gray-400">{job.tenantId?.name} · {new Date(job.updatedAt).toLocaleDateString()}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${job.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : job.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                      {t(`status.${job.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Main area ── */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {activeThread ? (
            /* Messenger view */
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => setActiveThread(null)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
                <div>
                  <p className="font-semibold text-gray-800">{activeThread.issue.title}</p>
                  <p className="text-xs text-gray-400">{activeThread.issue.tenantId?.name} · {activeThread.issue.unit}</p>
                </div>
              </div>
              <div className="flex-1">
                <MaintenanceChatBox
                  key={activeThread.issue._id}
                  issueId={activeThread.issue._id}
                  maintenanceId={user._id}
                  maintenanceName={user.name}
                  heightClass="h-full"
                />
              </div>
            </div>
          ) : (
            /* Assigned issues */
            <div>
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
          )}
        </div>

      </div>
    </Layout>
  );
}

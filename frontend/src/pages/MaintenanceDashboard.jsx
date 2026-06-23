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
  const [activeThread, setActiveThread] = useState(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [tab, setTab] = useState('inbox');

  useEffect(() => {
    if (!user?._id) return;
    api.get(`/maintenance/${user._id}`).then(r => setProfile(r.data)).catch(console.error);
    api.get('/messages/maintenance/threads')
      .then(r => setThreads(r.data))
      .catch(console.error)
      .finally(() => setLoadingThreads(false));
    api.get(`/maintenance/${user._id}/jobs`).then(r => setJobs(r.data)).catch(console.error);
  }, [user]);

  return (
    <Layout>
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          {t('maintenance.welcomeMsg')} {user?.name}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {t('maintenance.tradeLabel')} {user?.trade || profile?.trade}
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Left column: profile + availability */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-700 mb-4">{t('maintenance.yourProfile')}</h2>
              <div className="flex gap-3 items-center">
                {profile?.photo
                  ? <img src={profile.photo} alt={user?.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-100" />
                  : <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-2xl shrink-0">👷</div>
                }
                <div>
                  <p className="font-medium text-gray-800">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  {profile?.phone && <p className="text-sm text-gray-500">{profile.phone}</p>}
                  {profile?.bio && <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>}
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-700 mb-1">{t('nav.availability')}</h2>
              <p className="text-xs text-gray-500 mb-3">{t('maintenance.manageHint')}</p>
              <a href="/maintenance/availability"
                className="inline-block bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors">
                {t('maintenance.manageAvailability')}
              </a>
            </div>
          </div>

          {/* Right column: inbox + job history */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setTab('inbox')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'inbox' ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                💬 {t('chat.inbox') || 'Inbox'}
                {threads.filter(th => th.unreadCount > 0).length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{threads.filter(th => th.unreadCount > 0).length}</span>}
              </button>
              <button onClick={() => setTab('history')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'history' ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                📋 Job History ({jobs.length})
              </button>
            </div>

            {tab === 'history' ? (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {jobs.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No job history yet.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {jobs.map(job => (
                      <div key={job._id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{job.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{job.tenantId?.name} · {job.unit}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(job.updatedAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{job.category}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${job.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : job.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                              {t(`status.${job.status}`)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Thread list */}
            {tab === 'inbox' && <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-700">
                  {t('chat.inbox') || 'Innboks'}
                  {threads.filter(t => t.unreadCount > 0).length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {threads.filter(t => t.unreadCount > 0).length}
                    </span>
                  )}
                </h2>
              </div>

              {loadingThreads ? (
                <div className="p-6 space-y-3">
                  {[1,2].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              ) : threads.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {t('chat.noMessages') || 'Ingen meldinger enda'}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {threads.map(({ issue, lastMessage, unreadCount }) => {
                    const isActive = activeThread?.issue._id === issue._id;
                    return (
                      <button
                        key={issue._id}
                        onClick={() => setActiveThread(isActive ? null : { issue })}
                        className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors ${isActive ? 'bg-emerald-50' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-800 text-sm truncate">{issue.title}</p>
                              {unreadCount > 0 && (
                                <span className="shrink-0 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {issue.tenantId?.name} · {issue.unit}
                            </p>
                            {lastMessage && (
                              <p className="text-xs text-gray-400 mt-1 truncate">{lastMessage.message}</p>
                            )}
                          </div>
                          <span className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                            issue.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                            issue.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {t(`status.${issue.status}`)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>}

            {/* Active chat */}
            {tab === 'inbox' && activeThread && (
              <MaintenanceChatBox
                key={activeThread.issue._id}
                issueId={activeThread.issue._id}
                maintenanceId={user._id}
                maintenanceName={user.name}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

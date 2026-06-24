import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Layout from '../components/Layout';
import MaintenanceChatBox from '../components/MaintenanceChatBox';
import api from '../services/api';

export default function MaintenanceInbox() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(null);

  useEffect(() => {
    api.get('/messages/maintenance/threads')
      .then(r => { setThreads(r.data); if (r.data.length > 0) setActiveThread(r.data[0]); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalUnread = threads.reduce((sum, th) => sum + (th.unreadCount || 0), 0);

  return (
    <Layout>
      <div className="flex gap-0 h-[calc(100vh-80px)] overflow-hidden rounded-xl border border-gray-200 bg-white">

        {/* Thread list */}
        <div className="w-72 shrink-0 border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-800">💬 {t('maintenance.inbox')}</p>
            {totalUnread > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{totalUnread}</span>}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : threads.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">{t('chat.noMessages')}</p>
            ) : (
              threads.map((thread) => {
                const { issue, lastMessage, unreadCount } = thread;
                const isActive = activeThread?.issue._id === issue._id;
                return (
                  <button key={issue._id} onClick={() => setActiveThread(thread)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isActive ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'border-l-4 border-transparent'}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {issue.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{issue.tenantId?.name} · {issue.unit}</p>
                        {lastMessage && <p className="text-xs text-gray-400 truncate mt-0.5">{lastMessage.message}</p>}
                      </div>
                      {unreadCount > 0 && <span className="shrink-0 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full mt-0.5">{unreadCount}</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Messenger area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {activeThread ? (
            <>
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-800">{activeThread.issue.title}</p>
                <p className="text-xs text-gray-400">{activeThread.issue.tenantId?.name} · {activeThread.issue.unit}</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <MaintenanceChatBox
                  key={activeThread.issue._id}
                  issueId={activeThread.issue._id}
                  maintenanceId={user._id}
                  maintenanceName={user.name}
                  heightClass="h-full"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              {t('maintenance.selectConversation')}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

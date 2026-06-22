import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getSocket } from '../services/socketService';
import api from '../services/api';
import Layout from '../components/Layout';
import ChatBox from '../components/ChatBox';
import MaintenanceChatBox from '../components/MaintenanceChatBox';
import MaintenanceDirectory from '../components/MaintenanceDirectory';
import toast from 'react-hot-toast';

const priorityStyles = { high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };
const statusStyles = { open: 'bg-blue-100 text-blue-700', 'in-progress': 'bg-yellow-100 text-yellow-700', resolved: 'bg-emerald-100 text-emerald-700' };

export default function IssueDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState('');
  const [maintThreads, setMaintThreads] = useState([]);
  const [openMaintId, setOpenMaintId] = useState(null);
  const [lightbox, setLightbox] = useState(null); // url of enlarged image
  const isAdmin = user?.role === 'admin';

  const fetchIssue = async () => {
    try {
      const res = await api.get(`/issues/${id}`);
      setIssue(res.data);
      setNotes(res.data.internalNotes || '');
    } catch {
      toast.error(t('issues.notFound'));
      navigate(isAdmin ? '/admin/issues' : '/tenant/issues');
    } finally {
      setLoading(false);
    }
  };

  // Fetch maintenance threads for this issue (admin only)
  const fetchMaintThreads = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get(`/messages/maintenance/threads?issueId=${id}`);
      setMaintThreads(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIssue();
    fetchMaintThreads();
    const socket = getSocket();
    if (socket) {
      socket.on('issue_updated', (updated) => { if (updated._id === id) setIssue(updated); });
      return () => socket.off('issue_updated');
    }
  }, [id]);

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      const res = await api.put(`/issues/${id}`, { status, internalNotes: notes });
      setIssue(res.data);
      toast.success(`${t('issues.status')}: "${t(`status.${status}`)}"`)
    } catch (err) {
      toast.error(err.response?.data?.message || t('issues.updateFailed'));
    } finally {
      setUpdating(false);
    }
  };

  const setResponsibility = async (responsibility) => {
    setUpdating(true);
    try {
      const res = await api.put(`/issues/${id}/responsibility`, { responsibility });
      setIssue(res.data);
      toast.success(t('responsibility.setSuccess')(responsibility));
    } catch (err) {
      toast.error(err.response?.data?.message || t('responsibility.setFailed'));
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    setUpdating(true);
    try {
      const res = await api.put(`/issues/${id}`, { internalNotes: notes });
      setIssue(res.data);
      toast.success(t('issues.notesSaved'));
    } catch {
      toast.error(t('issues.notesFailed'));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  if (!issue) return null;

  return (
    <Layout>
      <div className="max-w-4xl">
        <button onClick={() => navigate(isAdmin ? '/admin/issues' : '/tenant/issues')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
          {t('common.back')}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Issue info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h1 className="text-xl font-bold text-gray-800 mb-4">{issue.title}</h1>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">{issue.description}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('issues.status')}</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyles[issue.status]}`}>
                    {t(`status.${issue.status}`)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('issues.category')}</p>
                  <p className="font-medium text-gray-700">{t(`categories.${issue.category}`)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('issues.unit')}</p>
                  <p className="font-medium text-gray-700">{issue.unit}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('issues.reported')}</p>
                  <p className="font-medium text-gray-700">{new Date(issue.createdAt).toLocaleDateString()}</p>
                </div>
                {isAdmin && (
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-gray-400 text-xs mb-1">{t('issues.tenant')}</p>
                    <p className="font-medium text-gray-700">{issue.tenantId?.name}</p>
                    <p className="text-gray-500 text-xs">{issue.tenantId?.email}{issue.tenantId?.phone ? ` · ${issue.tenantId.phone}` : ''}</p>
                  </div>
                )}
              </div>

              {issue.images?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">{t('issues.attachments')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {issue.images.map((img, i) => (
                      <button key={i} onClick={() => setLightbox(img)} className="group relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 hover:border-emerald-400 transition-colors">
                        <img src={img} alt="attachment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity">🔍</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tenant: maintenance directory */}
            {!isAdmin && issue.responsibility === 'tenant' && (
              <div className="bg-white rounded-xl border border-amber-200 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-500 text-lg">⚠️</span>
                  <h2 className="font-semibold text-gray-800">{t('responsibility.tenantBanner')}</h2>
                </div>
                <p className="text-sm text-gray-500 mb-5">{t('responsibility.tenantBannerBody')}</p>
                <MaintenanceDirectory issue={issue} />
              </div>
            )}

            {/* Admin controls */}
            {isAdmin && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                {/* Responsibility */}
                <h2 className="font-semibold text-gray-700 mb-3">{t('responsibility.label')}</h2>
                <div className="flex gap-2 mb-6">
                  {['landlord', 'tenant'].map((r) => (
                    <button key={r} onClick={() => setResponsibility(r)} disabled={updating || issue.responsibility === r}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        issue.responsibility === r
                          ? r === 'tenant' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}>
                      {r === 'tenant' ? '⚠️' : '🏠'} {t(`responsibility.${r}`)}
                    </button>
                  ))}
                  {issue.responsibility && (
                    <span className={`ml-auto self-center text-xs px-2 py-1 rounded-full font-medium ${
                      issue.responsibility === 'tenant' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {issue.responsibility === 'tenant' ? t('responsibility.tenantNotified') : t('responsibility.handledInternally')}
                    </span>
                  )}
                </div>

                {/* Status */}
                <h2 className="font-semibold text-gray-700 mb-4">{t('issues.updateStatus')}</h2>
                <div className="flex gap-2 flex-wrap mb-5">
                  {['open', 'in-progress', 'resolved'].map((s) => (
                    <button key={s} onClick={() => updateStatus(s)} disabled={updating || issue.status === s}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        issue.status === s ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}>
                      {t(`status.${s}`)}
                    </button>
                  ))}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('issues.internalNotes')}</label>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('issues.internalNotesPlaceholder')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                  <button onClick={saveNotes} disabled={updating}
                    className="mt-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                    {t('issues.saveNotes')}
                  </button>
                </div>
              </div>
            )}

            {/* Admin: maintenance conversations on this issue */}
            {isAdmin && maintThreads.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-700 mb-3">
                  {t('maintenance.conversations') || 'Samtaler med håndverkere'}
                  <span className="ml-2 text-xs text-gray-400 font-normal">({maintThreads.length})</span>
                </h2>
                <div className="space-y-3">
                  {maintThreads.map(({ maintenanceId, lastMessage, unreadCount }) => {
                    const maintId = maintenanceId;
                    const maintName = lastMessage?.senderRole === 'maintenance' ? lastMessage.senderName : (lastMessage?.senderName || 'Håndverker');
                    const isOpen = openMaintId === String(maintId);
                    return (
                      <div key={String(maintId)} className="border border-gray-100 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setOpenMaintId(isOpen ? null : String(maintId))}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm">👷</div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{maintName || 'Håndverker'}</p>
                              {lastMessage && (
                                <p className="text-xs text-gray-400 truncate max-w-xs">{lastMessage.message}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                            )}
                            <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {isOpen && maintId && (
                          <div className="border-t border-gray-100">
                            <MaintenanceChatBox
                              key={String(maintId)}
                              issueId={id}
                              maintenanceId={String(maintId)}
                              maintenanceName={maintName || 'Håndverker'}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Chat */}
          <div>
            <ChatBox issueId={id} />
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300 transition-colors"
          >✕</button>
          <img
            src={lightbox}
            alt="full size"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Layout>
  );
}

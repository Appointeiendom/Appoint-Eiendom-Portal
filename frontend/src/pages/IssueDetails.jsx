import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socketService';
import api from '../services/api';
import Layout from '../components/Layout';
import ChatBox from '../components/ChatBox';
import toast from 'react-hot-toast';

const priorityStyles = { high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };
const statusStyles = { open: 'bg-blue-100 text-blue-700', 'in-progress': 'bg-yellow-100 text-yellow-700', resolved: 'bg-emerald-100 text-emerald-700' };

export default function IssueDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState('');
  const isAdmin = user?.role === 'admin';

  const fetchIssue = async () => {
    try {
      const res = await api.get(`/issues/${id}`);
      setIssue(res.data);
      setNotes(res.data.internalNotes || '');
    } catch {
      toast.error('Issue not found');
      navigate(isAdmin ? '/admin/issues' : '/tenant/issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
    const socket = getSocket();
    if (socket) {
      socket.on('issue_updated', (updated) => {
        if (updated._id === id) setIssue(updated);
      });
      return () => socket.off('issue_updated');
    }
  }, [id]);

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      const res = await api.put(`/issues/${id}`, { status, internalNotes: notes });
      setIssue(res.data);
      toast.success(`Status updated to "${status}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    setUpdating(true);
    try {
      const res = await api.put(`/issues/${id}`, { internalNotes: notes });
      setIssue(res.data);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
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
          ← Back to Issues
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Issue Info */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h1 className="text-xl font-bold text-gray-800">{issue.title}</h1>
              </div>

              <p className="text-gray-600 text-sm mb-4 leading-relaxed">{issue.description}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Status</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyles[issue.status]}`}>
                    {issue.status.replace('-', ' ')}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Category</p>
                  <p className="font-medium text-gray-700">{issue.category}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Unit</p>
                  <p className="font-medium text-gray-700">{issue.unit}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Reported</p>
                  <p className="font-medium text-gray-700">{new Date(issue.createdAt).toLocaleDateString()}</p>
                </div>
                {isAdmin && (
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-gray-400 text-xs mb-1">Tenant</p>
                    <p className="font-medium text-gray-700">{issue.tenantId?.name}</p>
                    <p className="text-gray-500 text-xs">{issue.tenantId?.email} {issue.tenantId?.phone ? `· ${issue.tenantId.phone}` : ''}</p>
                  </div>
                )}
              </div>

              {issue.images?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Attachments</p>
                  <div className="flex gap-2 flex-wrap">
                    {issue.images.map((img, i) => (
                      <img key={i} src={img} alt="attachment" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-700 mb-4">Update Status</h2>
                <div className="flex gap-2 flex-wrap mb-5">
                  {['open', 'in-progress', 'resolved'].map((s) => (
                    <button key={s} onClick={() => updateStatus(s)} disabled={updating || issue.status === s}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                        ${issue.status === s ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                      {s.replace('-', ' ')}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes visible only to admins..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                  <button onClick={saveNotes} disabled={updating}
                    className="mt-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                    Save Notes
                  </button>
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
    </Layout>
  );
}

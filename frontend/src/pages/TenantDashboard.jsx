import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socketService';
import api from '../services/api';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import IssueCard from '../components/IssueCard';

export default function TenantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, issuesRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/issues?limit=5'),
      ]);
      setStats(statsRes.data);
      setRecentIssues(issuesRes.data.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    if (socket) {
      socket.on('issue_updated', fetchData);
      return () => socket.off('issue_updated', fetchData);
    }
  }, []);

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.name} 👋</h1>
            <p className="text-gray-500 text-sm mt-1">{user?.unit}</p>
          </div>
          <button
            onClick={() => navigate('/tenant/issues/new')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            + Report Issue
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Issues" value={stats.total} color="gray" icon="📋" />
          <StatCard label="Open" value={stats.open} color="blue" icon="🔓" />
          <StatCard label="In Progress" value={stats.inProgress} color="yellow" icon="🔧" />
          <StatCard label="Resolved" value={stats.resolved} color="emerald" icon="✅" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Recent Issues</h2>
            <button onClick={() => navigate('/tenant/issues')} className="text-sm text-emerald-600 hover:underline">
              View all
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-24" />
              ))}
            </div>
          ) : recentIssues.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-400 mb-3">No issues reported yet</p>
              <button onClick={() => navigate('/tenant/issues/new')}
                className="text-emerald-600 text-sm font-medium hover:underline">
                Report your first issue →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentIssues.map((issue) => (
                <IssueCard key={issue._id} issue={issue} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

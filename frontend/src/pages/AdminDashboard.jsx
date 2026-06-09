import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socketService';
import api from '../services/api';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import IssueCard from '../components/IssueCard';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, thisMonth: 0 });
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, issuesRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/issues'),
      ]);
      setStats(statsRes.data);
      setRecentIssues(issuesRes.data.slice(0, 6));
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
      socket.on('new_issue', (issue) => {
        toast('New issue reported!', { icon: '🔔' });
        fetchData();
      });
      return () => socket.off('new_issue');
    }
  }, []);

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">{stats.thisMonth} issues reported this month</p>
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
            <button onClick={() => navigate('/admin/issues')} className="text-sm text-emerald-600 hover:underline">
              View all
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-24" />)}
            </div>
          ) : recentIssues.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-400">No issues yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentIssues.map((issue) => <IssueCard key={issue._id} issue={issue} />)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

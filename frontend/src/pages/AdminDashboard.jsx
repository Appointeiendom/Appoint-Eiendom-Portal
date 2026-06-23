import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socketService';
import api from '../services/api';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import IssueCard from '../components/IssueCard';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, thisMonth: 0 });
  const [recentIssues, setRecentIssues] = useState([]);
  const [expiringLeases, setExpiringLeases] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, issuesRes, tenantsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/issues'),
        api.get('/users'),
      ]);
      setStats(statsRes.data);
      setRecentIssues(issuesRes.data.slice(0, 6));
      // Find leases expiring within 60 days
      const soon = new Date(); soon.setDate(soon.getDate() + 60);
      setExpiringLeases(tenantsRes.data.filter(t => t.leaseEnd && new Date(t.leaseEnd) <= soon && new Date(t.leaseEnd) >= new Date()));
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
      socket.on('new_issue', () => {
        toast(t('dashboard.newIssue') || 'New issue reported!', { icon: '🔔' });
        fetchData();
      });
      return () => socket.off('new_issue');
    }
  }, []);

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('dashboard.welcome')(user?.name || 'Admin')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('analytics.thisMonth')(stats.thisMonth)}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label={t('dashboard.totalIssues')} value={stats.total} color="gray" icon="📋" />
          <StatCard label={t('dashboard.open')} value={stats.open} color="blue" icon="🔓" />
          <StatCard label={t('dashboard.inProgress')} value={stats.inProgress} color="yellow" icon="🔧" />
          <StatCard label={t('dashboard.resolved')} value={stats.resolved} color="emerald" icon="✅" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">{t('dashboard.recentIssues')}</h2>
            <button onClick={() => navigate('/admin/issues')} className="text-sm text-emerald-600 hover:underline">
              {t('common.viewAll')}
            </button>
          </div>

        {expiringLeases.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-amber-800 text-sm mb-2">⚠️ Leases expiring within 60 days</h3>
            <div className="space-y-1">
              {expiringLeases.map(t => (
                <div key={t._id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-700">{t.name} — {t.unit}</span>
                  <span className="text-amber-600 font-medium">{new Date(t.leaseEnd).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-24" />)}
            </div>
          ) : recentIssues.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-400">{t('dashboard.noIssues')}</p>
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

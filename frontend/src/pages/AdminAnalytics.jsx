import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const STATUS_COLORS = { open: '#3B82F6', 'in-progress': '#F59E0B', resolved: '#10B981' };
const CATEGORY_COLORS = ['#8B5CF6', '#06B6D4', '#F59E0B', '#10B981', '#EF4444'];

export default function AdminAnalytics() {
  const [byStatus, setByStatus] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/issues-by-status'),
      api.get('/dashboard/issues-by-category'),
    ]).then(([s, st, c]) => {
      setStats(s.data);
      setByStatus(st.data.map((d) => ({ name: d._id.replace('-', ' '), value: d.count })));
      setByCategory(c.data.map((d) => ({ name: d._id, count: d.count })));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-500 text-sm">{stats.thisMonth} issues this month · {stats.total} total</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
            <h2 className="font-semibold text-gray-700 mb-4">Issues by Status</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {byStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* By Category */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
            <h2 className="font-semibold text-gray-700 mb-4">Issues by Category</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
}

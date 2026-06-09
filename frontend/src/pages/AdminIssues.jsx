import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import IssueCard from '../components/IssueCard';

export default function AdminIssues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '', search: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setLoading(true);
    api.get(`/issues?${params}`)
      .then((res) => setIssues(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  const update = (field) => (e) => setFilters({ ...filters, [field]: e.target.value });

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">All Issues</h1>
          <p className="text-gray-500 text-sm mt-1">{issues.length} issue(s) found</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
          <div className="flex flex-wrap gap-3">
            <input type="text" placeholder="Search title or description..." value={filters.search} onChange={update('search')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 flex-1 min-w-40" />
            <select value={filters.status} onChange={update('status')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <select value={filters.priority} onChange={update('priority')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={filters.category} onChange={update('category')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
              <option value="">All Categories</option>
              {['Electrical', 'Plumbing', 'HVAC', 'General', 'Appliances'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-24" />)}
          </div>
        ) : issues.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">No issues match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {issues.map((issue) => <IssueCard key={issue._id} issue={issue} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}

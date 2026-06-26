import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';
import IssueCard from '../components/IssueCard';
import { useLanguage } from '../context/LanguageContext';

export default function MyIssues() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);

    api.get(`/issues?${params}`)
      .then((res) => setIssues(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-800">{t('myIssues.title')}</h1>
          <button onClick={() => navigate('/tenant/issues/new')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            {t('myIssues.reportBtn')}
          </button>
        </div>

        <div className="flex gap-3 mb-5 flex-wrap">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
            <option value="">{t('myIssues.allStatus')}</option>
            <option value="open">{t('status.open')}</option>
            <option value="in-progress">{t('status.in-progress')}</option>
            <option value="resolved">{t('status.resolved')}</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-24" />)}
          </div>
        ) : issues.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">{t('myIssues.noIssues')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => <IssueCard key={issue._id} issue={issue} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}

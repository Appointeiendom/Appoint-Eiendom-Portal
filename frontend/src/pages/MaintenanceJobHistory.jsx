import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Layout from '../components/Layout';
import api from '../services/api';

export default function MaintenanceJobHistory() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;
    api.get(`/maintenance/${user._id}/jobs`)
      .then(r => setJobs(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <Layout>
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-gray-800 mb-5">📋 Job History</h1>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
            No job history yet.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job._id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-800">{job.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{job.tenantId?.name} · {job.unit}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{job.category} · {new Date(job.updatedAt).toLocaleDateString()}</p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${job.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : job.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                  {t(`status.${job.status}`)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

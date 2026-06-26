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
        <h1 className="text-xl font-bold text-gray-800 mb-5">📋 {t('maintenance.jobHistory')}</h1>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
            {t('maintenance.noJobs')}
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job._id} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{job.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{job.tenantId?.name} · {job.unit}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{job.category} · {new Date(job.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${job.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : job.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                    {t(`status.${job.status}`)}
                  </span>
                </div>
                {job.rating ? (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 text-sm">
                        {'★'.repeat(job.rating)}{'☆'.repeat(5 - job.rating)}
                      </span>
                      <span className="text-xs text-gray-500">{job.rating}/5</span>
                    </div>
                    {job.ratingComment && (
                      <p className="text-xs text-gray-500 italic mt-1">"{job.ratingComment}"</p>
                    )}
                  </div>
                ) : job.status === 'resolved' ? (
                  <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">{t('rating.noRatings')}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

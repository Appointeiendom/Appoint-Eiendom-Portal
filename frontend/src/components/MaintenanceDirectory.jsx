import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import MaintenanceChatBox from './MaintenanceChatBox';


export default function MaintenanceDirectory({ issue, onAssign, assignedTo }) {
  const { t } = useLanguage();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [openChat, setOpenChat] = useState(null);

  useEffect(() => {
    if (!issue?.category) return;
    api.get(`/maintenance/by-trade/${issue.category}`)
      .then(res => setWorkers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [issue?.category]);

  if (loading) return <div className="text-center py-6 text-gray-400 text-sm">{t('common.loading')}</div>;

  if (workers.length === 0) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
      <p className="text-amber-700 font-medium">{t('maintenance.noDirectory')}</p>
      <p className="text-amber-600 text-sm mt-1">{t('maintenance.noDirectoryBody')}</p>
    </div>
  );

  const toggle = (id) => {
    setExpanded(prev => prev === id ? null : id);
    setOpenChat(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-3">{t('maintenance.directoryBody')(issue.category)}</p>
      {workers.map(worker => {
        const isOpen = expanded === worker._id;
        return (
          <div key={worker._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Collapsed row — always visible */}
            <button
              onClick={() => toggle(worker._id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              {worker.photo
                ? <img src={worker.photo} alt={worker.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
                : <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">👷</div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm">{worker.name}</p>
                <p className="text-xs text-gray-400">{t(`categories.${worker.trade}`)}
                  {worker.phone ? ` · ${worker.phone}` : ''}
                </p>
              </div>
              <span className="text-gray-400 text-xs ml-2">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Expanded details */}
            {isOpen && (
              <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {worker.bio && <p className="text-sm text-gray-600">{worker.bio}</p>}
                    {worker.phone && (
                      <p className="text-sm text-gray-600 mt-1">
                        📞 <a href={`tel:${worker.phone}`} className="hover:underline text-blue-600">{worker.phone}</a>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {onAssign && (
                      assignedTo === worker._id
                        ? <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-medium text-center">✓ {t('issues.chooseCompany')}</span>
                        : <button onClick={() => onAssign(worker._id)}
                            className="text-sm bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors">
                            {t('issues.selectCompany')}
                          </button>
                    )}
                    <button
                      onClick={() => setOpenChat(openChat === worker._id ? null : worker._id)}
                      className="shrink-0 text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {openChat === worker._id ? t('chat.closeChat') : t('chat.contact')}
                    </button>
                  </div>
                </div>

                {openChat === worker._id && (
                  <div className="border-t border-gray-100 pt-3">
                    <MaintenanceChatBox issueId={issue._id} maintenanceId={worker._id} maintenanceName={worker.name} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

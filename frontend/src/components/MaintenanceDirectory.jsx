import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import MaintenanceChatBox from './MaintenanceChatBox';

function AvailabilityCalendar({ availability }) {
  const { t } = useLanguage();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const available = new Set(availability || []);
  const months = t('months');
  const days = t('days');

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
        {months[month]} {year} — {t('maintenance.availability')}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {days.map(d => <div key={d} className="text-[10px] text-gray-400 pb-1">{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isAvailable = available.has(dateStr);
          const isPast = new Date(dateStr) < today;
          return (
            <div key={day} className={`text-[11px] rounded py-0.5 ${isPast ? 'text-gray-300' : isAvailable ? 'bg-emerald-100 text-emerald-700 font-semibold' : 'text-gray-500'}`}>
              {day}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-100" /><span className="text-[10px] text-gray-500">{t('maintenance.available')}</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-100" /><span className="text-[10px] text-gray-500">{t('maintenance.notMarked')}</span></div>
      </div>
    </div>
  );
}

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

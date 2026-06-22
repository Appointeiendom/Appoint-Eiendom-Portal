import { useState, useEffect } from 'react';
import api from '../services/api';
import MaintenanceChatBox from './MaintenanceChatBox';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function AvailabilityCalendar({ availability }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const available = new Set(availability || []);

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
        {MONTHS[month]} {year} — Availability
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-[10px] text-gray-400 pb-1">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isAvailable = available.has(dateStr);
          const isPast = new Date(dateStr) < today;
          return (
            <div key={day} className={`text-[11px] rounded py-0.5 ${
              isPast ? 'text-gray-300' :
              isAvailable ? 'bg-emerald-100 text-emerald-700 font-semibold' :
              'text-gray-500'
            }`}>
              {day}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-100" /><span className="text-[10px] text-gray-500">Available</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-100" /><span className="text-[10px] text-gray-500">Not marked</span></div>
      </div>
    </div>
  );
}

export default function MaintenanceDirectory({ issue }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openChat, setOpenChat] = useState(null); // maintenanceId

  useEffect(() => {
    if (!issue?.category) return;
    api.get(`/maintenance/by-trade/${issue.category}`)
      .then(res => setWorkers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [issue?.category]);

  if (loading) return <div className="text-center py-6 text-gray-400 text-sm">Loading maintenance professionals...</div>;

  if (workers.length === 0) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
      <p className="text-amber-700 font-medium">No maintenance professionals listed yet</p>
      <p className="text-amber-600 text-sm mt-1">Please contact your landlord directly for assistance.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        The following <strong>{issue.category}</strong> professionals are available. You can contact any of them, compare quotes, and arrange the work directly.
      </p>

      {workers.map(worker => (
        <div key={worker._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-5">
            <div className="flex gap-4">
              {/* Photo */}
              <div className="shrink-0">
                {worker.photo ? (
                  <img src={worker.photo} alt={worker.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl">👷</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{worker.name}</h3>
                    <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-0.5">{worker.trade}</span>
                  </div>
                  <button
                    onClick={() => setOpenChat(openChat === worker._id ? null : worker._id)}
                    className="shrink-0 text-sm bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    {openChat === worker._id ? 'Close Chat' : '💬 Contact'}
                  </button>
                </div>

                {worker.bio && <p className="text-sm text-gray-500 mt-2">{worker.bio}</p>}

                {worker.phone && (
                  <p className="text-sm text-gray-600 mt-1">
                    📞 <a href={`tel:${worker.phone}`} className="hover:underline text-blue-600">{worker.phone}</a>
                  </p>
                )}
              </div>
            </div>

            {/* Availability calendar */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <AvailabilityCalendar availability={worker.availability} />
            </div>
          </div>

          {/* Chat */}
          {openChat === worker._id && (
            <div className="border-t border-gray-200">
              <MaintenanceChatBox
                issueId={issue._id}
                maintenanceId={worker._id}
                maintenanceName={worker.name}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

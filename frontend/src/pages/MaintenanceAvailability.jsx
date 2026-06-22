import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function MaintenanceAvailability() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [availability, setAvailability] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    if (!user?._id) return;
    api.get(`/maintenance/${user._id}`)
      .then(r => setAvailability(new Set(r.data.availability || [])))
      .catch(console.error);
  }, [user]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const months = t('months');
  const days = t('days');

  const toggleDay = (dateStr) => {
    const d = new Date(dateStr);
    if (d < today) return;
    setAvailability(prev => {
      const next = new Set(prev);
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/maintenance/${user._id}/availability`, { availability: [...availability] });
      toast.success(t('maintenance.saveSuccess'));
    } catch {
      toast.error(t('maintenance.saveFailed2'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('maintenance.myAvailability')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('maintenance.availabilityHint')}</p>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">‹</button>
            <h2 className="font-semibold text-gray-800">{months[month]} {year}</h2>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {days.map(d => <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isPast = new Date(dateStr) < today;
              const isAvailable = availability.has(dateStr);
              return (
                <button key={day} onClick={() => toggleDay(dateStr)} disabled={isPast}
                  className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                    isPast ? 'text-gray-300 cursor-not-allowed'
                    : isAvailable ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'text-gray-700 hover:bg-gray-100 border border-gray-100'
                  }`}>
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-4 h-4 rounded bg-emerald-500" /> {t('maintenance.available')}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-4 h-4 rounded border border-gray-200" /> {t('maintenance.notMarked')}</div>
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="mt-4 w-full bg-emerald-500 text-white py-3 rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-60 transition-colors">
          {saving ? t('common.saving') : t('maintenance.saveAvailability')}
        </button>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function MaintenanceAvailability() {
  const { user } = useAuth();
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

  const toggleDay = (dateStr) => {
    const d = new Date(dateStr);
    if (d < today) return; // can't toggle past dates
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
      toast.success('Availability saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <Layout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">My Availability</h1>
        <p className="text-sm text-gray-500 mb-6">Tap a date to mark yourself as available. Tap again to remove it.</p>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">‹</button>
            <h2 className="font-semibold text-gray-800">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">›</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isPast = new Date(dateStr) < today;
              const isAvailable = availability.has(dateStr);

              return (
                <button
                  key={day}
                  onClick={() => toggleDay(dateStr)}
                  disabled={isPast}
                  className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                    isPast
                      ? 'text-gray-300 cursor-not-allowed'
                      : isAvailable
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'text-gray-700 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-4 h-4 rounded bg-emerald-500" /> Available
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-4 h-4 rounded border border-gray-200" /> Not marked
            </div>
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="mt-4 w-full bg-emerald-500 text-white py-3 rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-60 transition-colors">
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
      </div>
    </Layout>
  );
}

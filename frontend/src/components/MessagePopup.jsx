import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socketService';

const DISMISS_MS = 5000;

export default function MessagePopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [popup, setPopup] = useState(null); // { issueId, senderName, message, path }
  const timerRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const onMessage = (msg) => {
      // Only show popup if sender is not ourselves
      const senderId = msg.senderId?._id || msg.senderId;
      if (String(senderId) === String(user._id)) return;

      // Don't show if we're already on this issue's page
      const issuePath = `/${user.role}/issues/${msg.issueId}`;
      if (location.pathname === issuePath) return;

      // Skip maintenance thread messages for non-relevant users
      if (msg.maintenanceId && user.role === 'admin') return;

      const path = user.role === 'admin'
        ? `/admin/issues/${msg.issueId}`
        : user.role === 'maintenance'
          ? `/maintenance/issues/${msg.issueId}`
          : `/tenant/issues/${msg.issueId}`;

      const preview = msg.messageType === 'quote'
        ? `💰 ${msg.quoteAmount?.toLocaleString()} kr`
        : msg.message.length > 60 ? msg.message.slice(0, 60) + '…' : msg.message;

      setPopup({ issueId: msg.issueId, senderName: msg.senderName, message: preview, path });

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPopup(null), DISMISS_MS);
    };

    socket.on('new_message', onMessage);
    return () => socket.off('new_message', onMessage);
  }, [user, location.pathname]);

  // Also dismiss when navigating to the issue
  useEffect(() => {
    if (popup && location.pathname === popup.path) {
      clearTimeout(timerRef.current);
      setPopup(null);
    }
  }, [location.pathname]);

  if (!popup) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-72 animate-slide-up"
      style={{ animation: 'slideUp 0.3s ease-out' }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        onClick={() => { navigate(popup.path); setPopup(null); clearTimeout(timerRef.current); }}
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-xl transition-shadow"
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">{popup.senderName?.[0]?.toUpperCase()}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800 truncate">{popup.senderName}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setPopup(null); clearTimeout(timerRef.current); }}
                className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-0.5 truncate">{popup.message}</p>

            {/* Progress bar */}
            <div className="mt-2 h-0.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ animation: `shrink ${DISMISS_MS}ms linear forwards` }}
              />
            </div>
            <style>{`
              @keyframes shrink {
                from { width: 100%; }
                to   { width: 0%; }
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
}

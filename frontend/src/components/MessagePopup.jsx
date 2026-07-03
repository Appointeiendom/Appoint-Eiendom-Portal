import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket, onSocketConnect } from '../services/socketService';

const DISMISS_MS = 6000;

export default function MessagePopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [popup, setPopup] = useState(null);
  const timerRef = useRef(null);
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;

    const onNotification = (msg) => {
      const senderId = String(msg.senderId?._id || msg.senderId);
      if (senderId === String(user._id)) return;

      const path = user.role === 'admin'
        ? `/admin/issues/${msg.issueId}`
        : `/tenant/issues/${msg.issueId}`;

      if (locationRef.current === path) return;

      const preview = msg.messageType === 'quote'
        ? `💰 ${msg.quoteAmount?.toLocaleString()} kr`
        : msg.message?.length > 60 ? msg.message.slice(0, 60) + '…' : msg.message;

      setPopup({ senderName: msg.senderRole === 'admin' ? 'Admin' : msg.senderName, message: preview, path });
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPopup(null), DISMISS_MS);
    };

    const cleanup = onSocketConnect((sock) => {
      sock.off('new_message_notification', onNotification);
      sock.on('new_message_notification', onNotification);
    });

    return () => {
      cleanup();
      getSocket()?.off('new_message_notification', onNotification);
    };
  }, [user]);

  // Dismiss when navigating to the issue
  useEffect(() => {
    if (popup && location.pathname === popup.path) {
      clearTimeout(timerRef.current);
      setPopup(null);
    }
  }, [location.pathname]);

  if (!popup) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      <div
        style={{ animation: 'slideUp 0.25s ease-out' }}
        onClick={() => { navigate(popup.path); setPopup(null); clearTimeout(timerRef.current); }}
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-xl transition-shadow"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">{popup.senderName?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800 truncate">{popup.senderName}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setPopup(null); clearTimeout(timerRef.current); }}
                className="text-gray-400 hover:text-gray-600 shrink-0 text-base leading-none"
              >✕</button>
            </div>
            <p className="text-sm text-gray-600 mt-0.5 truncate">{popup.message}</p>
            <div className="mt-2 h-0.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ animation: `shrink ${DISMISS_MS}ms linear forwards` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { getSocket, onSocketConnect } from '../services/socketService';

const UnreadContext = createContext({
  unreadCount: 0, markAllRead: () => {}, refresh: () => {},
  maintenanceUnread: 0, clearMaintenanceUnread: () => {},
  directUnread: 0, clearDirectUnread: () => {},
  setViewingDirect: () => {},
});

export function UnreadProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [maintenanceUnread, setMaintenanceUnread] = useState(0);
  const [directUnread, setDirectUnread] = useState(0);
  const viewingDirect = useRef(false);

  const storageKey = user?._id ? `read_announcements_${user._id}` : null;
  const maintStorageKey = user?._id ? `maintenance_unread_${user._id}` : null;

  const getReadIds = useCallback(() => {
    if (!storageKey) return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch { return new Set(); }
  }, [storageKey]);

  const refresh = useCallback(async () => {
    if (user?.role !== 'tenant' || !storageKey) { setUnreadCount(0); return; }
    try {
      const res = await api.get('/announcements');
      const readIds = getReadIds();
      setUnreadCount(res.data.filter(a => !readIds.has(a._id)).length);
    } catch { setUnreadCount(0); }
  }, [user?.role, storageKey, getReadIds]);

  useEffect(() => { refresh(); }, [refresh]);

  // Maintenance: restore persisted count and listen for new messages
  useEffect(() => {
    if (user?.role !== 'maintenance' || !maintStorageKey) return;
    const stored = parseInt(localStorage.getItem(maintStorageKey) || '0', 10);
    setMaintenanceUnread(stored);

    const onMsg = () => {
      setMaintenanceUnread(prev => {
        const next = prev + 1;
        localStorage.setItem(maintStorageKey, String(next));
        return next;
      });
    };

    const cleanup = onSocketConnect((sock) => {
      sock.off('new_message_notification', onMsg);
      sock.on('new_message_notification', onMsg);
    });

    return () => {
      cleanup();
      getSocket()?.off('new_message_notification', onMsg);
    };
  }, [user?.role, maintStorageKey]);

  // Direct message unread — fetch initial count, then listen via socket
  useEffect(() => {
    if (!user?._id) return;
    api.get('/direct/unread').then(r => setDirectUnread(r.data.count || 0)).catch(() => {});

    const onDirect = (msg) => {
      if (String(msg.senderId) !== String(user._id) && !viewingDirect.current) {
        setDirectUnread(prev => prev + 1);
      }
    };

    const cleanup = onSocketConnect((sock) => {
      sock.off('direct_message', onDirect);
      sock.on('direct_message', onDirect);
    });

    return () => {
      cleanup();
      getSocket()?.off('direct_message', onDirect);
    };
  }, [user?._id]);

  const clearDirectUnread = useCallback(() => setDirectUnread(0), []);

  const setViewingDirect = useCallback((val) => {
    viewingDirect.current = val;
    if (val) setDirectUnread(0);
  }, []);

  const markAllRead = useCallback((announcements) => {
    if (!storageKey) return;
    const ids = announcements.map(a => a._id);
    localStorage.setItem(storageKey, JSON.stringify(ids));
    setUnreadCount(0);
  }, [storageKey]);

  const clearMaintenanceUnread = useCallback(() => {
    if (!maintStorageKey) return;
    localStorage.setItem(maintStorageKey, '0');
    setMaintenanceUnread(0);
  }, [maintStorageKey]);

  return (
    <UnreadContext.Provider value={{
      unreadCount, markAllRead, refresh,
      maintenanceUnread, clearMaintenanceUnread,
      directUnread, clearDirectUnread, setViewingDirect,
    }}>
      {children}
    </UnreadContext.Provider>
  );
}

export const useUnread = () => useContext(UnreadContext);

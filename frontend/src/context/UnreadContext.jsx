import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { getSocket } from '../services/socketService';

const UnreadContext = createContext({ unreadCount: 0, markAllRead: () => {}, maintenanceUnread: 0, clearMaintenanceUnread: () => {}, directUnread: 0, clearDirectUnread: () => {} });

export function UnreadProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [maintenanceUnread, setMaintenanceUnread] = useState(0);
  const [directUnread, setDirectUnread] = useState(0);

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

    const interval = setInterval(() => {
      const socket = getSocket();
      if (!socket) return;
      const onMsg = () => {
        setMaintenanceUnread(prev => {
          const next = prev + 1;
          localStorage.setItem(maintStorageKey, String(next));
          return next;
        });
      };
      socket.on('new_message_notification', onMsg);
      clearInterval(interval);
      return () => socket.off('new_message_notification', onMsg);
    }, 500);

    return () => clearInterval(interval);
  }, [user?.role, maintStorageKey]);

  // Direct message unread count (tenant, maintenance, admin)
  useEffect(() => {
    if (!user) return;
    api.get('/direct/unread').then(r => setDirectUnread(r.data.count || 0)).catch(() => {});
    const socket = getSocket();
    if (!socket) return;
    const onDirect = (msg) => {
      if (String(msg.senderId) !== String(user._id)) {
        setDirectUnread(prev => prev + 1);
      }
    };
    socket.on('direct_message', onDirect);
    return () => socket.off('direct_message', onDirect);
  }, [user?._id]);

  const clearDirectUnread = useCallback(() => setDirectUnread(0), []);

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
    <UnreadContext.Provider value={{ unreadCount, markAllRead, refresh, maintenanceUnread, clearMaintenanceUnread, directUnread, clearDirectUnread }}>
      {children}
    </UnreadContext.Provider>
  );
}

export const useUnread = () => useContext(UnreadContext);

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const UnreadContext = createContext({ unreadCount: 0, markAllRead: () => {} });

export function UnreadProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const storageKey = user?._id ? `read_announcements_${user._id}` : null;

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

  const markAllRead = useCallback((announcements) => {
    if (!storageKey) return;
    const ids = announcements.map(a => a._id);
    localStorage.setItem(storageKey, JSON.stringify(ids));
    setUnreadCount(0);
  }, [storageKey]);

  return (
    <UnreadContext.Provider value={{ unreadCount, markAllRead, refresh }}>
      {children}
    </UnreadContext.Provider>
  );
}

export const useUnread = () => useContext(UnreadContext);

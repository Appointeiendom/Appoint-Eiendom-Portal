import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUnread } from '../context/UnreadContext';
import { getSocket, onSocketConnect } from '../services/socketService';
import api from '../services/api';
import Layout from '../components/Layout';

function Avatar({ user, size = 10 }) {
  const cls = `w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`;
  return user?.photo
    ? <img src={user.photo} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} alt={user.name} />
    : <div className={`${cls} bg-emerald-500`}>{user?.name?.[0]?.toUpperCase() || '?'}</div>;
}

function ThreadList({ threads, activeId, onSelect, unreadMap, t }) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <span className="text-4xl mb-3">💬</span>
        <p className="text-gray-500 font-medium text-sm">{t('chat.noConversations')}</p>
        <p className="text-xs text-gray-400 mt-1">{t('chat.noConversationsSub')}</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-gray-100">
      {threads.map(th => {
        const unread = unreadMap[String(th._id)] ?? 0;
        const isActive = String(th._id) === String(activeId);
        return (
          <button key={th._id} onClick={() => onSelect(th)}
            className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-3 ${isActive ? 'bg-emerald-50' : ''}`}>
            <Avatar user={th.user} size={10} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-semibold truncate ${isActive ? 'text-emerald-700' : 'text-gray-800'}`}>{th.user?.name}</p>
                {unread > 0 && (
                  <span className="shrink-0 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{unread}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                <span className={`capitalize mr-1 font-medium ${th.user?.role === 'maintenance' ? 'text-blue-500' : 'text-emerald-500'}`}>{th.user?.role}</span>
                {th.lastMessage?.message || ''}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ChatPanel({ thread, onNewMessage, onBack, t, lang }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [displayed, setDisplayed] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  // Cache: key = `${messageId}_${lang}` → translated text
  const translationCache = useRef(new Map());

  useEffect(() => {
    if (!thread) return;
    setLoading(true);
    setMessages([]);
    translationCache.current.clear();
    api.get(`/direct/${thread._id}`).then(r => setMessages(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [thread?._id]);

  // Translate only uncached messages when lang or messages change
  useEffect(() => {
    if (messages.length === 0) { setDisplayed([]); return; }
    const cache = translationCache.current;
    const needsTranslation = messages.filter(m => !cache.has(`${m._id}_${lang}`));
    if (needsTranslation.length === 0) {
      setDisplayed(messages.map(m => ({ ...m, _text: cache.get(`${m._id}_${lang}`) || m.message })));
      return;
    }
    setTranslating(true);
    api.post('/translate', { texts: needsTranslation.map(m => m.message), target: lang })
      .then(res => {
        needsTranslation.forEach((m, i) => {
          cache.set(`${m._id}_${lang}`, res.data.translations[i] || m.message);
        });
        setDisplayed(messages.map(m => ({ ...m, _text: cache.get(`${m._id}_${lang}`) || m.message })));
      })
      .catch(() => setDisplayed(messages.map(m => ({ ...m, _text: cache.get(`${m._id}_${lang}`) || m.message }))))
      .finally(() => setTranslating(false));
  }, [messages, lang]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [displayed]);

  const handleInput = (e) => {
    setInput(e.target.value);
    const socket = getSocket();
    if (!socket) return;
    socket.emit('direct_typing_start', { threadUserId: thread._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('direct_typing_stop', { threadUserId: thread._id }), 1500);
  };

  const send = (e) => {
    e.preventDefault();
    if (!input.trim() || !thread) return;
    const socket = getSocket();
    const optimistic = { _id: `temp-${Date.now()}`, senderId: user._id, senderRole: 'admin', senderName: user.name, message: input.trim(), _text: input.trim(), threadUserId: thread._id, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, { ...optimistic }]);
    onNewMessage({ ...optimistic });
    if (socket) {
      socket.emit('send_direct_message', { message: input.trim(), toUserId: String(thread._id) });
      socket.emit('direct_typing_stop', { threadUserId: thread._id });
    }
    setInput('');
  };

  useEffect(() => {
    if (!thread) return;
    const onMsg = (msg) => {
      if (String(msg.threadUserId) !== String(thread._id)) return;
      setMessages(prev => {
        const without = prev.filter(m => !(String(m._id).startsWith('temp-') && m.message === msg.message && String(m.senderId) === String(msg.senderId)));
        if (without.some(m => String(m._id) === String(msg._id))) return without;
        return [...without, msg];
      });
      onNewMessage(msg);
    };
    const onTyping = (d) => { if (String(d.threadUserId) === String(thread._id) && String(d.userId) !== String(user._id)) setTyping(true); };
    const onStop = (d) => { if (String(d.threadUserId) === String(thread._id)) setTyping(false); };

    const cleanupSocket = onSocketConnect((sock) => {
      sock.off('direct_message', onMsg);
      sock.off('direct_typing', onTyping);
      sock.off('direct_stop_typing', onStop);
      sock.on('direct_message', onMsg);
      sock.on('direct_typing', onTyping);
      sock.on('direct_stop_typing', onStop);
    });

    return () => {
      cleanupSocket();
      const socket = getSocket();
      if (socket) {
        socket.off('direct_message', onMsg);
        socket.off('direct_typing', onTyping);
        socket.off('direct_stop_typing', onStop);
      }
    };
  }, [thread?._id]);

  if (!thread) return (
    <div className="hidden md:flex flex-col items-center justify-center h-full text-center">
      <span className="text-5xl mb-3">💬</span>
      <p className="text-gray-500 font-medium">{t('chat.selectConversation')}</p>
      <p className="text-sm text-gray-400 mt-1">{t('chat.selectConversationSub')}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-3 bg-gray-50">
        {onBack && (
          <button onClick={onBack} className="text-gray-500 hover:text-gray-800 mr-1 text-lg leading-none p-1">‹</button>
        )}
        <Avatar user={thread.user} size={9} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{thread.user?.name}</p>
          <p className="text-xs text-gray-400 capitalize">{thread.user?.role}{thread.user?.unit ? ` · ${thread.user.unit}` : ''}</p>
        </div>
        {translating && <span className="text-xs text-gray-400 animate-pulse">Translating…</span>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-center text-gray-400 text-sm py-8">{t('common.loading')}</p>}
        {!loading && displayed.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">{t('chat.noMessagesYet')}</p>
        )}
        {displayed.map(msg => {
          const isOwn = String(msg.senderId?._id || msg.senderId) === String(user._id);
          return (
            <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && <span className="text-xs text-gray-500 mb-1 px-1">{msg.senderName}</span>}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isOwn ? 'bg-emerald-500 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                  {msg._text || msg.message}
                </div>
                <span className="text-xs text-gray-400 mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 text-xs px-4 py-2.5 rounded-2xl rounded-tl-sm italic">
              {t('chat.isTyping')(thread.user?.name)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="border-t border-gray-100 p-3 flex gap-2 bg-white">
        <input type="text" value={input} onChange={handleInput} placeholder={`${t('chat.placeholder').replace('...', '')} ${thread.user?.name}…`}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        <button type="submit" disabled={!input.trim()}
          className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
          {t('common.send')}
        </button>
      </form>
    </div>
  );
}

export default function AdminDirectChats() {
  const { t, lang } = useLanguage();
  const { setViewingDirect } = useUnread();
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [unreadMap, setUnreadMap] = useState({});
  const [loading, setLoading] = useState(true);
  // Mobile: show list (false) or chat (true)
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    api.get('/direct').then(r => {
      setThreads(r.data);
      const map = {};
      r.data.forEach(th => { map[String(th._id)] = th.unreadCount || 0; });
      setUnreadMap(map);
    }).catch(console.error).finally(() => setLoading(false));

    setViewingDirect(true);
    const socket = getSocket();
    if (socket) socket.emit('join_direct');
    return () => setViewingDirect(false);
  }, []);

  const handleSelect = (th) => {
    setActiveThread(th);
    setShowChat(true);
    setUnreadMap(prev => ({ ...prev, [String(th._id)]: 0 }));
  };

  const handleNewMessage = (msg) => {
    const tid = String(msg.threadUserId);
    setThreads(prev => {
      const existing = prev.find(t => String(t._id) === tid);
      if (existing) return [{ ...existing, lastMessage: msg }, ...prev.filter(t => String(t._id) !== tid)];
      return prev;
    });
    if (msg.senderRole !== 'admin' && String(msg.threadUserId) !== String(activeThread?._id)) {
      setUnreadMap(prev => ({ ...prev, [tid]: (prev[tid] || 0) + 1 }));
    }
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onMsg = (msg) => { if (msg.senderRole !== 'admin') handleNewMessage(msg); };
    socket.on('direct_message', onMsg);
    return () => socket.off('direct_message', onMsg);
  }, [activeThread?._id]);

  const totalUnread = Object.values(unreadMap).reduce((s, v) => s + v, 0);

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-auto md:max-w-5xl">
        {/* Page header — hidden on mobile when chat is open */}
        {(!showChat) && (
          <div className="mb-3 px-1 flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">💬 {t('chat.messagesTitle')}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{t('chat.messagesSubtitle')}</p>
            </div>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">{t('chat.unread')(totalUnread)}</span>
            )}
          </div>
        )}

        {/* Desktop: side-by-side. Mobile: one panel at a time */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-1 md:h-[74vh]">

          {/* Thread list — full width on mobile list view, fixed width on desktop */}
          <div className={`${showChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 md:shrink-0 border-r border-gray-100`}>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('chat.conversations')}</p>
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{totalUnread}</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading
                ? <p className="text-center text-gray-400 text-sm py-8">{t('common.loading')}</p>
                : <ThreadList threads={threads} activeId={activeThread?._id} onSelect={handleSelect} unreadMap={unreadMap} t={t} />
              }
            </div>
          </div>

          {/* Chat panel — hidden on mobile list view, full width on mobile chat view */}
          <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0`}>
            <ChatPanel
              thread={activeThread}
              onNewMessage={handleNewMessage}
              onBack={showChat ? () => setShowChat(false) : null}
              t={t}
              lang={lang}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

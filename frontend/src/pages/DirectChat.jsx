import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUnread } from '../context/UnreadContext';
import { getSocket, onSocketConnect } from '../services/socketService';
import api from '../services/api';
import Layout from '../components/Layout';

export default function DirectChat() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { setViewingDirect } = useUnread();
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
    api.get('/direct').then(r => setMessages(r.data)).catch(console.error).finally(() => setLoading(false));
    setViewingDirect(true);

    const onMsg = (msg) => {
      if (String(msg.threadUserId) !== String(user._id)) return;
      setMessages(prev => {
        const without = prev.filter(m => !(String(m._id).startsWith('temp-') && m.message === msg.message && String(m.senderId) === String(msg.senderId)));
        if (without.some(m => String(m._id) === String(msg._id))) return without;
        return [...without, msg];
      });
    };
    const onTyping = (d) => { if (String(d.userId) !== String(user._id)) setTyping(true); };
    const onStop = () => setTyping(false);

    const cleanupSocket = onSocketConnect((sock) => {
      sock.emit('join_direct');
      sock.off('direct_message', onMsg);
      sock.off('direct_typing', onTyping);
      sock.off('direct_stop_typing', onStop);
      sock.on('direct_message', onMsg);
      sock.on('direct_typing', onTyping);
      sock.on('direct_stop_typing', onStop);
      // Re-fetch messages to catch any sent during disconnect
      api.get('/direct').then(r => setMessages(r.data)).catch(console.error);
    });

    return () => {
      setViewingDirect(false);
      cleanupSocket();
      const socket = getSocket();
      if (socket) {
        socket.off('direct_message', onMsg);
        socket.off('direct_typing', onTyping);
        socket.off('direct_stop_typing', onStop);
      }
    };
  }, []);

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
    socket.emit('direct_typing_start', { threadUserId: user._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('direct_typing_stop', { threadUserId: user._id }), 1500);
  };

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const socket = getSocket();
    const optimistic = { _id: `temp-${Date.now()}`, senderId: user._id, senderRole: user.role, senderName: user.name, message: input.trim(), _text: input.trim(), createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, { ...optimistic }]);
    if (socket) {
      socket.emit('send_direct_message', { message: input.trim() });
      socket.emit('direct_typing_stop', { threadUserId: user._id });
    }
    setInput('');
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-auto md:max-w-2xl">
        {/* Header */}
        <div className="mb-3 px-1">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">{t('chat.directTitle')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('chat.directSubtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 md:h-[72vh]">
          {/* Chat header */}
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">A</div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Admin</p>
              <p className="text-xs text-emerald-600">Property Manager</p>
            </div>
            {translating && <span className="ml-auto text-xs text-gray-400 animate-pulse">Translating…</span>}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && <p className="text-center text-gray-400 text-sm py-8">{t('common.loading')}</p>}
            {!loading && displayed.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <span className="text-5xl mb-3">💬</span>
                <p className="text-gray-500 font-medium">{t('chat.directNoMessages')}</p>
              </div>
            )}
            {displayed.map(msg => {
              const isOwn = String(msg.senderId?._id || msg.senderId) === String(user._id);
              return (
                <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && <span className="text-xs text-gray-500 mb-1 px-1">Admin</span>}
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
                <div className="bg-gray-100 text-gray-500 text-xs px-4 py-2.5 rounded-2xl rounded-tl-sm italic">{t('chat.adminTyping')}</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={send} className="border-t border-gray-100 p-3 flex gap-2 bg-white">
            <input type="text" value={input} onChange={handleInput} placeholder={t('chat.placeholder')}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <button type="submit" disabled={!input.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {t('common.send')}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

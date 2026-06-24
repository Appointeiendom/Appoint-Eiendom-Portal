import { useState, useEffect, useRef } from 'react';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getSocket } from '../services/socketService';
import api from '../services/api';

export default function MaintenanceChatBox({ issueId, maintenanceId, maintenanceName, heightClass = 'h-96' }) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [translating, setTranslating] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNote, setQuoteNote] = useState('');
  const bottomRef = useRef(null);
  const isMaintenance = user?.role === 'maintenance';

  useEffect(() => {
    if (!issueId || !maintenanceId) return;
    api.get(`/messages/${issueId}/maintenance/${maintenanceId}`)
      .then((res) => setMessages(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    const socket = getSocket();
    if (!socket) return;
    socket.emit('join_maintenance_chat', { issueId, maintenanceId });

    const onMessage = (msg) => {
      if (String(msg.maintenanceId) !== String(maintenanceId)) return;
      setMessages((prev) => {
        // Replace optimistic temp message with real one, or append if new
        const withoutTemp = prev.filter(
          m => !(String(m._id).startsWith('temp-') && m.message === msg.message && String(m.senderId) === String(msg.senderId))
        );
        if (withoutTemp.some(m => String(m._id) === String(msg._id))) return withoutTemp;
        return [...withoutTemp, msg];
      });
    };
    socket.on('new_message', onMessage);
    return () => {
      socket.emit('leave_maintenance_chat', { issueId, maintenanceId });
      socket.off('new_message', onMessage);
    };
  }, [issueId, maintenanceId]);

  // Translate messages when language changes
  useEffect(() => {
    if (messages.length === 0) { setDisplayMessages([]); return; }
    const textMessages = messages.filter(m => m.messageType !== 'quote');
    if (textMessages.length === 0) { setDisplayMessages(messages); return; }
    setTranslating(true);
    api.post('/translate', {
      texts: messages.map(m => m.messageType === 'quote' ? null : m.message),
      target: lang,
    }).then(res => {
      setDisplayMessages(messages.map((m, i) => ({
        ...m,
        _translated: m.messageType === 'quote' ? m.message : (res.data.translations[i] || m.message),
      })));
    }).catch(() => {
      setDisplayMessages(messages.map(m => ({ ...m, _translated: m.message })));
    }).finally(() => setTranslating(false));
  }, [messages, lang]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [displayMessages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const socket = getSocket();
    const optimistic = {
      _id: `temp-${Date.now()}`,
      senderId: user._id,
      senderName: user.name,
      senderRole: user.role,
      message: input.trim(),
      maintenanceId,
      messageType: 'text',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    if (socket) socket.emit('send_message', { issueId, message: input.trim(), maintenanceId });
    setInput('');
  };

  const sendQuote = () => {
    if (!quoteAmount || isNaN(quoteAmount)) return;
    const socket = getSocket();
    const msg = quoteNote.trim() ? `Quote: ${quoteAmount} kr\n${quoteNote.trim()}` : `Quote: ${quoteAmount} kr`;
    if (socket) socket.emit('send_message', { issueId, message: msg, maintenanceId, messageType: 'quote', quoteAmount: Number(quoteAmount) });
    setQuoteAmount(''); setQuoteNote(''); setShowQuoteForm(false);
  };

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">{t('common.loading')}</div>;

  return (
    <div className={`flex flex-col ${heightClass} border border-gray-200 rounded-xl overflow-hidden bg-white`}>
      <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-700 text-sm">{t('chat.chatWith')(maintenanceName)}</h3>
          <p className="text-xs text-gray-400">{t('chat.maintenanceThread')}</p>
        </div>
        {isMaintenance && (
          <button onClick={() => setShowQuoteForm(!showQuoteForm)}
            className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors">
            {t('chat.sendQuote')}
          </button>
        )}
      </div>

      {showQuoteForm && isMaintenance && (
        <div className="bg-amber-50 border-b border-amber-100 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-700">{t('chat.quoteTitle')}</p>
          <div className="flex gap-2">
            <input type="number" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)}
              placeholder={t('chat.quoteAmount')}
              className="w-32 border border-amber-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <input type="text" value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)}
              placeholder={t('chat.quoteNote')}
              className="flex-1 border border-amber-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={sendQuote} className="bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-amber-600">
              {t('chat.sendQuote')}
            </button>
            <button onClick={() => setShowQuoteForm(false)} className="text-xs text-gray-500 hover:text-gray-700">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {translating && <p className="text-center text-gray-400 text-xs py-1 animate-pulse">Translating…</p>}
        {displayMessages.length === 0 && !translating && <p className="text-center text-gray-400 text-sm py-8">{t('chat.noMessages')}</p>}
        {displayMessages.map((msg) => {
          const senderId = msg.senderId?._id || msg.senderId;
          const isOwn = String(senderId) === String(user._id);
          const isQuote = msg.messageType === 'quote';
          return (
            <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && <span className="text-xs text-gray-500 mb-1 px-1">{msg.senderName}</span>}
                {isQuote ? (
                  <div className={`rounded-2xl overflow-hidden border-2 ${isOwn ? 'border-amber-400' : 'border-amber-300'}`}>
                    <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide">{t('chat.quoteLabel')}</div>
                    <div className="bg-amber-50 px-4 py-3">
                      <p className="text-2xl font-bold text-amber-700">{msg.quoteAmount?.toLocaleString()} kr</p>
                      {msg.message.includes('\n') && <p className="text-sm text-gray-600 mt-1">{msg.message.split('\n').slice(1).join('\n')}</p>}
                    </div>
                  </div>
                ) : (
                  <div className={`px-4 py-2 rounded-2xl text-sm ${isOwn ? 'bg-emerald-500 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                    {msg._translated || msg.message}
                  </div>
                )}
                <span className="text-xs text-gray-400 mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-gray-200 p-3 flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('chat.placeholder')}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        <button type="submit" disabled={!input.trim()}
          className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors">
          {t('common.send')}
        </button>
      </form>
    </div>
  );
}

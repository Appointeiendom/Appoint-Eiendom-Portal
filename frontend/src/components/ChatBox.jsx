import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getSocket } from '../services/socketService';
import api from '../services/api';

export default function ChatBox({ issueId }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    if (!issueId) return;
    api.get(`/messages/${issueId}`)
      .then((res) => setMessages(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    const socket = getSocket();
    if (!socket) return;
    socket.emit('join_issue', issueId);

    const onMessage = (msg) => {
      if (msg.maintenanceId) return;
      setMessages((prev) => {
        const withoutTemp = prev.filter(
          m => !(String(m._id).startsWith('temp-') && m.message === msg.message && String(m.senderId) === String(msg.senderId))
        );
        if (withoutTemp.some(m => String(m._id) === String(msg._id))) return withoutTemp;
        return [...withoutTemp, msg];
      });
    };
    const onTyping = (data) => { if (String(data.userId) !== String(user._id)) setTyping(data.name); };
    const onStopTyping = () => setTyping(null);

    socket.on('new_message', onMessage);
    socket.on('user_typing', onTyping);
    socket.on('user_stopped_typing', onStopTyping);

    return () => {
      socket.emit('leave_issue', issueId);
      socket.off('new_message', onMessage);
      socket.off('user_typing', onTyping);
      socket.off('user_stopped_typing', onStopTyping);
    };
  }, [issueId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const socket = getSocket();
    if (!socket) return;
    socket.emit('typing_start', { issueId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('typing_stop', { issueId }), 1500);
  };

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
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    if (socket) {
      socket.emit('send_message', { issueId, message: input.trim() });
      socket.emit('typing_stop', { issueId });
    }
    setInput('');
  };

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">{t('common.loading')}</div>;

  return (
    <div className="flex flex-col h-96 border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-700 text-sm">{t('chat.title')}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">{t('chat.noMessages')}</p>
        )}
        {messages.map((msg) => {
          const senderId = msg.senderId?._id || msg.senderId;
          const isOwn = String(senderId) === String(user._id);
          return (
            <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isOwn && <span className="text-xs text-gray-500 mb-1 px-1">{msg.senderName}</span>}
                <div className={`px-4 py-2 rounded-2xl text-sm ${isOwn ? 'bg-emerald-500 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                  {msg.message}
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
            <div className="bg-gray-100 text-gray-500 text-xs px-3 py-2 rounded-full italic">
              {t('chat.isTyping')(typing)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className="border-t border-gray-200 p-3 flex gap-2">
        <input type="text" value={input} onChange={handleInputChange} placeholder={t('chat.placeholder')}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        <button type="submit" disabled={!input.trim()}
          className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors">
          {t('common.send')}
        </button>
      </form>
    </div>
  );
}

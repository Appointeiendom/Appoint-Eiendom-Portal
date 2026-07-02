import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socketService';
import api from '../services/api';
import Layout from '../components/Layout';

export default function DirectChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    api.get('/direct').then(r => setMessages(r.data)).catch(console.error).finally(() => setLoading(false));

    const socket = getSocket();
    if (!socket) return;
    socket.emit('join_direct');

    const onMsg = (msg) => {
      if (String(msg.threadUserId) !== String(user._id)) return;
      setMessages(prev => {
        const without = prev.filter(m => !(String(m._id).startsWith('temp-') && m.message === msg.message && String(m.senderId) === String(msg.senderId)));
        if (without.some(m => String(m._id) === String(msg._id))) return without;
        return [...without, msg];
      });
    };
    const onTyping = (d) => { if (d.senderRole === 'admin' || String(d.userId) !== String(user._id)) setTyping(true); };
    const onStop = () => setTyping(false);

    socket.on('direct_message', onMsg);
    socket.on('direct_typing', onTyping);
    socket.on('direct_stop_typing', onStop);

    return () => {
      socket.off('direct_message', onMsg);
      socket.off('direct_typing', onTyping);
      socket.off('direct_stop_typing', onStop);
    };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
    const optimistic = { _id: `temp-${Date.now()}`, senderId: user._id, senderRole: user.role, senderName: user.name, message: input.trim(), createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    if (socket) {
      socket.emit('send_direct_message', { message: input.trim() });
      socket.emit('direct_typing_stop', { threadUserId: user._id });
    }
    setInput('');
  };

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">💬 Chat with Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Send a message directly to the property manager</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col" style={{ height: '70vh' }}>
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">A</div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Admin</p>
              <p className="text-xs text-emerald-600">Property Manager</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && <p className="text-center text-gray-400 text-sm py-8">Loading…</p>}
            {!loading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <span className="text-4xl mb-3">💬</span>
                <p className="text-gray-500 font-medium">No messages yet</p>
                <p className="text-sm text-gray-400 mt-1">Send a message to start the conversation</p>
              </div>
            )}
            {messages.map(msg => {
              const isOwn = String(msg.senderId?._id || msg.senderId) === String(user._id);
              return (
                <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && <span className="text-xs text-gray-500 mb-1 px-1">Admin</span>}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isOwn ? 'bg-emerald-500 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
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
                <div className="bg-gray-100 text-gray-500 text-xs px-3 py-2 rounded-full italic">Admin is typing…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={send} className="border-t border-gray-100 p-3 flex gap-2">
            <input type="text" value={input} onChange={handleInput} placeholder="Type a message…"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <button type="submit" disabled={!input.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              Send
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

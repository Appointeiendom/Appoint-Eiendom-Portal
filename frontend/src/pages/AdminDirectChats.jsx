import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socketService';
import api from '../services/api';
import Layout from '../components/Layout';

function ThreadList({ threads, activeId, onSelect, unreadMap }) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <span className="text-4xl mb-3">💬</span>
        <p className="text-gray-500 font-medium text-sm">No conversations yet</p>
        <p className="text-xs text-gray-400 mt-1">Tenants and maintenance workers can message you here</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-gray-100">
      {threads.map(th => {
        const unread = unreadMap[String(th._id)] ?? th.unreadCount ?? 0;
        const isActive = String(th._id) === String(activeId);
        return (
          <button key={th._id} onClick={() => onSelect(th)}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 ${isActive ? 'bg-emerald-50' : ''}`}>
            <div className="shrink-0">
              {th.user?.photo
                ? <img src={th.user.photo} className="w-10 h-10 rounded-full object-cover" alt={th.user.name} />
                : <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                    {th.user?.name?.[0]?.toUpperCase() || '?'}
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium truncate ${isActive ? 'text-emerald-700' : 'text-gray-800'}`}>{th.user?.name}</p>
                {unread > 0 && (
                  <span className="ml-2 shrink-0 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{unread}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                <span className={`capitalize mr-1 ${th.user?.role === 'maintenance' ? 'text-blue-500' : 'text-emerald-500'}`}>{th.user?.role}</span>
                {th.lastMessage?.message || ''}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ChatPanel({ thread, onNewMessage }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    if (!thread) return;
    setLoading(true);
    setMessages([]);
    api.get(`/direct/${thread._id}`).then(r => setMessages(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [thread?._id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
    const optimistic = { _id: `temp-${Date.now()}`, senderId: user._id, senderRole: 'admin', senderName: user.name, message: input.trim(), threadUserId: thread._id, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    onNewMessage({ ...optimistic, senderName: 'Admin' });
    if (socket) {
      socket.emit('send_direct_message', { message: input.trim(), toUserId: String(thread._id) });
      socket.emit('direct_typing_stop', { threadUserId: thread._id });
    }
    setInput('');
  };

  // Listen for incoming messages for this thread
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !thread) return;
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
    socket.on('direct_message', onMsg);
    socket.on('direct_typing', onTyping);
    socket.on('direct_stop_typing', onStop);
    return () => { socket.off('direct_message', onMsg); socket.off('direct_typing', onTyping); socket.off('direct_stop_typing', onStop); };
  }, [thread?._id]);

  if (!thread) return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <span className="text-5xl mb-3">💬</span>
      <p className="text-gray-500 font-medium">Select a conversation</p>
      <p className="text-sm text-gray-400 mt-1">Click a thread on the left to open it</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-3 bg-gray-50">
        {thread.user?.photo
          ? <img src={thread.user.photo} className="w-9 h-9 rounded-full object-cover" alt={thread.user.name} />
          : <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
              {thread.user?.name?.[0]?.toUpperCase()}
            </div>
        }
        <div>
          <p className="text-sm font-semibold text-gray-800">{thread.user?.name}</p>
          <p className="text-xs text-gray-400 capitalize">{thread.user?.role}{thread.user?.unit ? ` · ${thread.user.unit}` : ''}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-center text-gray-400 text-sm py-8">Loading…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No messages yet. Say hello!</p>
        )}
        {messages.map(msg => {
          const isOwn = String(msg.senderId?._id || msg.senderId) === String(user._id);
          return (
            <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && <span className="text-xs text-gray-500 mb-1 px-1">{msg.senderName}</span>}
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
            <div className="bg-gray-100 text-gray-500 text-xs px-3 py-2 rounded-full italic">{thread.user?.name} is typing…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="border-t border-gray-100 p-3 flex gap-2">
        <input type="text" value={input} onChange={handleInput} placeholder={`Message ${thread.user?.name}…`}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        <button type="submit" disabled={!input.trim()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}

export default function AdminDirectChats() {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [unreadMap, setUnreadMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/direct').then(r => {
      setThreads(r.data);
      const map = {};
      r.data.forEach(th => { map[String(th._id)] = th.unreadCount || 0; });
      setUnreadMap(map);
    }).catch(console.error).finally(() => setLoading(false));

    const socket = getSocket();
    if (socket) socket.emit('join_direct');
  }, []);

  const handleSelect = (th) => {
    setActiveThread(th);
    setUnreadMap(prev => ({ ...prev, [String(th._id)]: 0 }));
  };

  const handleNewMessage = (msg) => {
    const tid = String(msg.threadUserId);
    setThreads(prev => {
      const existing = prev.find(t => String(t._id) === tid);
      if (existing) {
        return [{ ...existing, lastMessage: msg }, ...prev.filter(t => String(t._id) !== tid)];
      }
      return prev;
    });
    // If message is from non-admin and thread isn't active, increment badge
    if (msg.senderRole !== 'admin' && String(msg.threadUserId) !== String(activeThread?._id)) {
      setUnreadMap(prev => ({ ...prev, [tid]: (prev[tid] || 0) + 1 }));
    }
  };

  // Listen for new messages from any thread when no panel is capturing them
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onMsg = (msg) => {
      if (msg.senderRole === 'admin') return;
      handleNewMessage(msg);
    };
    socket.on('direct_message', onMsg);
    return () => socket.off('direct_message', onMsg);
  }, [activeThread?._id]);

  const totalUnread = Object.values(unreadMap).reduce((s, v) => s + v, 0);

  return (
    <Layout>
      <div className="max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">💬 Direct Messages</h1>
            <p className="text-sm text-gray-500 mt-1">Conversations with tenants and maintenance workers</p>
          </div>
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">{totalUnread} unread</span>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex" style={{ height: '74vh' }}>
          {/* Thread list */}
          <div className="w-72 shrink-0 border-r border-gray-100 overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conversations</p>
            </div>
            {loading ? <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
              : <ThreadList threads={threads} activeId={activeThread?._id} onSelect={handleSelect} unreadMap={unreadMap} />
            }
          </div>

          {/* Chat panel */}
          <div className="flex-1 min-w-0">
            <ChatPanel thread={activeThread} onNewMessage={handleNewMessage} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

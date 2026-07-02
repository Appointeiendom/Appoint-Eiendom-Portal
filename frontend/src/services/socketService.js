import { io } from 'socket.io-client';

let socket = null;
const connectCallbacks = [];

export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  socket = io(import.meta.env.VITE_API_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  socket.on('connect', () => {
    connectCallbacks.forEach(cb => cb(socket));
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Register a callback that fires as soon as the socket is connected.
 * If the socket is already connected, fires immediately.
 * Also fires on every reconnect.
 * Returns a cleanup function.
 */
export const onSocketConnect = (cb) => {
  connectCallbacks.push(cb);
  if (socket?.connected) cb(socket);
  return () => {
    const i = connectCallbacks.indexOf(cb);
    if (i !== -1) connectCallbacks.splice(i, 1);
  };
};

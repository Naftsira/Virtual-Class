import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

let chatSocket: Socket | null = null;
let whiteboardSocket: Socket | null = null;

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3001';

function getAuthOptions() {
  return { auth: { token: Cookies.get('token') }, autoConnect: false };
}

export function getChatSocket(): Socket {
  if (!chatSocket) {
    chatSocket = io(`${REALTIME_URL}/chat`, getAuthOptions());
  }
  return chatSocket;
}

export function getWhiteboardSocket(): Socket {
  if (!whiteboardSocket) {
    whiteboardSocket = io(`${REALTIME_URL}/whiteboard`, getAuthOptions());
  }
  return whiteboardSocket;
}

export function connectSocket() {
  const s = getChatSocket();
  if (!s.connected) s.connect();
  return s;
}

export function getSocket() {
  return getChatSocket();
}

export function connectWhiteboardSocket() {
  const s = getWhiteboardSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectAll() {
  chatSocket?.disconnect();
  whiteboardSocket?.disconnect();
}

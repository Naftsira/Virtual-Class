import { useEffect, useRef, useState } from 'react';
import { connectSocket } from '../socket';

export interface Message {
  id: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  content: string;
  createdAt: string;
}

function normalizeMessage(m: any): Message {
  return {
    id: m._id || m.id,
    user: m.user,
    content: m.content,
    createdAt: m.createdAt,
  };
}

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(connectSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => {
      setConnected(true);
      socket.emit('chat:join', sessionId);
    };

    const onDisconnect = () => setConnected(false);

    const onHistory = (history: any[]) => {
      setMessages(history.map(normalizeMessage));
    };

    const onMessage = (message: any) => {
      setMessages((prev) => {
        const normalized = normalizeMessage(message);
        // Hindari duplicate
        if (prev.find((m) => m.id === normalized.id)) return prev;
        return [...prev, normalized];
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:history', onHistory);
    socket.on('chat:message', onMessage);

    if (socket.connected) {
      setConnected(true);
      socket.emit('chat:join', sessionId);
    }

    return () => {
      socket.emit('chat:leave', sessionId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat:history', onHistory);
      socket.off('chat:message', onMessage);
    };
  }, [sessionId]);

  const sendMessage = (content: string) => {
    socketRef.current.emit('chat:message', { sessionId, content });
  };

  return { messages, connected, sendMessage };
}

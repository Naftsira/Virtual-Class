import { useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket } from '../socket';

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

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(connectSocket());

  useEffect(() => {
    const socket = socketRef.current;

    socket.emit('chat:join', sessionId);
    setConnected(socket.connected);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.emit('chat:leave', sessionId);
      socket.off('chat:message');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [sessionId]);

  const sendMessage = (content: string) => {
    socketRef.current.emit('chat:message', { sessionId, content });
  };

  return { messages, connected, sendMessage };
}

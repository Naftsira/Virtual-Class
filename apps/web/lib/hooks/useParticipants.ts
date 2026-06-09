import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

export interface Participant {
  id: string;
  name: string;
  role: 'lecturer' | 'student';
  socketId: string;
  canDraw: boolean;
}

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3001';

let participantsSocket: Socket | null = null;

export function getParticipantsSocket(): Socket {
  if (!participantsSocket) {
    participantsSocket = io(`${REALTIME_URL}/participants`, {
      auth: { token: Cookies.get('token') },
      autoConnect: false,
    });
  }
  return participantsSocket;
}

export function useParticipants(
  sessionId: string,
  onUnauthorized?: (msg: string) => void,
  onKicked?: () => void,
  onBanned?: () => void,
) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const socketRef = useRef(getParticipantsSocket());

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();

    socket.emit('participants:join', sessionId);

    socket.on('participants:update', (list: Participant[]) => {
      setParticipants(list);
    });

    socket.on('session:unauthorized', (msg: string) => {
      onUnauthorized?.(msg);
    });

    socket.on('session:kicked', () => {
      onKicked?.();
    });

    socket.on('session:banned', () => {
      onBanned?.();
    });

    return () => {
      socket.emit('participants:leave', sessionId);
      socket.off('participants:update');
      socket.off('session:unauthorized');
      socket.off('session:kicked');
      socket.off('session:banned');
    };
  }, [sessionId]);

  const kickStudent = (studentId: string) => {
    socketRef.current.emit('participants:kick', { sessionId, studentId });
  };

  const banStudent = (studentId: string) => {
    socketRef.current.emit('participants:ban', { sessionId, studentId });
  };

  const toggleDrawPermission = (studentId: string, allow: boolean) => {
    socketRef.current.emit('whiteboard:permit', { sessionId, studentId, allow });
  };

  return { participants, kickStudent, banStudent, toggleDrawPermission };
}

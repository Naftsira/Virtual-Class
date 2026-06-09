import { useEffect, useRef, useState } from 'react';
import { getParticipantsSocket } from './useParticipants';

export function useWhiteboardPermission(role: string) {
  // Student default false, lecturer default true
  const [canDraw, setCanDraw] = useState(role === 'lecturer');
  const socketRef = useRef(getParticipantsSocket());

  useEffect(() => {
    // Reset saat role berubah
    setCanDraw(role === 'lecturer');
  }, [role]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();

    socket.on('whiteboard:permission', (data: { canDraw: boolean }) => {
      setCanDraw(data.canDraw);
    });

    return () => {
      socket.off('whiteboard:permission');
    };
  }, []);

  return { canDraw };
}

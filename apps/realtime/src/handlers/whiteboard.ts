import { Server, Socket } from 'socket.io';

export function registerWhiteboardHandlers(io: Server, socket: Socket) {
  const user = socket.data.user;

  socket.on('whiteboard:join', (sessionId: string) => {
    socket.join(`whiteboard:${sessionId}`);
  });

  socket.on('whiteboard:draw', (data: {
    sessionId: string;
    type: 'draw' | 'erase' | 'clear';
    payload: object;
  }) => {
    socket.to(`whiteboard:${data.sessionId}`).emit('whiteboard:draw', {
      userId: user.id,
      userName: user.name,
      type: data.type,
      payload: data.payload,
    });
  });

  socket.on('whiteboard:clear', (sessionId: string) => {
    io.to(`whiteboard:${sessionId}`).emit('whiteboard:clear', {
      clearedBy: user.name,
    });
  });
}

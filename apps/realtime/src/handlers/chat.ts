import { Server, Socket } from 'socket.io';

export function registerChatHandlers(io: Server, socket: Socket) {
  const user = socket.data.user;

  socket.on('chat:join', (sessionId: string) => {
    socket.join(`session:${sessionId}`);
    console.log(`${user.name} joined session ${sessionId}`);
  });

  socket.on('chat:leave', (sessionId: string) => {
    socket.leave(`session:${sessionId}`);
  });

  socket.on('chat:message', (data: { sessionId: string; content: string }) => {
    const message = {
      id: crypto.randomUUID(),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      content: data.content,
      createdAt: new Date().toISOString(),
    };

    io.to(`session:${data.sessionId}`).emit('chat:message', message);
  });
}

import { Namespace, Socket } from 'socket.io';
import { WhiteboardState } from '../models/WhiteboardState';

export function registerWhiteboardHandlers(nsp: Namespace, socket: Socket) {
  const user = socket.data.user;

  socket.on('whiteboard:join', async (sessionId: string) => {
    socket.join(`whiteboard:${sessionId}`);

    const state = await WhiteboardState.findOne({ sessionId });
    if (state && state.objects.length > 0) {
      socket.emit('whiteboard:state', state.objects);
    }
  });

  socket.on('whiteboard:stroke', (data: {
    sessionId: string;
    points: number[];
    color: string;
    width: number;
  }) => {
    socket.to(`whiteboard:${data.sessionId}`).emit('whiteboard:stroke', {
      userId: user.id,
      points: data.points,
      color: data.color,
      width: data.width,
    });
  });

  socket.on('whiteboard:draw', async (data: {
    sessionId: string;
    type: string;
    payload: object;
  }) => {
    socket.to(`whiteboard:${data.sessionId}`).emit('whiteboard:draw', {
      userId: user.id,
      payload: data.payload,
    });

    await WhiteboardState.findOneAndUpdate(
      { sessionId: data.sessionId },
      { $push: { objects: data.payload }, updatedAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );
  });

  socket.on('whiteboard:clear', async (sessionId: string) => {
    await WhiteboardState.findOneAndUpdate(
      { sessionId },
      { objects: [], updatedAt: new Date() },
      { upsert: true }
    );
    nsp.to(`whiteboard:${sessionId}`).emit('whiteboard:clear');
  });
}

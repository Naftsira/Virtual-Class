import { Server, Socket } from 'socket.io';
import { Message } from '../models/Message';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:8000/api';

async function sessionExists(sessionId: string, token: string): Promise<boolean> {
  try {
    await axios.get(`${API_URL}/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    return true;
  } catch {
    return false;
  }
}

export function registerChatHandlers(io: Server, socket: Socket) {
  const user = socket.data.user;
  const token = socket.handshake.auth?.token;

  socket.on('chat:join', async (sessionId: string) => {
    const exists = await sessionExists(sessionId, token);
    if (!exists) {
      socket.emit('session:ended');
      return;
    }

    socket.join(`session:${sessionId}`);

    const history = await Message.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(50);

    socket.emit('chat:history', history);
  });

  socket.on('chat:leave', (sessionId: string) => {
    socket.leave(`session:${sessionId}`);
  });

  socket.on('chat:message', async (data: { sessionId: string; content: string }) => {
    const exists = await sessionExists(data.sessionId, token);
    if (!exists) {
      socket.emit('session:ended');
      return;
    }

    const message = await Message.create({
      sessionId: data.sessionId,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      content: data.content,
    });

    io.to(`session:${data.sessionId}`).emit('chat:message', {
      id: message._id.toString(),
      user: message.user,
      content: message.content,
      createdAt: message.createdAt,
    });
  });

  socket.on('session:end', async (sessionId: string) => {
    if (user.role !== 'lecturer') return;

    await Message.deleteMany({ sessionId });
    io.to(`session:${sessionId}`).emit('session:ended');
    console.log(`Session ${sessionId} ended by ${user.name}`);
  });
}

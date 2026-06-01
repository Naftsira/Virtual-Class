import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
import { verifyToken } from './middleware/auth';
import { registerChatHandlers } from './handlers/chat';
import { registerWhiteboardHandlers } from './handlers/whiteboard';
import { Message } from './models/Message';
import { WhiteboardState } from './models/WhiteboardState';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Lectra Realtime Server' });
});

app.post('/internal/session/:sessionId/end', async (req, res) => {
  const { sessionId } = req.params;
  await Message.deleteMany({ sessionId });
  await WhiteboardState.deleteOne({ sessionId });
  chatNsp.to(`session:${sessionId}`).emit('session:ended');
  res.json({ message: 'Session ended' });
});

app.post('/internal/course/:courseId/end', async (req, res) => {
  const { courseId } = req.params;
  const { sessionIds } = req.body as { sessionIds: string[] };
  if (sessionIds?.length) {
    await Message.deleteMany({ sessionId: { $in: sessionIds } });
    await WhiteboardState.deleteMany({ sessionId: { $in: sessionIds } });
    sessionIds.forEach((sid) => {
      chatNsp.to(`session:${sid}`).emit('session:ended');
    });
  }
  res.json({ message: 'Course sessions ended' });
});

// Namespace terpisah
const chatNsp = io.of('/chat');
const whiteboardNsp = io.of('/whiteboard');

chatNsp.use(verifyToken);
whiteboardNsp.use(verifyToken);

chatNsp.on('connection', (socket) => {
  const user = socket.data.user;
  console.log(`[Chat] Connected: ${user.name}`);
  registerChatHandlers(chatNsp, socket);
  socket.on('disconnect', () => console.log(`[Chat] Disconnected: ${user.name}`));
});

whiteboardNsp.on('connection', (socket) => {
  const user = socket.data.user;
  console.log(`[Whiteboard] Connected: ${user.name}`);
  registerWhiteboardHandlers(whiteboardNsp, socket);
  socket.on('disconnect', () => console.log(`[Whiteboard] Disconnected: ${user.name}`));
});

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Realtime server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

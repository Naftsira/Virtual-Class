import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyToken } from './middleware/auth';
import { registerChatHandlers } from './handlers/chat';
import { registerWhiteboardHandlers } from './handlers/whiteboard';

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

io.use(verifyToken);

io.on('connection', (socket) => {
  const user = socket.data.user;
  console.log(`Connected: ${user.name} (${user.role})`);

  registerChatHandlers(io, socket);
  registerWhiteboardHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${user.name}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Realtime server running on port ${PORT}`);
});

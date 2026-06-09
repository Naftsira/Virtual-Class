import { Namespace, Socket } from 'socket.io';
import { Ban } from '../models/Ban';
import axios from 'axios';

const sessionParticipants = new Map<string, Map<string, {
  id: string;
  name: string;
  role: string;
  socketId: string;
  canDraw: boolean;
}>>();

const whiteboardPerms = new Map<string, Set<string>>();

export function canUserDraw(sessionId: string, userId: string, role: string): boolean {
  if (role === 'lecturer') return true;
  const perms = whiteboardPerms.get(sessionId);
  return perms?.has(userId) || false;
}

async function verifyLecturerOwnership(sessionId: string, userId: string, token: string): Promise<boolean> {
  try {
    const API_URL = process.env.API_URL || 'http://localhost:8000/api';
    const res = await axios.get(`${API_URL}/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const session = res.data;

    const courseRes = await axios.get(`${API_URL}/courses/${session.course_id}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const course = courseRes.data;

    return course.lecturer_id === userId;
  } catch {
    return false;
  }
}

export function registerParticipantHandlers(nsp: Namespace, socket: Socket) {
  const user = socket.data.user;
  const token = socket.handshake.auth?.token;

  socket.on('participants:join', async (sessionId: string) => {
    // Verify lecturer ownership
    if (user.role === 'lecturer') {
      const isOwner = await verifyLecturerOwnership(sessionId, user.id, token);
      if (!isOwner) {
        socket.emit('session:unauthorized', 'You do not own this course.');
        return;
      }
    }

    // Check if banned
    if (user.role === 'student') {
      const banned = await Ban.findOne({ sessionId, studentId: user.id });
      if (banned) {
        socket.emit('session:banned');
        return;
      }
    }

    socket.join(`participants:${sessionId}`);

    if (!sessionParticipants.has(sessionId)) {
      sessionParticipants.set(sessionId, new Map());
    }

    const participants = sessionParticipants.get(sessionId)!;
    participants.set(user.id, {
      id: user.id,
      name: user.name,
      role: user.role,
      socketId: socket.id,
      canDraw: user.role === 'lecturer',
    });

    broadcastParticipants(nsp, sessionId);
  });

  socket.on('participants:leave', (sessionId: string) => {
    const participants = sessionParticipants.get(sessionId);
    if (participants) {
      participants.delete(user.id);
      broadcastParticipants(nsp, sessionId);
    }
    socket.leave(`participants:${sessionId}`);
  });

  socket.on('participants:kick', (data: { sessionId: string; studentId: string }) => {
    if (user.role !== 'lecturer') return;

    const participants = sessionParticipants.get(data.sessionId);
    const student = participants?.get(data.studentId);
    if (!student) return;

    nsp.to(student.socketId).emit('session:kicked');
    participants?.delete(data.studentId);
    broadcastParticipants(nsp, data.sessionId);
  });

  socket.on('participants:ban', async (data: { sessionId: string; studentId: string }) => {
    if (user.role !== 'lecturer') return;

    const participants = sessionParticipants.get(data.sessionId);
    const student = participants?.get(data.studentId);
    if (!student) return;

    await Ban.findOneAndUpdate(
      { sessionId: data.sessionId, studentId: data.studentId },
      { sessionId: data.sessionId, studentId: data.studentId, bannedAt: new Date() },
      { upsert: true }
    );

    nsp.to(student.socketId).emit('session:banned');
    participants?.delete(data.studentId);
    broadcastParticipants(nsp, data.sessionId);
  });

  socket.on('whiteboard:permit', (data: { sessionId: string; studentId: string; allow: boolean }) => {
    if (user.role !== 'lecturer') return;

    if (!whiteboardPerms.has(data.sessionId)) {
      whiteboardPerms.set(data.sessionId, new Set());
    }

    const perms = whiteboardPerms.get(data.sessionId)!;
    if (data.allow) {
      perms.add(data.studentId);
    } else {
      perms.delete(data.studentId);
    }

    const participants = sessionParticipants.get(data.sessionId);
    const student = participants?.get(data.studentId);
    if (student) {
      student.canDraw = data.allow;
      participants?.set(data.studentId, student);
      nsp.to(student.socketId).emit('whiteboard:permission', { canDraw: data.allow });
    }

    broadcastParticipants(nsp, data.sessionId);
  });

  socket.on('disconnect', () => {
    sessionParticipants.forEach((participants, sessionId) => {
      if (participants.has(user.id)) {
        participants.delete(user.id);
        broadcastParticipants(nsp, sessionId);
      }
    });
  });
}

function broadcastParticipants(nsp: Namespace, sessionId: string) {
  const participants = sessionParticipants.get(sessionId) || new Map();
  const list = Array.from(participants.values()).sort((a, b) => {
    if (a.role === 'lecturer') return -1;
    if (b.role === 'lecturer') return 1;
    return a.name.localeCompare(b.name);
  });

  nsp.to(`participants:${sessionId}`).emit('participants:update', list);
}

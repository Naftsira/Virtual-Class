import { Socket } from 'socket.io';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:8000/api';

export async function verifyToken(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('No token provided'));
  }

  try {
    const res = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    socket.data.user = res.data;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}

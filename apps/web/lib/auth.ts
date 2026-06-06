import api from './axios';
import Cookies from 'js-cookie';
import { disconnectAll } from './socket';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'lecturer' | 'student';
  avatar: string | null;
}

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  Cookies.set('token', res.data.token, { expires: 7 });
  Cookies.set('user', JSON.stringify(res.data.user), { expires: 7 });
  return res.data.user as User;
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: 'lecturer' | 'student';
}) {
  const res = await api.post('/auth/register', data);
  Cookies.set('token', res.data.token, { expires: 7 });
  Cookies.set('user', JSON.stringify(res.data.user), { expires: 7 });
  return res.data.user as User;
}

export async function logout() {
  await api.post('/auth/logout');
  Cookies.remove('token');
  Cookies.remove('user');
  disconnectAll();
}

export async function getMe(): Promise<User | null> {
  const cached = Cookies.get('user');
  if (cached) {
    try {
      return JSON.parse(cached) as User;
    } catch {}
  }

  try {
    const res = await api.get('/auth/me');
    Cookies.set('user', JSON.stringify(res.data), { expires: 7 });
    return res.data as User;
  } catch {
    return null;
  }
}

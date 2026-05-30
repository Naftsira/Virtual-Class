'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '@/lib/hooks/useChat';
import { useAuth } from '@/lib/store/auth';
import { getSocket } from '@/lib/socket';
import api from '@/lib/axios';

interface Session {
  id: string;
  course_id: string;
  title: string;
  status: string;
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { messages, connected, sendMessage } = useChat(id);
  const [input, setInput] = useState('');
  const [ending, setEnding] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    api.get(`/sessions/${id}`).then((res) => setSession(res.data));

    const socket = getSocket();
    socket.on('session:ended', () => {
      alert('Session has ended.');
      router.push('/courses');
    });

    return () => {
      socket.off('session:ended');
    };
  }, [id, router]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleEndSession = async () => {
    if (!confirm('End this session? All messages will be deleted.')) return;
    setEnding(true);
    try {
      // Hapus dari Supabase via Laravel
      await api.post(`/courses/${session?.course_id}/sessions/${id}/end`);
      // Hapus dari MongoDB dan notify semua user via socket
      getSocket().emit('session:end', id);
    } catch (err) {
      alert('Failed to end session.');
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <span className="font-bold tracking-tight">LECTRA</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          {user?.role === 'lecturer' && (
            <button
              onClick={handleEndSession}
              disabled={ending || !session}
              className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition"
            >
              {ending ? 'Ending...' : 'End Session'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-6 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.user.id === user?.id ? 'items-end' : 'items-start'}`}
          >
            <span className="text-xs text-gray-400 mb-1">{msg.user.name}</span>
            <div
              className={`px-4 py-2 rounded-2xl text-sm max-w-xs ${
                msg.user.id === user?.id
                  ? 'bg-black text-white'
                  : 'bg-white border text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border-t px-6 py-4 flex gap-3 max-w-3xl w-full mx-auto">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          onClick={handleSend}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useChat } from '@/lib/hooks/useChat';
import { useAuth } from '@/lib/store/auth';

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { messages, connected, sendMessage } = useChat(id);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <span className="font-bold tracking-tight">LECTRA</span>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Messages */}
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

      {/* Input */}
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

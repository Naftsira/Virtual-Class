'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '@/lib/hooks/useChat';
import { useWhiteboard } from '@/lib/hooks/useWhiteboard';
import { useAuth } from '@/lib/store/auth';
import { getSocket } from '@/lib/socket';
import api from '@/lib/axios';
import Link from 'next/link';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];

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
  const [chatOpen, setChatOpen] = useState(true);
  const [chatClosing, setChatClosing] = useState(false);
  const [activeColor, setActiveColor] = useState('#000000');
  const [erasing, setErasing] = useState(false);
  const [brushSize, setBrushSize] = useState(3);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestMsg, setLatestMsg] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { clearCanvas, setColor, setWidth, toggleEraser, resetView } = useWhiteboard(id, canvasRef, containerRef);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const router = useRouter();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    api.get(`/sessions/${id}`).then((res) => setSession(res.data)).catch(() => {
      router.push('/courses');
    });

    const socket = getSocket();
    socket.on('session:ended', () => {
      alert('Session has ended.');
      router.push('/courses');
    });

    return () => { socket.off('session:ended'); };
  }, [id, router]);

  // Handle new messages
  useEffect(() => {
    if (messages.length <= prevMsgCountRef.current) return;
    const newMsgs = messages.slice(prevMsgCountRef.current);
    prevMsgCountRef.current = messages.length;

    if (!chatOpen) {
      setUnreadCount((c) => c + newMsgs.length);
      const last = newMsgs[newMsgs.length - 1];
      setLatestMsg(`${last.user.name}: ${last.content}`);

      // Auto hide bubble after 4s
      setTimeout(() => setLatestMsg(null), 4000);
    }
  }, [messages, chatOpen]);

  // Scroll detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  };

  const handleCloseChat = () => {
    setChatClosing(true);
    setTimeout(() => {
      setChatOpen(false);
      setChatClosing(false);
    }, 280);
  };

  const handleOpenChat = () => {
    setChatOpen(true);
    setChatClosing(false);
    setUnreadCount(0);
    setLatestMsg(null);
    setTimeout(() => scrollToBottom(), 100);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
    setTimeout(() => scrollToBottom(), 50);
  };

  const handleEndSession = async () => {
    if (!confirm('End this session? All messages will be deleted.')) return;
    setEnding(true);
    try {
      await api.post(`/courses/${session?.course_id}/sessions/${id}/end`);
      getSocket().emit('session:end', id);
    } catch {
      alert('Failed to end session.');
    } finally {
      setEnding(false);
    }
  };

  const handleColorChange = (color: string) => {
    setActiveColor(color);
    setErasing(false);
    toggleEraser(false, color);
    setColor(color);
  };

  const handleEraserToggle = () => {
    const next = !erasing;
    setErasing(next);
    toggleEraser(next, activeColor);
  };

  const handleSizeChange = (size: number) => {
    setBrushSize(size);
    setWidth(size);
  };

  const ChatPanel = (
    <div className="flex flex-col h-full relative">
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
        <h2 className="font-semibold text-sm">Chat</h2>
        <button
          onClick={handleCloseChat}
          className="text-gray-400 hover:text-black text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
      >
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-xs mt-4">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.user.id === user?.id ? 'items-end' : 'items-start'}`}
          >
            <span className="text-xs text-gray-400 mb-1">{msg.user.name}</span>
            <div
              className={`px-3 py-2 rounded-2xl text-xs max-w-[200px] break-words ${
                msg.user.id === user?.id
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-16 right-4 bg-black text-white text-xs px-3 py-1.5 rounded-full shadow-lg hover:bg-gray-800 transition animate-fade-in"
        >
          ↓ Latest
        </button>
      )}

      <div className="px-4 py-3 border-t flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-black min-w-0"
        />
        <button
          onClick={handleSend}
          className="bg-black text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 transition shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Navbar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/courses" className="font-bold tracking-tight shrink-0">LECTRA</Link>
          {session && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-500 truncate">{session.title}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />

          {/* Chat button with unread badge */}
          <button
            onClick={chatOpen ? handleCloseChat : handleOpenChat}
            className="relative bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
          >
            {chatOpen ? 'Hide Chat' : 'Chat'}
            {!chatOpen && unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-fade-in">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {user?.role === 'lecturer' && (
            <button
              onClick={handleEndSession}
              disabled={ending || !session}
              className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition"
            >
              {ending ? '...' : 'End'}
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-3 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className={`w-5 h-5 rounded-full border-2 transition shrink-0 ${
                activeColor === color && !erasing ? 'border-black scale-110' : 'border-gray-200'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="w-px h-5 bg-gray-200 shrink-0" />
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">Size</span>
          {[2, 4, 8, 16].map((size) => (
            <button
              key={size}
              onClick={() => handleSizeChange(size)}
              className={`rounded-full bg-black transition shrink-0 ${
                brushSize === size ? 'opacity-100 ring-2 ring-black ring-offset-1' : 'opacity-30'
              }`}
              style={{ width: size + 6, height: size + 6 }}
            />
          ))}
        </div>
        <div className="w-px h-5 bg-gray-200 shrink-0" />
        <button
          onClick={handleEraserToggle}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
            erasing ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Eraser
        </button>
        <button
          onClick={clearCanvas}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition shrink-0"
        >
          Clear
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Whiteboard */}
        <div className="flex-1 overflow-hidden p-3">
          <div
            ref={containerRef}
            className="bg-gray-100 rounded-xl shadow border w-full aspect-video overflow-hidden relative"
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Desktop Chat Panel */}
        {(chatOpen || chatClosing) && (
          <div className="hidden md:flex w-72 bg-white border-l flex-col shrink-0">
            {ChatPanel}
          </div>
        )}

        {/* Mobile Chat Bottom Sheet */}
        {(chatOpen || chatClosing) && (
          <div
            className={`md:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-2xl shadow-2xl ${
              chatClosing ? 'animate-slide-down' : 'animate-slide-up'
            }`}
            style={{ height: '60vh' }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {ChatPanel}
          </div>
        )}

        {/* Mobile backdrop */}
        {(chatOpen || chatClosing) && (
          <div
            className={`md:hidden fixed inset-0 z-40 bg-black/20 ${
              chatClosing ? 'animate-fade-out' : 'animate-fade-in'
            }`}
            onClick={handleCloseChat}
          />
        )}

        {/* Mobile new message bubble */}
        {!chatOpen && latestMsg && isMobile && (
          <div
            onClick={handleOpenChat}
            className="md:hidden fixed bottom-4 inset-x-4 z-30 bg-black text-white rounded-2xl px-4 py-3 shadow-xl cursor-pointer animate-slide-up"
          >
            <p className="text-xs truncate">{latestMsg}</p>
            {unreadCount > 1 && (
              <p className="text-[10px] text-gray-400 mt-0.5">{unreadCount} new messages</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

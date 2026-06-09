'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useChat } from '@/lib/hooks/useChat';
import { useWhiteboard } from '@/lib/hooks/useWhiteboard';
import { useAuth } from '@/lib/store/auth';
import { useVoice } from '@/lib/hooks/useVoice';
import { useParticipants, Participant } from '@/lib/hooks/useParticipants';
import { useWhiteboardPermission } from '@/lib/hooks/useWhiteboardPermission';
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

type SidePanel = 'chat' | 'participants' | null;

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();

  const { user } = useAuth();

  const [gateChecked, setGateChecked] = useState(false);
  const [input, setInput] = useState('');
  const [ending, setEnding] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>('chat');
  const [sidePanelClosing, setSidePanelClosing] = useState(false);
  const [activeColor, setActiveColor] = useState('#000000');
  const [erasing, setErasing] = useState(false);
  const [brushSize, setBrushSize] = useState(3);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestMsg, setLatestMsg] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);

  const { messages, connected, sendMessage } = useChat(id);
  const {
    connected: voiceConnected,
    muted: voiceMuted,
    toggleMute,
    audioLevel,
  } = useVoice(id);

  const { participants, kickStudent, banStudent, toggleDrawPermission } =
    useParticipants(
      id,
      (msg) => {
        alert(msg);
        router.push('/courses');
      },
      () => {
        alert('You have been kicked from this session.');
        router.push('/courses');
      },
      () => {
        alert('You have been banned from this session.');
        router.push('/courses');
      }
    );

  const { canDraw } = useWhiteboardPermission(user?.role || 'student');

  const { clearCanvas, setColor, setWidth, toggleEraser } = useWhiteboard(
    id,
    canvasRef,
    containerRef,
    canDraw
  );

// Bootstrap session + gate checker
useEffect(() => {
  if (!id) return;

  let cancelled = false;

  const bootstrapSession = async () => {
    setGateChecked(false);
    setSession(null);

    try {
      const res = await api.get(`/sessions/${id}`);
      const currentSession: Session = res.data;

      if (cancelled) return;

      const sessionPassed = sessionStorage.getItem(
        `gate_passed_session_${currentSession.id}`
      );

      const coursePassed = sessionStorage.getItem(
        `gate_passed_course_${currentSession.course_id}`
      );

      // Sudah lolos session gate
      if (sessionPassed) {
        setSession(currentSession);
        setGateChecked(true);
        return;
      }

      // Sudah lolos course gate, maka session di course ini boleh ikut lolos
      if (coursePassed) {
        sessionStorage.setItem(
          `gate_passed_session_${currentSession.id}`,
          '1'
        );

        setSession(currentSession);
        setGateChecked(true);
        return;
      }

      // Belum lolos apa pun, baru kirim ke global gate
      sessionStorage.setItem('gate_type', 'session');
      sessionStorage.setItem('gate_access_id', currentSession.id);
      sessionStorage.setItem('gate_destination', pathname);

      router.replace('/gate');
    } catch (err) {
      console.error('Failed to bootstrap session:', err);
      router.push('/courses');
    }
  };

  bootstrapSession();

  return () => {
    cancelled = true;
  };
}, [id, pathname, router]);

  // Sync canDraw ke whiteboard
  useEffect(() => {
    if (!canDraw && !erasing) {
      // disable drawing — useWhiteboard sudah menerima canDraw
    }
  }, [canDraw, erasing]);

  // Responsive checker
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);

    check();
    window.addEventListener('resize', check);

    return () => window.removeEventListener('resize', check);
  }, []);

  // Socket event listener
  useEffect(() => {
    const socket = getSocket();

    const handleEnded = () => {
      alert('Session has ended.');
      router.push('/courses');
    };

    const handleKicked = () => {
      alert('You have been kicked from this session.');
      router.push('/courses');
    };

    const handleBanned = () => {
      alert('You have been banned from this session.');
      router.push('/courses');
    };

    socket.on('session:ended', handleEnded);
    socket.on('session:kicked', handleKicked);
    socket.on('session:banned', handleBanned);

    return () => {
      socket.off('session:ended', handleEnded);
      socket.off('session:kicked', handleKicked);
      socket.off('session:banned', handleBanned);
    };
  }, [router]);

  // Unread chat logic
  useEffect(() => {
    if (messages.length <= prevMsgCountRef.current) return;

    const newMsgs = messages.slice(prevMsgCountRef.current);
    prevMsgCountRef.current = messages.length;

    if (sidePanel !== 'chat') {
      setUnreadCount((c) => c + newMsgs.length);

      const last = newMsgs[newMsgs.length - 1];
      setLatestMsg(`${last.user.name}: ${last.content}`);

      setTimeout(() => setLatestMsg(null), 4000);
    }
  }, [messages, sidePanel]);

  // Chat scroll checker
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

  const handleClosePanel = () => {
    setSidePanelClosing(true);

    setTimeout(() => {
      setSidePanel(null);
      setSidePanelClosing(false);
    }, 280);
  };

  const handleOpenPanel = (panel: SidePanel) => {
    setSidePanel(panel);
    setSidePanelClosing(false);

    if (panel === 'chat') {
      setUnreadCount(0);
      setLatestMsg(null);
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    sendMessage(input.trim());
    setInput('');

    setTimeout(() => scrollToBottom(), 50);
  };

  const handleEndSession = async () => {
    if (!session) return;
    if (!confirm('End this session? All messages will be deleted.')) return;

    setEnding(true);

    try {
      await api.post(`/courses/${session.course_id}/sessions/${id}/end`);
      getSocket().emit('session:end', id);
    } catch (err) {
      console.error('Failed to end session:', err);
      alert('Failed to end session.');
    } finally {
      setEnding(false);
    }
  };

  const handleBan = (student: Participant) => {
    if (!confirm(`Kick "${student.name}" from this session?`)) return;
    if (!confirm(`Ban "${student.name}"? They will not be able to rejoin this session.`)) return;

    banStudent(student.id);
  };

  const handleKick = (student: Participant) => {
    if (!confirm(`Kick "${student.name}" from this session?`)) return;

    kickStudent(student.id);
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

  const ParticipantsPanel = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
        <h2 className="font-semibold text-sm">
          Participants ({participants.length})
        </h2>
        <button
          onClick={handleClosePanel}
          className="text-gray-400 hover:text-black text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {participants.map((p) => (
          <div
            key={p.id}
            className={`px-4 py-3 flex items-center justify-between ${
              p.role === 'lecturer' ? 'bg-gray-900 text-white' : 'border-b'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  p.role === 'lecturer' ? 'bg-yellow-400' : 'bg-green-400'
                }`}
              />

              <div className="min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    p.role === 'lecturer' ? 'text-white' : ''
                  }`}
                >
                  {p.name}{' '}
                  {p.id === user?.id && (
                    <span className="text-xs opacity-50">(you)</span>
                  )}
                </p>

                <p
                  className={`text-xs capitalize ${
                    p.role === 'lecturer' ? 'text-gray-400' : 'text-gray-400'
                  }`}
                >
                  {p.role}
                </p>
              </div>
            </div>

            {user?.role === 'lecturer' && p.role === 'student' && (
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => toggleDrawPermission(p.id, !p.canDraw)}
                  className={`text-xs px-2 py-0.5 rounded transition ${
                    p.canDraw
                      ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={p.canDraw ? 'Revoke draw' : 'Allow draw'}
                >
                  ✏️
                </button>

                <button
                  onClick={() => handleKick(p)}
                  className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition"
                  title="Kick"
                >
                  👢
                </button>

                <button
                  onClick={() => handleBan(p)}
                  className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600 hover:bg-red-200 transition"
                  title="Ban"
                >
                  🚫
                </button>
              </div>
            )}

            {p.role === 'student' &&
              !p.canDraw &&
              p.id !== user?.id &&
              user?.role === 'student' && (
                <span className="text-xs text-gray-300 shrink-0">
                  read-only
                </span>
              )}

            {p.id === user?.id && user?.role === 'student' && (
              <span
                className={`text-xs shrink-0 ${
                  p.canDraw ? 'text-indigo-500' : 'text-gray-400'
                }`}
              >
                {p.canDraw ? '✏️ can draw' : '👁 view only'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const ChatPanel = (
    <div className="flex flex-col h-full relative">
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
        <h2 className="font-semibold text-sm">Chat</h2>
        <button
          onClick={handleClosePanel}
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
          <p className="text-center text-gray-400 text-xs mt-4">
            No messages yet
          </p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.user.id === user?.id ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs text-gray-400">{msg.user.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${
                  msg.user.role === 'lecturer'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {msg.user.role}
              </span>
            </div>

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

  const isPanelOpen = sidePanel !== null || sidePanelClosing;


  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {(!gateChecked || !session) && (
  <div className="fixed inset-0 z-[9999] bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-500 text-sm">Loading session...</p>
    </div>
  </div>
)}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/courses" className="font-bold tracking-tight shrink-0">
            LECTRA
          </Link>

          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500 truncate">
            {session?.title ?? 'Loading session...'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              connected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />

          <button
            onClick={toggleMute}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              voiceMuted
                ? 'bg-red-100 text-red-600'
                : voiceConnected
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {voiceMuted ? '🔇 Muted' : voiceConnected ? '🎙️ Live' : '🎙️ ...'}
          </button>

          {voiceConnected && !voiceMuted && (
            <div className="flex items-end gap-0.5 h-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-sm transition-all duration-75"
                  style={{
                    height: `${Math.max(2, audioLevel > i / 8 ? 14 : 3)}px`,
                    backgroundColor:
                      i < 5 ? '#22c55e' : i < 7 ? '#f59e0b' : '#ef4444',
                    opacity: audioLevel > i / 8 ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          )}

          <Link
            href={`/session/${id}/playground`}
            className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-200 transition"
          >
            Playground
          </Link>

          <button
            onClick={() =>
              sidePanel === 'participants'
                ? handleClosePanel()
                : handleOpenPanel('participants')
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition relative ${
              sidePanel === 'participants'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👥 {participants.length}
          </button>

          <button
            onClick={() =>
              sidePanel === 'chat' ? handleClosePanel() : handleOpenPanel('chat')
            }
            className="relative bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
          >
            {sidePanel === 'chat' ? 'Hide Chat' : 'Chat'}

            {sidePanel !== 'chat' && unreadCount > 0 && (
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

      <div className="bg-white border-b px-4 py-2 flex items-center gap-3 shrink-0 overflow-x-auto">
        {user?.role === 'student' && (
          <span
            className={`text-xs shrink-0 px-2 py-1 rounded-lg ${
              canDraw
                ? 'bg-indigo-50 text-indigo-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {canDraw ? '✏️ Drawing enabled' : '👁 View only'}
          </span>
        )}

        <div
          className={`flex items-center gap-1.5 ${
            !canDraw && user?.role === 'student'
              ? 'opacity-30 pointer-events-none'
              : ''
          }`}
        >
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className={`w-5 h-5 rounded-full border-2 transition shrink-0 ${
                activeColor === color && !erasing
                  ? 'border-black scale-110'
                  : 'border-gray-200'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div
          className={`w-px h-5 bg-gray-200 shrink-0 ${
            !canDraw && user?.role === 'student' ? 'opacity-30' : ''
          }`}
        />

        <div
          className={`flex items-center gap-2 shrink-0 ${
            !canDraw && user?.role === 'student'
              ? 'opacity-30 pointer-events-none'
              : ''
          }`}
        >
          <span className="text-xs text-gray-400">Size</span>

          {[2, 4, 8, 16].map((size) => (
            <button
              key={size}
              onClick={() => handleSizeChange(size)}
              className={`rounded-full bg-black transition shrink-0 ${
                brushSize === size
                  ? 'opacity-100 ring-2 ring-black ring-offset-1'
                  : 'opacity-30'
              }`}
              style={{ width: size + 6, height: size + 6 }}
            />
          ))}
        </div>

        <div
          className={`w-px h-5 bg-gray-200 shrink-0 ${
            !canDraw && user?.role === 'student' ? 'opacity-30' : ''
          }`}
        />

        <button
          onClick={handleEraserToggle}
          disabled={!canDraw && user?.role === 'student'}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
            erasing
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${
            !canDraw && user?.role === 'student'
              ? 'opacity-30 cursor-not-allowed'
              : ''
          }`}
        >
          Eraser
        </button>

        <button
          onClick={clearCanvas}
          disabled={!canDraw && user?.role === 'student'}
          className={`px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition shrink-0 ${
            !canDraw && user?.role === 'student'
              ? 'opacity-30 cursor-not-allowed'
              : ''
          }`}
        >
          Clear
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-hidden p-3">
          <div
            ref={containerRef}
            className="bg-gray-100 rounded-xl shadow border w-full h-full overflow-hidden relative"
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        {isPanelOpen && (
          <div className="hidden md:flex w-72 bg-white border-l flex-col shrink-0">
            {sidePanel === 'chat' ||
            (sidePanelClosing && sidePanel === null)
              ? ChatPanel
              : ParticipantsPanel}
          </div>
        )}

        {isPanelOpen && (
          <div
            className={`md:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-2xl shadow-2xl ${
              sidePanelClosing ? 'animate-slide-down' : 'animate-slide-up'
            }`}
            style={{ height: '60vh' }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {sidePanel === 'chat' ? ChatPanel : ParticipantsPanel}
          </div>
        )}

        {isPanelOpen && (
          <div
            className={`md:hidden fixed inset-0 z-40 bg-black/20 ${
              sidePanelClosing ? 'animate-fade-out' : 'animate-fade-in'
            }`}
            onClick={handleClosePanel}
          />
        )}

        {sidePanel !== 'chat' && latestMsg && isMobile && (
          <div
            onClick={() => handleOpenPanel('chat')}
            className="md:hidden fixed bottom-4 inset-x-4 z-30 bg-black text-white rounded-2xl px-4 py-3 shadow-xl cursor-pointer animate-slide-up"
          >
            <p className="text-xs truncate">{latestMsg}</p>

            {unreadCount > 1 && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {unreadCount} new messages
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
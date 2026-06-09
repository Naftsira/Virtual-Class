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

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${
        active ? 'bg-black' : 'bg-[#b8b8b8]'
      }`}
    />
  );
}

function ActionButton({
  children,
  active = false,
  danger = false,
  disabled = false,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`whitespace-nowrap px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'bg-black text-white hover:opacity-90'
          : active
          ? 'bg-black text-white'
          : 'bg-[#eeeeee] text-black hover:bg-[#dedede]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function ActionLink({
  href,
  children,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`whitespace-nowrap bg-[#eeeeee] px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-black transition hover:bg-[#dedede] ${className}`}
    >
      {children}
    </Link>
  );
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();

  const { user, loading: authLoading } = useAuth();

  const [gateChecked, setGateChecked] = useState(false);
  const [input, setInput] = useState('');
  const [ending, setEnding] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
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

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

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

        if (sessionPassed) {
          setSession(currentSession);
          setGateChecked(true);
          return;
        }

        if (coursePassed) {
          sessionStorage.setItem(
            `gate_passed_session_${currentSession.id}`,
            '1'
          );

          setSession(currentSession);
          setGateChecked(true);
          return;
        }

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
  }, [id, pathname, router, user, authLoading]);

  useEffect(() => {
    if (!canDraw && !erasing) {
      // useWhiteboard already receives canDraw
    }
  }, [canDraw, erasing]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);

    check();
    window.addEventListener('resize', check);

    return () => window.removeEventListener('resize', check);
  }, []);

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

  useEffect(() => {
    if (sidePanel !== 'chat') return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [sidePanel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  };

  const handleClosePanel = () => {
    setSidePanelClosing(true);

    setTimeout(() => {
      setSidePanel(null);
      setSidePanelClosing(false);
    }, 240);
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

  const isPanelOpen = sidePanel !== null || sidePanelClosing;
  const studentCantDraw = user?.role === 'student' && !canDraw;

  const ParticipantsPanel = (
  <div className="flex h-full w-full min-h-0 flex-col bg-white">
    <div className="shrink-0 px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#777777]">
            Live Room
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-black">
            Participants
          </h2>

          <p className="mt-1 text-xs font-bold text-[#777777]">
            {participants.length} people currently present
          </p>
        </div>

        <button
          type="button"
          onClick={handleClosePanel}
          className="shrink-0 bg-[#eeeeee] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-[#dedede]"
        >
          Close
        </button>
      </div>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      {participants.length === 0 ? (
        <div className="bg-[#f3f3f3] px-5 py-10 text-center">
          <p className="text-xs font-bold text-[#777777]">
            No participants yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {participants.map((p) => {
            const isSelf = p.id === user?.id;
            const isLecturer = p.role === 'lecturer';

            const initials = p.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={p.id}
                className={`px-4 py-4 ${
                  isLecturer ? 'bg-black text-white' : 'bg-[#f3f3f3] text-black'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center text-xs font-black uppercase tracking-[-0.02em] ${
                      isLecturer
                        ? 'bg-white text-black'
                        : 'bg-white text-black'
                    }`}
                  >
                    {initials || '?'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-black tracking-[-0.02em] ${
                            isLecturer ? 'text-white' : 'text-black'
                          }`}
                        >
                          {p.name}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                              isLecturer ? 'text-white/45' : 'text-[#777777]'
                            }`}
                          >
                            {p.role}
                          </span>

                          {isSelf && (
                            <span
                              className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                                isLecturer
                                  ? 'bg-white/10 text-white/65'
                                  : 'bg-white text-[#777777]'
                              }`}
                            >
                              You
                            </span>
                          )}
                        </div>
                      </div>

                      {p.role === 'student' && (
                        <span
                          className={`shrink-0 px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                            p.canDraw
                              ? isLecturer
                                ? 'bg-white text-black'
                                : 'bg-black text-white'
                              : isLecturer
                              ? 'bg-white/10 text-white/55'
                              : 'bg-white text-[#777777]'
                          }`}
                        >
                          {p.canDraw ? 'Can Draw' : 'View Only'}
                        </span>
                      )}
                    </div>

                    {user?.role === 'lecturer' && p.role === 'student' && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDrawPermission(p.id, !p.canDraw)}
                          className="bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-[#e8e8e8]"
                        >
                          {p.canDraw ? 'Revoke Draw' : 'Allow Draw'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleKick(p)}
                          className="bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-[#e8e8e8]"
                        >
                          Kick
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBan(p)}
                          className="col-span-2 bg-[#2a2a2a] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90"
                        >
                          Ban from Session
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

  const ChatPanel = (
    <div className="relative flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 px-4 py-4 md:px-5 md:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#777777]">
              Session Channel
            </p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-black">
              Chat
            </h2>
            <p className="mt-1 text-xs font-bold text-[#777777]">
              {messages.length} messages
            </p>
          </div>

          <button
            type="button"
            onClick={handleClosePanel}
            className="shrink-0 bg-[#eeeeee] px-3 py-2 text-xs font-black text-black transition hover:bg-[#dedede]"
          >
            Close
          </button>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3 md:px-4 md:pb-4"
      >
        {messages.length === 0 && (
          <div className="bg-[#f3f3f3] px-4 py-10 text-center">
            <p className="text-xs font-bold text-[#777777]">No messages yet.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.user.id === user?.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
            >
              <div className="mb-1 flex max-w-full items-center gap-2">
                <span className="truncate text-[10px] font-bold uppercase tracking-widest text-[#777777]">
                  {msg.user.name}
                </span>
                <span className="shrink-0 bg-[#eeeeee] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#777777]">
                  {msg.user.role}
                </span>
              </div>

              <div
                className={`max-w-[78vw] px-4 py-3 text-sm font-medium leading-6 md:max-w-[230px] ${
                  isMine ? 'bg-black text-white' : 'bg-[#f3f3f3] text-black'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {showScrollBtn && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-20 right-4 bg-black px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
        >
          Latest
        </button>
      )}

      <div className="shrink-0 bg-white px-3 py-3 md:px-4 md:py-4">
        <div className="flex gap-2 bg-[#f3f3f3] p-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSend();
  }
}}
            placeholder="Type a message..."
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-medium text-black outline-none placeholder:text-[#999999]"
          />

          <button
            type="button"
            onClick={handleSend}
            className="shrink-0 bg-black px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#eeeeee] text-black">
      {(!gateChecked || !session) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#eeeeee]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#777777]">
              Loading session
            </p>
          </div>
        </div>
      )}

      <header className="shrink-0 p-3 md:p-4">
        <div className="bg-white px-3 py-3 md:px-4 md:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <Link href="/courses" className="shrink-0 text-sm font-black tracking-tight">
                  LECTRA
                </Link>

                <span className="text-[#c7c7c7]">/</span>

                <p className="min-w-0 truncate text-sm font-black tracking-[-0.02em]">
                  {session?.title ?? 'Loading session...'}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-2">
                  <StatusDot active={connected} />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#777777]">
                    {connected ? 'Connected' : 'Offline'}
                  </span>
                </span>

                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#777777]">
                  {user?.role ?? 'User'}
                </span>

                {user?.role === 'student' && (
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#777777]">
                    {canDraw ? 'Can draw' : 'View only'}
                  </span>
                )}
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 overflow-x-auto md:flex">
              <ActionButton onClick={toggleMute} active={voiceConnected && !voiceMuted}>
                {voiceMuted ? 'Muted' : voiceConnected ? 'Voice Live' : 'Voice'}
              </ActionButton>

              {voiceConnected && !voiceMuted && (
                <div className="flex h-8 items-end gap-0.5 bg-[#f3f3f3] px-2 py-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-black transition-all duration-75"
                      style={{
                        height: `${Math.max(3, audioLevel > i / 8 ? 18 : 5)}px`,
                        opacity: audioLevel > i / 8 ? 1 : 0.25,
                      }}
                    />
                  ))}
                </div>
              )}

              <ActionButton
                active={sidePanel === 'participants'}
                onClick={() =>
                  sidePanel === 'participants'
                    ? handleClosePanel()
                    : handleOpenPanel('participants')
                }
              >
                People {participants.length}
              </ActionButton>

              <ActionButton
                active={sidePanel === 'chat'}
                onClick={() =>
                  sidePanel === 'chat' ? handleClosePanel() : handleOpenPanel('chat')
                }
              >
                Chat{sidePanel !== 'chat' && unreadCount > 0 ? ` ${unreadCount > 9 ? '9+' : unreadCount}` : ''}
              </ActionButton>

              <ActionLink href={`/session/${id}/playground`}>
                Playground
              </ActionLink>

              {user?.role === 'lecturer' && (
                <ActionButton
                  danger
                  disabled={ending || !session}
                  onClick={handleEndSession}
                >
                  {ending ? 'Ending' : 'End'}
                </ActionButton>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 md:hidden">
            <ActionButton
              className="w-full px-2"
              onClick={toggleMute}
              active={voiceConnected && !voiceMuted}
            >
              {voiceMuted ? 'Muted' : 'Voice'}
            </ActionButton>

            <ActionButton
              className="w-full px-2"
              active={sidePanel === 'participants'}
              onClick={() =>
                sidePanel === 'participants'
                  ? handleClosePanel()
                  : handleOpenPanel('participants')
              }
            >
              People
            </ActionButton>

            <ActionButton
              className="w-full px-2"
              active={sidePanel === 'chat'}
              onClick={() =>
                sidePanel === 'chat' ? handleClosePanel() : handleOpenPanel('chat')
              }
            >
              Chat{sidePanel !== 'chat' && unreadCount > 0 ? ` ${unreadCount > 9 ? '9+' : unreadCount}` : ''}
            </ActionButton>

            {user?.role === 'lecturer' ? (
              <ActionButton
                className="w-full px-2"
                danger
                disabled={ending || !session}
                onClick={handleEndSession}
              >
                {ending ? 'Ending' : 'End'}
              </ActionButton>
            ) : (
              <ActionLink
                href={`/session/${id}/playground`}
                className="w-full px-2"
              >
                Play
              </ActionLink>
            )}
          </div>
        </div>
      </header>

      <div className="shrink-0 px-3 pb-3 md:px-4 md:pb-4">
        <div className="flex h-12 items-center gap-3 overflow-x-auto bg-white px-3 md:h-auto md:px-4 md:py-3">
          <div
            className={`flex shrink-0 items-center gap-2 ${
              studentCantDraw ? 'pointer-events-none opacity-30' : ''
            }`}
          >
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorChange(color)}
                className={`h-6 w-6 shrink-0 rounded-full transition ${
                  activeColor === color && !erasing
                    ? 'ring-2 ring-black ring-offset-2'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="h-6 w-px shrink-0 bg-[#dedede]" />

          <div
            className={`flex shrink-0 items-center gap-3 ${
              studentCantDraw ? 'pointer-events-none opacity-30' : ''
            }`}
          >
            <span className="hidden text-[10px] font-black uppercase tracking-[0.18em] text-[#777777] sm:inline">
              Size
            </span>

            {[2, 4, 8, 16].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleSizeChange(size)}
                className={`rounded-full bg-black transition ${
                  brushSize === size ? 'opacity-100 ring-2 ring-black ring-offset-2' : 'opacity-25'
                }`}
                style={{
                  width: size + 8,
                  height: size + 8,
                }}
              />
            ))}
          </div>

          <div className="h-6 w-px shrink-0 bg-[#dedede]" />

          <button
            type="button"
            onClick={handleEraserToggle}
            disabled={studentCantDraw}
            className={`shrink-0 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-30 ${
              erasing ? 'bg-black text-white' : 'bg-[#eeeeee] text-black hover:bg-[#dedede]'
            }`}
          >
            Eraser
          </button>

          <button
            type="button"
            onClick={clearCanvas}
            disabled={studentCantDraw}
            className="shrink-0 bg-[#eeeeee] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black transition hover:bg-[#dedede] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Clear
          </button>

          <ActionLink
            href={`/session/${id}/playground`}
            className="ml-auto hidden shrink-0 md:inline-flex"
          >
            Playground
          </ActionLink>
        </div>
      </div>

      <main className="relative flex min-h-0 flex-1 overflow-hidden px-3 pb-3 md:px-4 md:pb-4">
        <section className="min-w-0 flex-1 overflow-hidden bg-red p-2 md:p-3">
          <div
            ref={containerRef}
            className="relative h-full min-h-0 w-full touch-none overflow-hidden"
          >
            <canvas ref={canvasRef} />

            {studentCantDraw && (
              <div className="pointer-events-none absolute bottom-3 left-3 bg-white/90 px-3 py-3 backdrop-blur md:bottom-4 md:left-4 md:px-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#777777]">
                  View only
                </p>
                <p className="mt-1 text-xs font-bold text-black">
                  Drawing permission is disabled.
                </p>
              </div>
            )}
          </div>
        </section>

        {isPanelOpen && (
          <aside className="ml-4 hidden w-[340px] shrink-0 overflow-hidden bg-white lg:flex">
            {sidePanel === 'chat' || (sidePanelClosing && sidePanel === null)
              ? ChatPanel
              : ParticipantsPanel}
          </aside>
        )}

        {isPanelOpen && (
          <div
            className={`fixed inset-x-3 bottom-3 z-50 flex h-[72dvh] flex-col overflow-hidden bg-white lg:hidden ${
              sidePanelClosing ? 'animate-slide-down' : 'animate-slide-up'
            }`}
          >
            <div className="flex shrink-0 justify-center pt-3">
              <div className="h-1 w-10 rounded-full bg-[#d5d5d5]" />
            </div>

            <div className="min-h-0 flex-1">
              {sidePanel === 'chat' ? ChatPanel : ParticipantsPanel}
            </div>
          </div>
        )}

        {isPanelOpen && (
          <div
            className={`fixed inset-0 z-40 bg-black/20 lg:hidden ${
              sidePanelClosing ? 'animate-fade-out' : 'animate-fade-in'
            }`}
            onClick={handleClosePanel}
          />
        )}

        {sidePanel !== 'chat' && latestMsg && isMobile && (
          <div
            onClick={() => handleOpenPanel('chat')}
            className="fixed inset-x-3 bottom-3 z-30 cursor-pointer bg-black px-4 py-4 text-white lg:hidden"
          >
            <p className="truncate text-xs font-bold">{latestMsg}</p>

            {unreadCount > 1 && (
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/45">
                {unreadCount} new messages
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
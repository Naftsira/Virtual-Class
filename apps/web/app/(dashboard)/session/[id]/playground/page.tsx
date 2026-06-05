'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Room, RoomEvent, RemoteParticipant, createLocalAudioTrack } from 'livekit-client';
import { useAuth } from '@/lib/store/auth';
import { getChatSocket } from '@/lib/socket';
import Link from 'next/link';

// Virtual world size
const WORLD_W = 3840;
const WORLD_H = 2160;
const TILE = 48;
const VIEWPORT_W = 1280;
const VIEWPORT_H = 720;
const PLAYER_SPEED = 3;
const PLAYER_R = 14;
const MAX_HEAR = 400;

// Colors
const C = {
  floor: '#c8a97a',
  floorAlt: '#c2a373',
  wall: '#7a5c3a',
  wallTop: '#9b7a52',
  desk: '#8B6914',
  deskTop: '#a07820',
  chair: '#5c3d1e',
  blackboard: '#2d4a2d',
  blackboardFrame: '#5c3d1e',
  locker: '#7a8c9e',
  lockerLine: '#5a6c7e',
  door: '#8B5E3C',
  doorFrame: '#5c3d1e',
  window: '#87ceeb',
  windowFrame: '#5c3d1e',
  rug: '#8B3A3A',
  plant: '#2d6e2d',
  plantPot: '#8B6914',
};

interface Rect { x: number; y: number; w: number; h: number; }
interface Player {
  x: number; y: number;
  tx: number; ty: number; // target for interpolation
  name: string;
  isSelf: boolean;
  color: string;
  audioLevel: number;
}

// Build collision map
const cols: Rect[] = [];
const COLS = Math.floor(WORLD_W / TILE);
const ROWS = Math.floor(WORLD_H / TILE);

function addCol(tx: number, ty: number, tw: number, th: number) {
  cols.push({ x: tx * TILE, y: ty * TILE, w: tw * TILE, h: th * TILE });
}

// Walls
addCol(0, 0, COLS, 2); // top wall
addCol(0, ROWS - 2, COLS, 2); // bottom wall
addCol(0, 0, 2, ROWS); // left wall
addCol(COLS - 2, 0, 2, ROWS); // right wall

// Desk rows — 6 columns x 5 rows
const deskStartX = 6;
const deskStartY = 8;
const deskSpacingX = 8;
const deskSpacingY = 7;
const deskCols = 6;
const deskRows = 5;
for (let r = 0; r < deskRows; r++) {
  for (let c = 0; c < deskCols; c++) {
    const tx = deskStartX + c * deskSpacingX;
    const ty = deskStartY + r * deskSpacingY;
    addCol(tx, ty, 3, 2);
  }
}

// Lecturer desk front center
addCol(Math.floor(COLS / 2) - 4, 3, 8, 3);

// Lockers left wall
for (let i = 0; i < 8; i++) addCol(2, 4 + i * 4, 2, 3);

// Collision check
function checkCol(nx: number, ny: number): boolean {
  const r = PLAYER_R;
  for (const c of cols) {
    if (nx + r > c.x && nx - r < c.x + c.w &&
        ny + r > c.y && ny - r < c.y + c.h) return true;
  }
  return false;
}

const PLAYER_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#14b8a6'];

function drawWorld(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
  // Floor
  for (let r = 2; r < ROWS - 2; r++) {
    for (let c = 2; c < COLS - 2; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? C.floor : C.floorAlt;
      ctx.fillRect(c * TILE - camX, r * TILE - camY, TILE, TILE);
    }
  }

  // Walls
  ctx.fillStyle = C.wall;
  ctx.fillRect(0 - camX, 0 - camY, WORLD_W, TILE * 2);
  ctx.fillRect(0 - camX, WORLD_H - TILE * 2 - camY, WORLD_W, TILE * 2);
  ctx.fillRect(0 - camX, 0 - camY, TILE * 2, WORLD_H);
  ctx.fillRect(WORLD_W - TILE * 2 - camX, 0 - camY, TILE * 2, WORLD_H);

  // Wall top trim
  ctx.fillStyle = C.wallTop;
  ctx.fillRect(TILE * 2 - camX, TILE * 2 - camY, WORLD_W - TILE * 4, TILE * 0.4);
  ctx.fillRect(TILE * 2 - camX, WORLD_H - TILE * 2 - camY, WORLD_W - TILE * 4, TILE * 0.4);

  // Windows top wall
  const winPositions = [8, 16, 24, 32, 40, 48, 56, 64, 72];
  winPositions.forEach(wx => {
    const px = wx * TILE - camX;
    const py = TILE * 0.3 - camY;
    ctx.fillStyle = C.windowFrame;
    ctx.fillRect(px, py, TILE * 2.5, TILE * 1.5);
    ctx.fillStyle = C.window;
    ctx.fillRect(px + 4, py + 4, TILE * 2.5 - 8, TILE * 1.5 - 8);
    // Window cross
    ctx.fillStyle = C.windowFrame;
    ctx.fillRect(px + TILE * 1.25, py + 4, 3, TILE * 1.5 - 8);
    ctx.fillRect(px + 4, py + TILE * 0.75, TILE * 2.5 - 8, 3);
  });

  // Door
  const doorX = (Math.floor(COLS / 2) - 2) * TILE - camX;
  const doorY = WORLD_H - TILE * 2 - camY;
  ctx.fillStyle = C.doorFrame;
  ctx.fillRect(doorX - 4, doorY, TILE * 4 + 8, TILE * 2);
  ctx.fillStyle = C.door;
  ctx.fillRect(doorX, doorY + 4, TILE * 4, TILE * 2 - 4);
  ctx.fillStyle = '#d4a96a';
  ctx.beginPath();
  ctx.arc(doorX + TILE * 3.3, doorY + TILE, 6, 0, Math.PI * 2);
  ctx.fill();

  // Blackboard front wall
  const bbX = (Math.floor(COLS / 2) - 8) * TILE - camX;
  const bbY = TILE * 2 - camY;
  ctx.fillStyle = C.blackboardFrame;
  ctx.fillRect(bbX - 6, bbY, TILE * 16 + 12, TILE * 4 + 8);
  ctx.fillStyle = C.blackboard;
  ctx.fillRect(bbX, bbY + 4, TILE * 16, TILE * 4);
  // Chalk lines
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(bbX + 20 + i * 60, bbY + 20);
    ctx.lineTo(bbX + 80 + i * 60, bbY + TILE * 2);
    ctx.stroke();
  }
  // Board text
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `${TILE * 0.6}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('LECTRA', bbX + TILE * 8, bbY + TILE * 2.5);

  // Lecturer desk
  const ldX = (Math.floor(COLS / 2) - 4) * TILE - camX;
  const ldY = 3 * TILE - camY;
  ctx.fillStyle = C.deskTop;
  ctx.fillRect(ldX, ldY, TILE * 8, TILE * 3);
  ctx.fillStyle = C.desk;
  ctx.fillRect(ldX, ldY + TILE * 2.5, TILE * 8, TILE * 0.5);
  ctx.fillRect(ldX, ldY, TILE * 0.4, TILE * 3);
  ctx.fillRect(ldX + TILE * 7.6, ldY, TILE * 0.4, TILE * 3);
  // Items on lecturer desk
  ctx.fillStyle = '#2d4a8a';
  ctx.fillRect(ldX + TILE * 2, ldY + TILE * 0.3, TILE * 1.5, TILE * 1);
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(ldX + TILE * 4, ldY + TILE * 0.2, TILE * 0.8, TILE * 1.2);

  // Student desks
  for (let r = 0; r < deskRows; r++) {
    for (let c = 0; c < deskCols; c++) {
      const tx = (deskStartX + c * deskSpacingX) * TILE - camX;
      const ty = (deskStartY + r * deskSpacingY) * TILE - camY;
      // Chair (behind desk)
      ctx.fillStyle = C.chair;
      ctx.fillRect(tx + TILE * 0.25, ty + TILE * 2.2, TILE * 2.5, TILE * 1.5);
      ctx.fillRect(tx + TILE * 0.25, ty + TILE * 2.2, TILE * 2.5, TILE * 0.3);
      // Chair legs
      [0.3, 2.2].forEach(cx => {
        ctx.fillRect(tx + TILE * cx, ty + TILE * 3.3, TILE * 0.3, TILE * 0.5);
      });
      // Desk surface
      ctx.fillStyle = C.deskTop;
      ctx.fillRect(tx, ty, TILE * 3, TILE * 2);
      ctx.fillStyle = C.desk;
      ctx.fillRect(tx, ty + TILE * 1.7, TILE * 3, TILE * 0.3);
      ctx.fillRect(tx, ty, TILE * 0.3, TILE * 2);
      ctx.fillRect(tx + TILE * 2.7, ty, TILE * 0.3, TILE * 2);
      // Random items on desks
      if ((r * deskCols + c) % 3 === 0) {
        ctx.fillStyle = '#4a90d9';
        ctx.fillRect(tx + TILE * 0.3, ty + TILE * 0.3, TILE * 0.8, TILE * 1);
      }
      if ((r * deskCols + c) % 2 === 0) {
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(tx + TILE * 1.5, ty + TILE * 0.4, TILE * 0.5, TILE * 0.8);
      }
    }
  }

  // Lockers left wall
  for (let i = 0; i < 8; i++) {
    const lx = TILE * 2 - camX;
    const ly = (4 + i * 4) * TILE - camY;
    ctx.fillStyle = C.locker;
    ctx.fillRect(lx, ly, TILE * 2, TILE * 3);
    ctx.fillStyle = C.lockerLine;
    ctx.fillRect(lx + TILE - 1, ly, 2, TILE * 3);
    ctx.fillRect(lx, ly + TILE * 1.5, TILE * 2, 2);
    // Handles
    [TILE * 0.4, TILE * 1.4].forEach(hx => {
      ctx.fillStyle = '#c0c0c0';
      ctx.beginPath();
      ctx.arc(lx + hx + TILE * 0.5, ly + TILE * 0.7, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lx + hx + TILE * 0.5, ly + TILE * 2.2, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Plants corners
  const plantPositions = [
    [3, 3], [COLS - 5, 3], [3, ROWS - 5], [COLS - 5, ROWS - 5],
    [3, Math.floor(ROWS / 2)], [COLS - 5, Math.floor(ROWS / 2)],
  ];
  plantPositions.forEach(([px, py]) => {
    const wx = px * TILE - camX;
    const wy = py * TILE - camY;
    ctx.fillStyle = C.plantPot;
    ctx.fillRect(wx + TILE * 0.2, wy + TILE * 0.6, TILE * 0.6, TILE * 0.4);
    ctx.fillStyle = C.plant;
    ctx.beginPath();
    ctx.arc(wx + TILE * 0.5, wy + TILE * 0.4, TILE * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(wx + TILE * 0.3, wy + TILE * 0.55, TILE * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(wx + TILE * 0.7, wy + TILE * 0.55, TILE * 0.25, 0, Math.PI * 2);
    ctx.fill();
  });

  // Rug under lecturer area
  ctx.fillStyle = C.rug;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(
    (Math.floor(COLS / 2) - 10) * TILE - camX,
    TILE * 2 - camY,
    TILE * 20,
    TILE * 8
  );
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, camX: number, camY: number) {
  const sx = p.x - camX;
  const sy = p.y - camY;

  // Shadow
  ctx.beginPath();
  ctx.ellipse(sx, sy + PLAYER_R - 2, PLAYER_R * 0.8, PLAYER_R * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();

  // Glow if speaking
  if (p.audioLevel > 0.05) {
    ctx.beginPath();
    ctx.arc(sx, sy, PLAYER_R + 4 + p.audioLevel * 8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(99,102,241,${p.audioLevel * 0.4})`;
    ctx.fill();
  }

  // Orb
  const grad = ctx.createRadialGradient(sx - 4, sy - 4, 2, sx, sy, PLAYER_R);
  grad.addColorStop(0, lightenColor(p.color, 40));
  grad.addColorStop(1, p.color);
  ctx.beginPath();
  ctx.arc(sx, sy, PLAYER_R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Shine
  ctx.beginPath();
  ctx.arc(sx - 4, sy - 4, PLAYER_R * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();

  // Name
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(sx - 30, sy + PLAYER_R + 4, 60, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(p.name.split(' ')[0], sx, sy + PLAYER_R + 5);
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

export default function PlaygroundPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roomRef = useRef<Room | null>(null);
  const playersRef = useRef<Map<string, Player>>(new Map());
  const keysRef = useRef<Set<string>>(new Set());
  const camRef = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setShowTutorial(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const updateAudio = useCallback(() => {
    if (!roomRef.current) return;
    const self = playersRef.current.get(user?.id || '');
    if (!self) return;

    roomRef.current.remoteParticipants.forEach((participant) => {
      const p = playersRef.current.get(participant.identity);
      if (!p) return;
      const dx = p.x - self.x;
      const dy = p.y - self.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vol = Math.max(0, 1 - dist / MAX_HEAR);
      participant.audioTrackPublications.forEach((pub) => {
        if (pub.track) (pub.track as any).setVolume?.(vol);
      });
    });
  }, [user]);

  const broadcastPos = useCallback(() => {
    if (!roomRef.current || !user) return;
    if (roomRef.current.state !== "connected") return;
    const p = playersRef.current.get(user.id);
    if (!p) return;
    try {
      roomRef.current.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: 'pos', x: p.x, y: p.y })),
        { reliable: false }
      );
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const startColor = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
    const startX = WORLD_W / 2;
    const startY = WORLD_H / 2 + 200;

    playersRef.current.set(user.id, {
      x: startX, y: startY,
      tx: startX, ty: startY,
      name: user.name,
      isSelf: true,
      color: startColor,
      audioLevel: 0,
    });

    camRef.current = {
      x: startX - VIEWPORT_W / 2,
      y: startY - VIEWPORT_H / 2,
    };

    const connect = async () => {
      try {
        // Check session masih exist
        const cookieToken = document.cookie.match(/token=([^;]+)/)?.[1] || '';
        const sessionCheck = await fetch(`http://localhost:8000/api/sessions/${id}`, {
          headers: { Authorization: `Bearer ${cookieToken}`, Accept: 'application/json' },
        });
        if (!sessionCheck.ok) {
          router.push('/courses');
          return;
        }        
        const token = document.cookie.match(/token=([^;]+)/)?.[1] || '';
        const res = await fetch('http://localhost:3001/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ sessionId: id }),
        });
        const { token: lvToken, url } = await res.json();

        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
          const color = PLAYER_COLORS[playersRef.current.size % PLAYER_COLORS.length];
          const rx = WORLD_W / 2 + (Math.random() - 0.5) * 300;
          const ry = WORLD_H / 2 + (Math.random() - 0.5) * 200;
          playersRef.current.set(p.identity, {
            x: rx, y: ry, tx: rx, ty: ry,
            name: p.name || p.identity,
            isSelf: false,
            color,
            audioLevel: 0,
          });
        });

        room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
          playersRef.current.delete(p.identity);
        });

        room.on(RoomEvent.DataReceived, (data: Uint8Array, p?: RemoteParticipant) => {
          if (!p) return;
          try {
            const msg = JSON.parse(new TextDecoder().decode(data));
            if (msg.type === 'pos') {
              const player = playersRef.current.get(p.identity);
              if (player) { player.tx = msg.x; player.ty = msg.y; }
            }
          } catch {}
        });

        room.remoteParticipants.forEach((p, id) => {
          const color = PLAYER_COLORS[playersRef.current.size % PLAYER_COLORS.length];
          const rx = WORLD_W / 2 + (Math.random() - 0.5) * 300;
          const ry = WORLD_H / 2 + (Math.random() - 0.5) * 200;
          playersRef.current.set(id, {
            x: rx, y: ry, tx: rx, ty: ry,
            name: p.name || id,
            isSelf: false,
            color,
            audioLevel: 0,
          });
        });

        await room.connect(url, lvToken);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Audio track + analyser
        const audioTrack = await createLocalAudioTrack();
        await room.localParticipant.publishTrack(audioTrack);

        const stream = new MediaStream([audioTrack.mediaStreamTrack]);
        const actx = new AudioContext();
        const source = actx.createMediaStreamSource(stream);
        const analyser = actx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioCtxRef.current = actx;
        analyserRef.current = analyser;

        setConnected(true);
      } catch (e) {
        console.error(e);
        setError('Failed to connect.');
      }
    };

    const chatSocket = getChatSocket();
    chatSocket.on("session:ended", () => router.push("/courses"));

    connect();

    return () => {
      cancelAnimationFrame(animRef.current);
      roomRef.current?.disconnect();
      audioCtxRef.current?.close();
    };
  }, [user, id]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let frameCount = 0;

    const loop = () => {
      frameCount++;
      const self = user ? playersRef.current.get(user.id) : null;

      // Move self
      if (self) {
        let nx = self.x;
        let ny = self.y;
        const keys = keysRef.current;

        if (keys.has('w') || keys.has('arrowup')) ny -= PLAYER_SPEED;
        if (keys.has('s') || keys.has('arrowdown')) ny += PLAYER_SPEED;
        if (keys.has('a') || keys.has('arrowleft')) nx -= PLAYER_SPEED;
        if (keys.has('d') || keys.has('arrowright')) nx += PLAYER_SPEED;

        nx = Math.max(TILE * 2 + PLAYER_R, Math.min(WORLD_W - TILE * 2 - PLAYER_R, nx));
        ny = Math.max(TILE * 2 + PLAYER_R, Math.min(WORLD_H - TILE * 2 - PLAYER_R, ny));

        if (!checkCol(nx, self.y)) self.x = nx;
        if (!checkCol(self.x, ny)) self.y = ny;

        self.tx = self.x;
        self.ty = self.y;

        // Camera follow
        camRef.current.x += (self.x - VIEWPORT_W / 2 - camRef.current.x) * 0.1;
        camRef.current.y += (self.y - VIEWPORT_H / 2 - camRef.current.y) * 0.1;
        camRef.current.x = Math.max(0, Math.min(WORLD_W - VIEWPORT_W, camRef.current.x));
        camRef.current.y = Math.max(0, Math.min(WORLD_H - VIEWPORT_H, camRef.current.y));

        if (frameCount % 3 === 0) {
          broadcastPos();
          updateAudio();
        }
      }

      // Interpolate remote players
      playersRef.current.forEach((p) => {
        if (!p.isSelf) {
          p.x += (p.tx - p.x) * 0.15;
          p.y += (p.ty - p.y) * 0.15;
        }
      });

      // Audio level
      if (analyserRef.current) {
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length / 255;
        if (self) self.audioLevel = avg;
        if (frameCount % 3 === 0) setAudioLevel(avg);
      }

      // Draw
      const cam = camRef.current;
      ctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);
      drawWorld(ctx, cam.x, cam.y);

      // Draw hearing radius
      if (self) {
        ctx.beginPath();
        ctx.arc(self.x - cam.x, self.y - cam.y, MAX_HEAR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99,102,241,0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw players (sort by y for depth)
      const sorted = Array.from(playersRef.current.values()).sort((a, b) => a.y - b.y);
      sorted.forEach((p) => drawPlayer(ctx, p, cam.x, cam.y));

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [user, broadcastPos, updateAudio]);

  // Keyboard
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  const toggleMute = async () => {
    if (!roomRef.current) return;
    const enabled = roomRef.current.localParticipant.isMicrophoneEnabled;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!enabled);
    setMuted(enabled);
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Navbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/session/${id}`} className="text-white font-bold tracking-tight text-sm">LECTRA</Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-300 text-xs">Playground</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className="text-xs text-gray-400">{connected ? 'Connected' : 'Connecting...'}</span>
          </div>
          <button
            onClick={toggleMute}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              muted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            {muted ? '🔇 Muted' : '🎙️ Live'}
          </button>
          <Link href={`/session/${id}`} className="text-gray-400 hover:text-white text-xs">← Back</Link>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center bg-gray-900 relative overflow-hidden">
        {error && <p className="absolute text-red-400 text-sm z-10">{error}</p>}

        <canvas
          ref={canvasRef}
          width={VIEWPORT_W}
          height={VIEWPORT_H}
          className="rounded-xl shadow-2xl"
          style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
        />

        {/* Tutorial overlay */}
        {showTutorial && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/80 text-white rounded-2xl p-5 w-52 animate-fade-in">
            <p className="font-bold text-sm mb-3">🎮 Controls</p>
            <div className="space-y-1.5 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <kbd className="bg-gray-700 px-2 py-0.5 rounded text-white font-mono">W</kbd>
                <span>Move up</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-gray-700 px-2 py-0.5 rounded text-white font-mono">S</kbd>
                <span>Move down</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-gray-700 px-2 py-0.5 rounded text-white font-mono">A</kbd>
                <span>Move left</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-gray-700 px-2 py-0.5 rounded text-white font-mono">D</kbd>
                <span>Move right</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Closing in 3s...</p>
          </div>
        )}

        {/* Audio meter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-4 py-2">
          <span className="text-xs text-gray-400">🎙️</span>
          <div className="flex gap-0.5 items-end h-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 rounded-sm transition-all duration-75"
                style={{
                  height: `${Math.max(2, audioLevel > i / 12 ? 16 : 4)}px`,
                  backgroundColor: i < 8 ? '#22c55e' : i < 10 ? '#f59e0b' : '#ef4444',
                  opacity: audioLevel > i / 12 ? 1 : 0.3,
                }}
              />
            ))}
          </div>
          {muted && <span className="text-xs text-red-400">Muted</span>}
        </div>
      </div>
    </div>
  );
}

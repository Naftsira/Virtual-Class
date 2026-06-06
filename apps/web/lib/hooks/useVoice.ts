import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, createLocalAudioTrack } from 'livekit-client';
import Cookies from 'js-cookie';

export function useVoice(sessionId: string) {
  const roomRef = useRef<Room | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>(0);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [speakers, setSpeakers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const connect = async () => {
      try {
        const token = Cookies.get('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_REALTIME_URL}/livekit/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId: `voice:${sessionId}` }),
        });
        const { token: lvToken, url } = await res.json();

        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          setSpeakers(new Set(speakers.map((s) => s.identity)));
        });

        await room.connect(url, lvToken);
        await new Promise((r) => setTimeout(r, 500));

        const audioTrack = await createLocalAudioTrack();
        await room.localParticipant.publishTrack(audioTrack);

        // Setup analyser
        const stream = new MediaStream([audioTrack.mediaStreamTrack]);
        const actx = new AudioContext();
        const source = actx.createMediaStreamSource(stream);
        const analyser = actx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        // Audio level loop
        const measureLevel = () => {
          if (!analyserRef.current) return;
          const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length / 255;
          setAudioLevel(avg);
          animRef.current = requestAnimationFrame(measureLevel);
        };
        animRef.current = requestAnimationFrame(measureLevel);

        setConnected(true);
      } catch (e) {
        console.error('Voice connect failed:', e);
      }
    };

    connect();

    return () => {
      cancelAnimationFrame(animRef.current);
      roomRef.current?.disconnect();
    };
  }, [sessionId]);

  const toggleMute = async () => {
    if (!roomRef.current) return;
    const enabled = roomRef.current.localParticipant.isMicrophoneEnabled;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!enabled);
    setMuted(enabled);
  };

  return { connected, muted, toggleMute, speakers, audioLevel };
}

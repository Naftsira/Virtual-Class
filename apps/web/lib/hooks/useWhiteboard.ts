import { useEffect, useRef } from 'react';
import { getWhiteboardSocket as getSocket } from '../socket';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

function makeCircleCursor(size: number): string {
  const r = Math.max(size / 2, 4);
  const d = r * 2 + 4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${r + 2}" cy="${r + 2}" r="${r}" fill="rgba(255,255,255,0.25)" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/></svg>`;
  return `url("data:image/svg+xml;base64,${btoa(svg)}") ${r + 2} ${r + 2}, crosshair`;
}

export function useWhiteboard(
  sessionId: string,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const fabricRef = useRef<any>(null);
  const initRef = useRef(false);
  const erasingRef = useRef(false);
  const brushSizeRef = useRef(3);
  const brushColorRef = useRef('#000000');
  const remotePathsRef = useRef<Map<string, any>>(new Map());

  const getUpperCanvas = (): HTMLCanvasElement | null => {
    return containerRef.current?.querySelector('canvas.upper-canvas') || null;
  };

  const applyEraserCursor = (size: number) => {
    const el = getUpperCanvas();
    if (el) el.style.cursor = makeCircleCursor(size);
  };

  const resetCursor = () => {
    const el = getUpperCanvas();
    if (el) el.style.cursor = 'crosshair';
  };

  const getScale = () => {
    const container = containerRef.current;
    if (!container) return 1;
    const scaleX = container.clientWidth / CANVAS_WIDTH;
    const scaleY = container.clientHeight / CANVAS_HEIGHT;
    return Math.min(scaleX, scaleY);
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    if (initRef.current) return;
    initRef.current = true;

    const socket = getSocket();
    if (!socket.connected) socket.connect();
    const container = containerRef.current;
    const scale = getScale();

    import('fabric').then(({ Canvas, Path, PencilBrush }) => {
      // Canvas size = virtual size * scale
      const canvas = new Canvas(canvasRef.current!, {
        isDrawingMode: true,
        width: CANVAS_WIDTH * scale,
        height: CANVAS_HEIGHT * scale,
        backgroundColor: '#ffffff',
      });

      // Zoom fabric ke scale — koordinat tetap dalam virtual space
      canvas.setZoom(scale);

      const brush = new PencilBrush(canvas);
      brush.color = '#000000';
      brush.width = 3;
      canvas.freeDrawingBrush = brush;
      fabricRef.current = canvas;

      // Center canvas dalam container
      const centerCanvas = (s: number) => {
        const wrapperEl = container.querySelector('.canvas-container') as HTMLElement;
        if (!wrapperEl) return;
        const scaledW = CANVAS_WIDTH * s;
        const scaledH = CANVAS_HEIGHT * s;
        const offsetX = Math.max((container.clientWidth - scaledW) / 2, 0);
        const offsetY = Math.max((container.clientHeight - scaledH) / 2, 0);
        wrapperEl.style.position = 'absolute';
        wrapperEl.style.left = `${offsetX}px`;
        wrapperEl.style.top = `${offsetY}px`;
      };

      centerCanvas(scale);

      const resizeObserver = new ResizeObserver(() => {
        if (!fabricRef.current) return;
        const newScale = getScale();
        const newW = CANVAS_WIDTH * newScale;
        const newH = CANVAS_HEIGHT * newScale;
        fabricRef.current.setDimensions({ width: newW, height: newH });
        fabricRef.current.setZoom(newScale);
        fabricRef.current.renderAll();
        centerCanvas(newScale);
      });
      resizeObserver.observe(container);

      socket.emit('whiteboard:join', sessionId);

      socket.on('whiteboard:state', async (objects: any[]) => {
        for (const obj of objects) {
          const path = await Path.fromObject(obj);
          canvas.add(path);
        }
        canvas.renderAll();
      });

      let isDrawing = false;
      let currentPoints: number[] = [];

      canvas.on('mouse:down', () => { isDrawing = true; currentPoints = []; });

      canvas.on('mouse:move', (e: any) => {
        if (!isDrawing || !canvas.isDrawingMode) return;
        const pointer = canvas.getScenePoint(e.e);
        currentPoints.push(pointer.x, pointer.y);
        if (currentPoints.length % 6 === 0) {
          socket.emit('whiteboard:stroke', {
            sessionId,
            points: [...currentPoints],
            color: brushColorRef.current,
            width: brushSizeRef.current,
          });
        }
      });

      canvas.on('mouse:up', () => { isDrawing = false; currentPoints = []; });

      canvas.on('path:created', (e: any) => {
        socket.emit('whiteboard:draw', {
          sessionId,
          type: 'draw',
          payload: e.path.toJSON(),
        });
      });

      socket.on('whiteboard:stroke', (data: {
        userId: string;
        points: number[];
        color: string;
        width: number;
      }) => {
        if (data.points.length < 4) return;
        const pts = data.points;
        let d = `M ${pts[0]} ${pts[1]}`;
        for (let i = 2; i < pts.length; i += 2) {
          d += ` L ${pts[i]} ${pts[i + 1]}`;
        }
        const existing = remotePathsRef.current.get(data.userId);
        if (existing) canvas.remove(existing);
        Path.fromObject({
          type: 'path',
          path: d as any,
          stroke: data.color,
          strokeWidth: data.width,
          fill: null,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
        }).then((path: any) => {
          remotePathsRef.current.set(data.userId, path);
          canvas.add(path);
          canvas.renderAll();
        });
      });

      socket.on('whiteboard:draw', async (data: any) => {
        const temp = remotePathsRef.current.get(data.userId);
        if (temp) {
          canvas.remove(temp);
          remotePathsRef.current.delete(data.userId);
        }
        const path = await Path.fromObject(data.payload);
        canvas.add(path);
        canvas.renderAll();
      });

      socket.on('whiteboard:clear', () => {
        remotePathsRef.current.clear();
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
      });

      (canvasRef.current as any).__resizeObserver = resizeObserver;
    });

    return () => {
      // initRef reset handled by dispose
      socket.off('whiteboard:draw');
      socket.off('whiteboard:clear');
      socket.off('whiteboard:state');
      socket.off('whiteboard:stroke');
      if (canvasRef.current && (canvasRef.current as any).__resizeObserver) {
        (canvasRef.current as any).__resizeObserver.disconnect();
      }
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [sessionId]);

  const clearCanvas = () => {
    if (!fabricRef.current) return;
    fabricRef.current.clear();
    fabricRef.current.backgroundColor = '#ffffff';
    fabricRef.current.renderAll();
    getSocket().emit('whiteboard:clear', sessionId);
  };

  const setColor = (color: string) => {
    if (!fabricRef.current) return;
    erasingRef.current = false;
    brushColorRef.current = color;
    fabricRef.current.freeDrawingBrush.color = color;
    resetCursor();
  };

  const setWidth = (width: number) => {
    if (!fabricRef.current) return;
    brushSizeRef.current = width;
    fabricRef.current.freeDrawingBrush.width = width;
    if (erasingRef.current) applyEraserCursor(width);
  };

  const toggleEraser = (erasing: boolean, currentColor: string) => {
    if (!fabricRef.current) return;
    erasingRef.current = erasing;
    brushColorRef.current = erasing ? '#ffffff' : currentColor;
    fabricRef.current.freeDrawingBrush.color = erasing ? '#ffffff' : currentColor;
    if (erasing) {
      applyEraserCursor(brushSizeRef.current);
    } else {
      resetCursor();
    }
  };

  return { clearCanvas, setColor, setWidth, toggleEraser };
}

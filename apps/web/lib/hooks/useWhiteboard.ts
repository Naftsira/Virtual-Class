import { useEffect, useRef } from 'react';
import { getSocket } from '../socket';

function makeCircleCursor(size: number): string {
  const r = Math.max(size / 2, 4);
  const d = r * 2 + 4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${r + 2}" cy="${r + 2}" r="${r}" fill="rgba(255,255,255,0.25)" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/></svg>`;
  return `url("data:image/svg+xml;base64,${btoa(svg)}") ${r + 2} ${r + 2}, crosshair`;
}

export function useWhiteboard(
  sessionId: string,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLDivElement>
) {
  const fabricRef = useRef<any>(null);
  const initRef = useRef(false);
  const erasingRef = useRef(false);
  const brushSizeRef = useRef(3);

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

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    if (initRef.current) return;
    initRef.current = true;

    const socket = getSocket();
    const container = containerRef.current;

    import('fabric').then(({ Canvas, Path, PencilBrush }) => {
      const canvas = new Canvas(canvasRef.current!, {
        isDrawingMode: true,
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundColor: '#ffffff',
      });

      const brush = new PencilBrush(canvas);
      brush.color = '#000000';
      brush.width = 3;
      canvas.freeDrawingBrush = brush;
      fabricRef.current = canvas;

      const resizeObserver = new ResizeObserver(() => {
        if (!fabricRef.current) return;
        fabricRef.current.setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
        fabricRef.current.renderAll();
      });
      resizeObserver.observe(container);

      socket.emit('whiteboard:join', sessionId);

      canvas.on('path:created', (e: any) => {
        socket.emit('whiteboard:draw', {
          sessionId,
          type: 'draw',
          payload: e.path.toJSON(),
        });
      });

      socket.on('whiteboard:draw', async (data: any) => {
        const path = await Path.fromObject(data.payload);
        canvas.add(path);
        canvas.renderAll();
      });

      socket.on('whiteboard:clear', () => {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
      });

      (canvasRef.current as any).__resizeObserver = resizeObserver;
    });

    return () => {
      initRef.current = false;
      socket.off('whiteboard:draw');
      socket.off('whiteboard:clear');
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
    fabricRef.current.freeDrawingBrush.color = erasing ? '#ffffff' : currentColor;
    if (erasing) {
      applyEraserCursor(brushSizeRef.current);
    } else {
      resetCursor();
    }
  };

  return { clearCanvas, setColor, setWidth, toggleEraser };
}

import { useEffect, useRef } from 'react';
import { getSocket } from '../socket';

export function useWhiteboard(sessionId: string, canvasRef: React.RefObject<HTMLCanvasElement>) {
  const fabricRef = useRef<any>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const socket = getSocket();

    // Dynamically import fabric (client only)
    import('fabric').then(({ fabric }) => {
      const canvas = new fabric.Canvas(canvasRef.current!, {
        isDrawingMode: true,
        width: canvasRef.current!.parentElement?.clientWidth || 800,
        height: 500,
        backgroundColor: '#ffffff',
      });

      canvas.freeDrawingBrush.color = '#000000';
      canvas.freeDrawingBrush.width = 3;
      fabricRef.current = canvas;

      socket.emit('whiteboard:join', sessionId);

      // Kirim event ke semua user saat selesai draw
      canvas.on('path:created', (e: any) => {
        const pathData = e.path.toJSON();
        socket.emit('whiteboard:draw', {
          sessionId,
          type: 'draw',
          payload: pathData,
        });
      });

      // Terima draw dari user lain
      socket.on('whiteboard:draw', (data: any) => {
        import('fabric').then(({ fabric }) => {
          fabric.Path.fromObject(data.payload, (path: any) => {
            canvas.add(path);
            canvas.renderAll();
          });
        });
      });

      // Terima clear
      socket.on('whiteboard:clear', () => {
        canvas.clear();
        canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
      });
    });

    return () => {
      socket.off('whiteboard:draw');
      socket.off('whiteboard:clear');
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [sessionId, canvasRef]);

  const clearCanvas = () => {
    if (!fabricRef.current) return;
    fabricRef.current.clear();
    fabricRef.current.setBackgroundColor('#ffffff', fabricRef.current.renderAll.bind(fabricRef.current));
    getSocket().emit('whiteboard:clear', sessionId);
  };

  const setColor = (color: string) => {
    if (!fabricRef.current) return;
    fabricRef.current.freeDrawingBrush.color = color;
  };

  const setWidth = (width: number) => {
    if (!fabricRef.current) return;
    fabricRef.current.freeDrawingBrush.width = width;
  };

  const toggleEraser = (erasing: boolean) => {
    if (!fabricRef.current) return;
    fabricRef.current.freeDrawingBrush.color = erasing ? '#ffffff' : '#000000';
  };

  return { clearCanvas, setColor, setWidth, toggleEraser };
}

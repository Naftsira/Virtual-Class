'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWhiteboard } from '@/lib/hooks/useWhiteboard';
import { useAuth } from '@/lib/store/auth';
import Link from 'next/link';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ffffff'];

export default function WhiteboardPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { clearCanvas, setColor, setWidth, toggleEraser } = useWhiteboard(id, canvasRef);
  const [activeColor, setActiveColor] = useState('#000000');
  const [erasing, setErasing] = useState(false);
  const [brushSize, setBrushSize] = useState(3);

  const handleColorChange = (color: string) => {
    setActiveColor(color);
    setErasing(false);
    toggleEraser(false);
    setColor(color);
  };

  const handleEraserToggle = () => {
    const next = !erasing;
    setErasing(next);
    toggleEraser(next);
  };

  const handleSizeChange = (size: number) => {
    setBrushSize(size);
    setWidth(size);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/session/${id}`} className="font-bold tracking-tight">LECTRA</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Whiteboard</span>
        </div>
        <Link
          href={`/session/${id}`}
          className="text-sm text-gray-500 hover:text-black transition"
        >
          ← Back to Session
        </Link>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-6">
        {/* Colors */}
        <div className="flex items-center gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className={`w-6 h-6 rounded-full border-2 transition ${
                activeColor === color && !erasing ? 'border-black scale-110' : 'border-gray-200'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Brush size */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Size</span>
          {[2, 4, 8, 16].map((size) => (
            <button
              key={size}
              onClick={() => handleSizeChange(size)}
              className={`rounded-full bg-black transition ${
                brushSize === size ? 'opacity-100 ring-2 ring-black ring-offset-1' : 'opacity-30'
              }`}
              style={{ width: size + 8, height: size + 8 }}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Eraser */}
        <button
          onClick={handleEraserToggle}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
            erasing ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Eraser
        </button>

        {/* Clear */}
        <button
          onClick={clearCanvas}
          className="px-3 py-1 rounded-lg text-sm font-medium bg-red-50 text-red-500 hover:bg-red-100 transition"
        >
          Clear All
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-start justify-center p-6">
        <div className="bg-white rounded-2xl shadow border overflow-hidden w-full max-w-5xl">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}

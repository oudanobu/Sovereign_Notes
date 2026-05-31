/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  Palette, 
  Trash2, 
  RotateCcw, 
  Square, 
  Circle, 
  Eraser, 
  Paintbrush, 
  Download, 
  Upload,
  Sparkles
} from 'lucide-react';
import { bindTouchTap } from '../utils/touchUtils';

interface WhiteboardEditorProps {
  content: string; // JSON string of whiteboard shapes
  onSave: (newContent: string) => void;
  lang: 'zh' | 'en';
}

interface Point {
  x: number;
  y: number;
}

interface CanvasElement {
  id: string;
  type: 'pen' | 'rect' | 'circle' | 'eraser';
  points?: Point[]; // pen, eraser
  x?: number;       // rect, circle
  y?: number;       // rect, circle
  width?: number;   // rect, circle
  height?: number;  // rect, circle
  color: string;
  lineWidth: number;
}

const COLOR_PALETTE = [
  '#0f172a', // slate-900 (default)
  '#dc2626', // red-600
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#d97706', // amber-650
  '#7c3aed', // purple-600
  '#db2777', // pink-600
];

export function WhiteboardEditor({ content, onSave, lang }: WhiteboardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [tool, setTool] = useState<'pen' | 'rect' | 'circle' | 'eraser'>('pen');
  const [color, setColor] = useState('#0f172a');
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);

  // Parse incoming content string safely
  useEffect(() => {
    try {
      if (content && content.trim().startsWith('[')) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          setElements(parsed);
        } else {
          setElements([]);
        }
      } else {
        setElements([]);
      }
    } catch (e) {
      setElements([]);
    }
  }, [content]);

  // Adjust canvas size to match container fluidly
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ 
          width: Math.max(width, 400), 
          height: Math.max(height, 500) 
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Drawing logic loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and Redraw all elements
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw elements
    elements.forEach((ele) => {
      ctx.beginPath();
      ctx.strokeStyle = ele.color;
      ctx.lineWidth = ele.lineWidth;

      if (ele.type === 'pen' || ele.type === 'eraser') {
        if (!ele.points || ele.points.length === 0) return;
        
        ctx.moveTo(ele.points[0].x, ele.points[0].y);
        for (let i = 1; i < ele.points.length; i++) {
          ctx.lineTo(ele.points[i].x, ele.points[i].y);
        }
        ctx.stroke();
      } else if (ele.type === 'rect') {
        if (ele.x === undefined || ele.y === undefined || ele.width === undefined || ele.height === undefined) return;
        ctx.strokeRect(ele.x, ele.y, ele.width, ele.height);
      } else if (ele.type === 'circle') {
        if (ele.x === undefined || ele.y === undefined || ele.width === undefined || ele.height === undefined) return;
        const rx = ele.width / 2;
        const ry = ele.height / 2;
        const cx = ele.x + rx;
        const cy = ele.y + ry;
        ctx.beginPath();
        // Fallback for older browsers
        if (ctx.ellipse) {
          ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI);
        } else {
          ctx.arc(cx, cy, Math.abs(rx), 0, 2 * Math.PI);
        }
        ctx.stroke();
      }
    });
  }, [elements, canvasSize]);

  // Handle Pointer Start (Mouse or Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newElementId = 'shape_' + Math.random().toString(36).substring(2, 9);
    
    // Create new temporary active shape
    if (tool === 'pen' || tool === 'eraser') {
      const newEle: CanvasElement = {
        id: newElementId,
        type: tool,
        color: tool === 'eraser' ? '#ffffff' : color, // Eraser uses exact white background to overwrite
        lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth, // Eraser scale wider
        points: [{ x, y }]
      };
      setElements(prev => [...prev, newEle]);
    } else {
      // Shape
      const newEle: CanvasElement = {
        id: newElementId,
        type: tool,
        color: color,
        lineWidth: lineWidth,
        x,
        y,
        width: 0,
        height: 0
      };
      setElements(prev => [...prev, newEle]);
    }
  };

  // Handle Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setElements(prev => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const active = { ...copy[copy.length - 1] };

      if (active.type === 'pen' || active.type === 'eraser') {
        if (active.points) {
          active.points = [...active.points, { x, y }];
        }
      } else {
        if (active.x !== undefined && active.y !== undefined) {
          active.width = x - active.x;
          active.height = y - active.y;
        }
      }

      copy[copy.length - 1] = active;
      return copy;
    });
  };

  // Handle Pointer Up / Complete Current stroke
  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Post saved elements back
    onSave(JSON.stringify(elements));
  };

  const handleClear = () => {
    // Bypassed confirm() for Android WebView
    setElements([]);
    onSave('[]');
  };

  const handleUndo = () => {
    if (elements.length === 0) return;
    const newEles = elements.slice(0, -1);
    setElements(newEles);
    onSave(JSON.stringify(newEles));
  };

  // Export current paint drawing to standard Image
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Draw on a white base for solid export image download
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    const dataUrl = tempCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Sovereign_Whiteboard_Export_${new Date().toISOString().slice(0,10)}.png`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/40 rounded-2xl border border-gray-150 overflow-hidden relative select-none">
      
      {/* TOOLBAR */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        
        {/* Draw Tools Selector */}
        <div className="flex items-center space-x-1 border-r border-gray-200 pr-3">
          <button
            {...bindTouchTap(() => setTool('pen'))}
            className={`p-2.5 rounded-xl transition duration-150 flex items-center justify-center min-w-[40px] min-h-[40px] border ${
              tool === 'pen' ? 'bg-slate-900 border-slate-950 text-white shadow-sm' : 'bg-slate-50 border-gray-150 hover:bg-slate-100 text-slate-700'
            }`}
            title={lang === 'zh' ? '自由画笔' : 'Brush Tool'}
          >
            <Paintbrush className="w-4.5 h-4.5" />
          </button>
          
          <button
            {...bindTouchTap(() => setTool('rect'))}
            className={`p-2.5 rounded-xl transition duration-150 flex items-center justify-center min-w-[40px] min-h-[40px] border ${
              tool === 'rect' ? 'bg-slate-900 border-slate-950 text-white shadow-sm' : 'bg-slate-50 border-gray-150 hover:bg-slate-100 text-slate-700'
            }`}
            title={lang === 'zh' ? '矩形框' : 'Rectangle'}
          >
            <Square className="w-4.5 h-4.5" />
          </button>

          <button
            {...bindTouchTap(() => setTool('circle'))}
            className={`p-2.5 rounded-xl transition duration-150 flex items-center justify-center min-w-[40px] min-h-[40px] border ${
              tool === 'circle' ? 'bg-slate-900 border-slate-950 text-white shadow-sm' : 'bg-slate-50 border-gray-150 hover:bg-slate-100 text-slate-700'
            }`}
            title={lang === 'zh' ? '圆 / 椭圆' : 'Circle'}
          >
            <Circle className="w-4.5 h-4.5" />
          </button>

          <button
            {...bindTouchTap(() => setTool('eraser'))}
            className={`p-2.5 rounded-xl transition duration-150 flex items-center justify-center min-w-[40px] min-h-[40px] border ${
              tool === 'eraser' ? 'bg-slate-900 border-slate-950 text-white shadow-sm' : 'bg-slate-50 border-gray-150 hover:bg-slate-100 text-slate-700'
            }`}
            title={lang === 'zh' ? '橡皮擦' : 'Eraser'}
          >
            <Eraser className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Color Palette (Disabled in Eraser mode) */}
        <div className="flex items-center space-x-2 border-r border-gray-200 pr-3">
          <Palette className="w-4 h-4 text-gray-400" />
          <div className="flex items-center space-x-1.5">
            {COLOR_PALETTE.map((col) => {
              const active = color === col && tool !== 'eraser';
              return (
                <button
                  key={col}
                  {...bindTouchTap(() => {
                    setColor(col);
                    if (tool === 'eraser') setTool('pen');
                  })}
                  className={`w-5.5 h-5.5 rounded-full transition cursor-pointer border flex items-center justify-center ${
                    active ? 'scale-115 ring-2 ring-slate-400' : 'opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: col }}
                  title={col}
                />
              );
            })}
          </div>
        </div>

        {/* Line Thickness select */}
        <div className="flex items-center space-x-2 border-r border-gray-200 pr-3 text-xs font-bold text-slate-650">
          <span>{lang === 'zh' ? '粗细: ' : 'Size: '}</span>
          <select
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none min-h-[38px]"
          >
            <option value={2}>2px</option>
            <option value={4}>4px</option>
            <option value={8}>8px</option>
            <option value={12}>12px</option>
            <option value={20}>20px</option>
          </select>
        </div>

        {/* Board Operations (Undo / Clear / Export) */}
        <div className="flex items-center space-x-1.5">
          <button
            {...bindTouchTap(handleUndo)}
            disabled={elements.length === 0}
            className="p-2.5 bg-slate-50 border border-gray-150 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
            title={lang === 'zh' ? '撤销一步' : 'Undo last action'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            {...bindTouchTap(handleClear)}
            className="p-2.5 bg-rose-50 border border-rose-150 text-rose-700 hover:bg-rose-100 rounded-xl transition min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
            title={lang === 'zh' ? '全部清空' : 'Clear Board'}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            {...bindTouchTap(handleExportPNG)}
            className="p-2.5 bg-slate-900 border border-slate-950 text-white hover:bg-slate-850 rounded-xl transition min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
            title={lang === 'zh' ? '下载高清 PNG 照片' : 'Export and download Board as PNG'}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CANVAS DRAWSTAGE SECTION */}
      <div 
        ref={containerRef} 
        className="flex-1 bg-white relative cursor-crosshair overflow-hidden touch-none"
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute inset-0 bg-transparent block"
        />
        
        {elements.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-50/10 pointer-events-none select-none">
            <Palette className="w-12 h-12 text-slate-300 animate-pulse mb-3" />
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest leading-none">
              {lang === 'zh' ? '触控 / 鼠标 手写无限白板' : 'Sovereign Whiteboard Studio'}
            </h4>
            <p className="text-[10px] text-slate-400/80 font-bold mt-1.5 uppercase tracking-wide">
              {lang === 'zh' ? '选择顶部画笔绘制。所有画作均实时自动同步。' : 'Use drawing tools at the top. Safe & offline.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

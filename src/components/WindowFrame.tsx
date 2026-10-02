import React, { useState, useRef, useEffect } from 'react';
import { Minus, Square, X, Maximize2, Sparkles, Music, Zap, Atom, Cpu, Palette, Terminal, Box, Folder, Sliders } from 'lucide-react';
import { WindowState } from '../types/os';
import { soundFX } from '../audio/soundEngine';

interface Props {
  window: WindowState;
  isActive: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onUpdatePosition: (x: number, y: number, width: number, height: number) => void;
  children: React.ReactNode;
}

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Music': return <Music className="w-3.5 h-3.5 text-cyan-400" />;
    case 'Zap': return <Zap className="w-3.5 h-3.5 text-yellow-400" />;
    case 'Atom': return <Atom className="w-3.5 h-3.5 text-green-400" />;
    case 'Cpu': return <Cpu className="w-3.5 h-3.5 text-pink-400" />;
    case 'Palette': return <Palette className="w-3.5 h-3.5 text-purple-400" />;
    case 'Terminal': return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
    case 'Box': return <Box className="w-3.5 h-3.5 text-cyan-400" />;
    case 'Folder': return <Folder className="w-3.5 h-3.5 text-yellow-400" />;
    case 'Sliders': return <Sliders className="w-3.5 h-3.5 text-rose-400" />;
    default: return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
  }
};

export const WindowFrame: React.FC<Props> = ({
  window: win,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onUpdatePosition,
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Handle Dragging Window
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const newX = Math.max(10, Math.min(window.innerWidth - 100, dragStartRef.current.winX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, dragStartRef.current.winY + dy));
      onUpdatePosition(newX, newY, win.width, win.height);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, win.width, win.height, onUpdatePosition]);

  // Handle Resizing Window
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dw = e.clientX - resizeStartRef.current.x;
      const dh = e.clientY - resizeStartRef.current.y;
      const newW = Math.max(win.minWidth || 400, resizeStartRef.current.w + dw);
      const newH = Math.max(win.minHeight || 300, resizeStartRef.current.h + dh);
      onUpdatePosition(win.x, win.y, newW, newH);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, win.x, win.y, win.minWidth, win.minHeight, onUpdatePosition]);

  if (win.isMinimized) return null;

  const style: React.CSSProperties = win.isMaximized
    ? {
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: 'calc(100vh - 48px)',
        zIndex: win.zIndex,
      }
    : {
        position: 'absolute',
        left: `${win.x}px`,
        top: `${win.y}px`,
        width: `${win.width}px`,
        height: `${win.height}px`,
        zIndex: win.zIndex,
      };

  return (
    <div
      style={style}
      onMouseDown={onFocus}
      className={`flex flex-col rounded-lg overflow-hidden shadow-2xl transition-all duration-75 border ${
        isActive
          ? 'border-cyan-400 shadow-neon-cyan'
          : 'border-cyan-500/30 opacity-90'
      } bg-[#0b0f1d]/95 backdrop-blur-xl`}
    >
      {/* Title Bar */}
      <div
        onMouseDown={e => {
          if (win.isMaximized) return;
          setIsDragging(true);
          dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            winX: win.x,
            winY: win.y,
          };
          onFocus();
        }}
        onDoubleClick={onMaximize}
        className={`flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing select-none border-b ${
          isActive
            ? 'bg-gradient-to-r from-[#141d38] via-[#0d1428] to-[#141d38] border-cyan-500/30 text-cyan-300'
            : 'bg-[#090d19] border-white/10 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2">
          {getIcon(win.iconName)}
          <span className="font-mono text-xs font-bold tracking-wide truncate">
            {win.title}
          </span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()}>
          {/* Minimize */}
          <button
            onClick={() => {
              soundFX.playClick(400);
              onMinimize();
            }}
            className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>

          {/* Maximize */}
          <button
            onClick={() => {
              soundFX.playClick(800);
              onMaximize();
            }}
            className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
            title={win.isMaximized ? 'Restore' : 'Maximize'}
          >
            {win.isMaximized ? <Square className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>

          {/* Close */}
          <button
            onClick={() => {
              soundFX.playCloseWindow();
              onClose();
            }}
            className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>

      {/* Resize Handle (bottom right) */}
      {!win.isMaximized && (
        <div
          onMouseDown={e => {
            e.stopPropagation();
            setIsResizing(true);
            resizeStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              w: win.width,
              h: win.height,
            };
          }}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 text-cyan-400/50 hover:text-cyan-300 z-50"
        >
          <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
            <polygon points="6,0 6,6 0,6" />
          </svg>
        </div>
      )}
    </div>
  );
};

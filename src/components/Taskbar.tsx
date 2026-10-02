import React, { useState, useEffect, useRef } from 'react';
import { Zap, Volume2, VolumeX, Bell, Sliders, ChevronUp, Music, Terminal, Atom, Cpu, Palette, Box, Folder } from 'lucide-react';
import { WindowState, AppId } from '../types/os';
import { soundFX } from '../audio/soundEngine';
import { synthEngine } from '../audio/synthAudioContext';

interface Props {
  windows: WindowState[];
  activeWindowId: string | null;
  isStartOpen: boolean;
  onToggleStart: () => void;
  onFocusWindow: (id: string) => void;
  onOpenApp: (appId: AppId) => void;
  onToggleNotifications: () => void;
  unreadNotifications: number;
  volume: number;
  onSetVolume: (vol: number) => void;
  isMuted: boolean;
  onSetMuted: (muted: boolean) => void;
}

const getTaskbarIcon = (iconName: string) => {
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
    default: return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
  }
};

export const Taskbar: React.FC<Props> = ({
  windows,
  activeWindowId,
  isStartOpen,
  onToggleStart,
  onFocusWindow,
  onOpenApp,
  onToggleNotifications,
  unreadNotifications,
  volume,
  onSetVolume,
  isMuted,
  onSetMuted,
}) => {
  const [time, setTime] = useState(new Date());
  const [isVolumeMenuOpen, setIsVolumeMenuOpen] = useState(false);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);

  // Clock interval
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mini Audio Visualizer in System Tray
  useEffect(() => {
    const canvas = audioCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const freqData = new Uint8Array(16);
    const timeData = new Uint8Array(16);

    const render = () => {
      animId = requestAnimationFrame(render);
      synthEngine.getVisualizerData(freqData, timeData);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barW = canvas.width / 6;

      for (let i = 0; i < 6; i++) {
        const val = (freqData[i * 2] || 0) / 255;
        const barH = Math.max(2, val * canvas.height);
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(i * barW, canvas.height - barH, barW - 1.5, barH);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-12 bg-[#080c18]/90 backdrop-blur-2xl border-t border-cyan-500/30 flex items-center justify-between px-3 z-50 select-none shadow-glass">
      {/* Start Button & Quick Pinned Apps */}
      <div className="flex items-center gap-2">
        {/* Cyber Start Button */}
        <button
          onClick={() => {
            soundFX.playClick(isStartOpen ? 500 : 1000);
            onToggleStart();
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all border ${
            isStartOpen
              ? 'bg-cyan-500 text-black border-cyan-300 shadow-neon-cyan'
              : 'bg-white/5 border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:bg-cyan-500/10'
          }`}
        >
          <Zap className="w-4 h-4 fill-current text-yellow-400" />
          <span>NEON-OS</span>
        </button>

        <div className="h-5 w-[1px] bg-white/10 mx-1" />

        {/* Running Windows Taskbar Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50vw]">
          {windows.map(win => {
            const isActive = activeWindowId === win.id && !win.isMinimized;
            return (
              <button
                key={win.id}
                onClick={() => {
                  soundFX.playClick(900);
                  onFocusWindow(win.id);
                }}
                className={`flex items-center gap-2 px-3 py-1 rounded border text-xs font-mono transition-all max-w-[160px] truncate ${
                  isActive
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-neon-cyan'
                    : win.isMinimized
                    ? 'bg-white/5 border-white/5 text-slate-500 opacity-60'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {getTaskbarIcon(win.iconName)}
                <span className="truncate">{win.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Tray (Right) */}
      <div className="flex items-center gap-3 font-mono text-xs">
        {/* Mini Audio Spectrum */}
        <div className="w-12 h-4 hidden sm:flex items-center bg-black/40 rounded px-1 border border-cyan-500/20">
          <canvas ref={audioCanvasRef} width={40} height={14} className="w-full h-full" />
        </div>

        {/* Volume popover trigger */}
        <div className="relative">
          <button
            onClick={() => {
              setIsVolumeMenuOpen(!isVolumeMenuOpen);
              soundFX.playClick();
            }}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
            title="Audio Volume"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {isVolumeMenuOpen && (
            <div className="absolute bottom-10 right-0 bg-[#0d1428] p-3 rounded-lg border border-cyan-500/30 shadow-2xl flex flex-col gap-2 w-48 z-50">
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>MASTER AUDIO</span>
                <span className="text-cyan-400 font-bold">{isMuted ? 'MUTED' : `${Math.round(volume * 100)}%`}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={e => {
                  const v = Number(e.target.value);
                  onSetVolume(v);
                  soundFX.setVolume(v);
                }}
                className="accent-cyan-400"
              />
              <button
                onClick={() => {
                  onSetMuted(!isMuted);
                  soundFX.setMuted(!isMuted);
                }}
                className="text-[10px] text-center bg-white/5 hover:bg-white/10 py-1 rounded text-slate-300"
              >
                {isMuted ? 'UNMUTE SOUND' : 'MUTE SOUND'}
              </button>
            </div>
          )}
        </div>

        {/* Control Deck shortcut */}
        <button
          onClick={() => {
            soundFX.playOpenWindow();
            onOpenApp('settings');
          }}
          className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
          title="System Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Notifications trigger */}
        <button
          onClick={() => {
            soundFX.playClick();
            onToggleNotifications();
          }}
          className="relative p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
              {unreadNotifications}
            </span>
          )}
        </button>

        {/* Clock & Date */}
        <div className="flex flex-col text-right pl-2 border-l border-white/10">
          <span className="font-bold text-slate-100">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-[10px] text-cyan-400/80">
            {time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { Music, Zap, Atom, Cpu, Palette, Terminal, Box, Folder, Sliders, Activity, Clock, Shield } from 'lucide-react';
import { AppId, AppMetadata } from '../types/os';
import { APP_REGISTRY } from '../state/useOSStore';
import { soundFX } from '../audio/soundEngine';

interface Props {
  onOpenApp: (appId: AppId) => void;
  onOpenContextMenu: (x: number, y: number) => void;
}

const getDesktopIcon = (iconName: string, category: string) => {
  switch (iconName) {
    case 'Music': return <Music className="w-7 h-7 text-cyan-400 group-hover:scale-110 transition-transform" />;
    case 'Zap': return <Zap className="w-7 h-7 text-yellow-400 group-hover:scale-110 transition-transform" />;
    case 'Atom': return <Atom className="w-7 h-7 text-green-400 group-hover:scale-110 transition-transform" />;
    case 'Cpu': return <Cpu className="w-7 h-7 text-pink-400 group-hover:scale-110 transition-transform" />;
    case 'Palette': return <Palette className="w-7 h-7 text-purple-400 group-hover:scale-110 transition-transform" />;
    case 'Terminal': return <Terminal className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" />;
    case 'Box': return <Box className="w-7 h-7 text-cyan-300 group-hover:scale-110 transition-transform" />;
    case 'Folder': return <Folder className="w-7 h-7 text-yellow-300 group-hover:scale-110 transition-transform" />;
    case 'Sliders': return <Sliders className="w-7 h-7 text-rose-400 group-hover:scale-110 transition-transform" />;
    default: return <Zap className="w-7 h-7 text-cyan-400" />;
  }
};

export const Desktop: React.FC<Props> = ({ onOpenApp, onOpenContextMenu }) => {
  const [selectedApp, setSelectedApp] = useState<AppId | null>(null);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const desktopRef = useRef<HTMLDivElement>(null);

  const desktopApps = Object.values(APP_REGISTRY).filter(a => a.shortcutOnDesktop);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      onOpenContextMenu(e.clientX, e.clientY);
      return;
    }
    if ((e.target as HTMLElement).closest('.desktop-icon')) return;

    setSelectedApp(null);
    setMarquee({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!marquee) return;
    setMarquee(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
  };

  const handleMouseUp = () => {
    setMarquee(null);
  };

  return (
    <div
      ref={desktopRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={e => {
        e.preventDefault();
        onOpenContextMenu(e.clientX, e.clientY);
      }}
      className="absolute inset-0 z-0 p-6 flex flex-col justify-between overflow-hidden"
    >
      {/* Desktop App Shortcuts Grid */}
      <div className="grid grid-flow-col grid-rows-6 gap-4 w-max z-10">
        {desktopApps.map(app => {
          const isSelected = selectedApp === app.id;
          return (
            <div
              key={app.id}
              onClick={e => {
                e.stopPropagation();
                setSelectedApp(app.id);
                soundFX.playClick(1000);
              }}
              onDoubleClick={e => {
                e.stopPropagation();
                soundFX.playOpenWindow();
                onOpenApp(app.id);
              }}
              className={`desktop-icon group flex flex-col items-center justify-center w-24 p-2 rounded-xl cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-400 shadow-neon-cyan'
                  : 'bg-black/20 hover:bg-black/40 border-transparent hover:border-cyan-500/30'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 shadow-lg group-hover:border-cyan-400/50 transition-colors">
                {getDesktopIcon(app.iconName, app.category)}
              </div>
              <span className="font-mono text-[11px] font-bold text-center mt-1.5 text-slate-100 group-hover:text-cyan-300 drop-shadow-md truncate w-full px-1">
                {app.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Floating Sci-Fi Desktop Widgets (Top Right) */}
      <div className="absolute top-6 right-6 flex flex-col gap-3 pointer-events-none z-10 hidden md:flex">
        {/* Widget 1: System Telemetry HUD */}
        <div className="bg-[#0b1022]/80 backdrop-blur-md p-3.5 rounded-xl border border-cyan-500/30 shadow-2xl w-64 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 text-cyan-400 font-bold">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              NEURAL STATUS
            </span>
            <span className="text-[10px] text-green-400">100% ONLINE</span>
          </div>

          <div className="flex flex-col gap-2 mt-2 text-[11px]">
            <div className="flex justify-between items-center text-slate-300">
              <span>SYNAPSE LOAD</span>
              <span className="text-cyan-300 font-bold">24.8%</span>
            </div>
            <div className="w-full h-1.5 bg-black/60 rounded overflow-hidden">
              <div className="w-1/4 h-full bg-cyan-400" />
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span>ICE SHIELD</span>
              <span className="text-yellow-300 font-bold">MAXIMUM</span>
            </div>
            <div className="w-full h-1.5 bg-black/60 rounded overflow-hidden">
              <div className="w-full h-full bg-yellow-400" />
            </div>
          </div>
        </div>

        {/* Widget 2: Cyber Stardate Clock */}
        <div className="bg-[#0b1022]/80 backdrop-blur-md p-3.5 rounded-xl border border-pink-500/30 shadow-2xl w-64 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2 text-pink-400">
            <Clock className="w-4 h-4 text-pink-400" />
            <div>
              <div className="text-[10px] text-slate-400">SECTOR CLOCK</div>
              <div className="font-bold text-sm text-white">2099.10.02</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-yellow-400 font-bold">CYBERNETIC</div>
            <div className="text-[9px] text-slate-400">SYNC ACTIVE</div>
          </div>
        </div>
      </div>

      {/* Marquee Selection Box */}
      {marquee && (
        <div
          className="absolute border border-cyan-400 bg-cyan-500/15 pointer-events-none rounded"
          style={{
            left: `${Math.min(marquee.startX, marquee.currentX)}px`,
            top: `${Math.min(marquee.startY, marquee.currentY)}px`,
            width: `${Math.abs(marquee.currentX - marquee.startX)}px`,
            height: `${Math.abs(marquee.currentY - marquee.startY)}px`,
          }}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Search, Zap, Music, Atom, Cpu, Palette, Terminal, Box, Folder, Sliders, Power, Shield, Activity, RefreshCw } from 'lucide-react';
import { AppId } from '../types/os';
import { APP_REGISTRY } from '../state/useOSStore';
import { soundFX } from '../audio/soundEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenApp: (appId: AppId) => void;
  onReboot: () => void;
}

const getMenuIcon = (iconName: string) => {
  switch (iconName) {
    case 'Music': return <Music className="w-5 h-5 text-cyan-400" />;
    case 'Zap': return <Zap className="w-5 h-5 text-yellow-400" />;
    case 'Atom': return <Atom className="w-5 h-5 text-green-400" />;
    case 'Cpu': return <Cpu className="w-5 h-5 text-pink-400" />;
    case 'Palette': return <Palette className="w-5 h-5 text-purple-400" />;
    case 'Terminal': return <Terminal className="w-5 h-5 text-emerald-400" />;
    case 'Box': return <Box className="w-5 h-5 text-cyan-300" />;
    case 'Folder': return <Folder className="w-5 h-5 text-yellow-300" />;
    case 'Sliders': return <Sliders className="w-5 h-5 text-rose-400" />;
    default: return <Zap className="w-5 h-5 text-cyan-400" />;
  }
};

export const StartMenu: React.FC<Props> = ({ isOpen, onClose, onOpenApp, onReboot }) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const apps = Object.values(APP_REGISTRY).filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="absolute bottom-14 left-4 w-96 bg-[#0a0f22]/95 backdrop-blur-2xl rounded-2xl border-2 border-cyan-500/40 shadow-2xl p-4 flex flex-col gap-4 z-50 text-slate-100 font-sans shadow-glass animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Top Search Bar */}
      <div className="flex items-center gap-2 bg-[#060913] px-3 py-2 rounded-xl border border-white/10 text-xs font-mono">
        <Search className="w-4 h-4 text-cyan-400" />
        <input
          type="text"
          placeholder="Search apps, files, or protocols..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          className="bg-transparent text-slate-100 outline-none w-full font-mono text-xs placeholder-slate-500"
        />
      </div>

      {/* Cyber Apps Grid / List */}
      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
        <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>NEURAL APPLICATIONS ({apps.length})</span>
          <span className="text-slate-500">SECTOR 2099</span>
        </div>

        {apps.map(app => (
          <button
            key={app.id}
            onClick={() => {
              soundFX.playOpenWindow();
              onOpenApp(app.id);
              onClose();
            }}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/5 hover:border-cyan-500/30 text-left transition-all group"
          >
            <div className="p-2 rounded-lg bg-[#060913] border border-white/10 group-hover:border-cyan-400/50">
              {getMenuIcon(app.iconName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs font-bold text-slate-100 group-hover:text-cyan-300 truncate">
                {app.name}
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                {app.description}
              </div>
            </div>
            {app.badge && (
              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                {app.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bottom User / Power Footer */}
      <div className="pt-3 border-t border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center font-bold text-xs text-black shadow-md">
            CY
          </div>
          <div className="font-mono">
            <div className="text-xs font-bold text-white">CYBER_OPERATOR</div>
            <div className="text-[10px] text-green-400">ICE Clearance 9</div>
          </div>
        </div>

        <button
          onClick={() => {
            soundFX.playBootSound();
            onReboot();
          }}
          className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/30 transition-colors"
          title="Reboot Neural OS"
        >
          <Power className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

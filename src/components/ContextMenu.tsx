import React from 'react';
import { Terminal, Sliders, Palette, Monitor, FolderPlus, RefreshCw, FileText } from 'lucide-react';
import { AppId, ThemeId, WallpaperId } from '../types/os';
import { soundFX } from '../audio/soundEngine';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
  onOpenApp: (appId: AppId) => void;
  onCycleWallpaper: () => void;
  onCycleTheme: () => void;
  onCreateNewDoc: () => void;
}

export const ContextMenu: React.FC<Props> = ({
  x,
  y,
  onClose,
  onOpenApp,
  onCycleWallpaper,
  onCycleTheme,
  onCreateNewDoc,
}) => {
  // Clamp menu to screen
  const menuX = Math.min(x, window.innerWidth - 220);
  const menuY = Math.min(y, window.innerHeight - 260);

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ left: `${menuX}px`, top: `${menuY}px` }}
      className="fixed z-50 w-52 bg-[#0a0f22]/95 backdrop-blur-xl rounded-xl border border-cyan-500/30 shadow-2xl p-1.5 flex flex-col gap-1 text-xs font-mono text-slate-200 select-none shadow-glass"
    >
      <button
        onClick={() => {
          soundFX.playClick();
          onOpenApp('cyberterminal');
          onClose();
        }}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-cyan-500/20 text-slate-100 hover:text-cyan-300 transition-colors text-left"
      >
        <Terminal className="w-4 h-4 text-emerald-400" />
        <span>Open Cyber Terminal</span>
      </button>

      <button
        onClick={() => {
          soundFX.playClick();
          onCreateNewDoc();
          onClose();
        }}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-cyan-500/20 text-slate-100 hover:text-cyan-300 transition-colors text-left"
      >
        <FileText className="w-4 h-4 text-cyan-400" />
        <span>New Cyber Document</span>
      </button>

      <div className="h-[1px] bg-white/10 my-1" />

      <button
        onClick={() => {
          soundFX.playSuccess();
          onCycleWallpaper();
          onClose();
        }}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-pink-500/20 text-slate-100 hover:text-pink-300 transition-colors text-left"
      >
        <Monitor className="w-4 h-4 text-pink-400" />
        <span>Next Live Wallpaper</span>
      </button>

      <button
        onClick={() => {
          soundFX.playSuccess();
          onCycleTheme();
          onClose();
        }}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-yellow-500/20 text-slate-100 hover:text-yellow-300 transition-colors text-left"
      >
        <Palette className="w-4 h-4 text-yellow-400" />
        <span>Cycle Chromatic Theme</span>
      </button>

      <div className="h-[1px] bg-white/10 my-1" />

      <button
        onClick={() => {
          soundFX.playOpenWindow();
          onOpenApp('settings');
          onClose();
        }}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-cyan-500/20 text-slate-100 hover:text-cyan-300 transition-colors text-left"
      >
        <Sliders className="w-4 h-4 text-cyan-400" />
        <span>Control Deck Settings</span>
      </button>
    </div>
  );
};

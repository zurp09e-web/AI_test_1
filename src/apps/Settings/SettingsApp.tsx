import React from 'react';
import { Sliders, Monitor, Volume2, Shield, Palette, Cpu, Sparkles, Check } from 'lucide-react';
import { ThemeId, WallpaperId } from '../../types/os';
import { soundFX } from '../../audio/soundEngine';

interface Props {
  currentTheme: ThemeId;
  currentWallpaper: WallpaperId;
  onSetTheme: (theme: ThemeId) => void;
  onSetWallpaper: (wallpaper: WallpaperId) => void;
  volume: number;
  onSetVolume: (vol: number) => void;
  isMuted: boolean;
  onSetMuted: (muted: boolean) => void;
}

const THEMES: { id: ThemeId; name: string; color: string; desc: string }[] = [
  { id: 'cyberpunk', name: 'Cyberpunk 2077', color: '#00f0ff', desc: 'Electric Cyan & Hot Magenta Neon' },
  { id: 'matrix', name: 'Matrix Core', color: '#00ff66', desc: 'Phosphor Green Terminal Aesthetics' },
  { id: 'synthwave', name: 'Synthwave Sunset', color: '#ff007f', desc: 'Outrun Sunset Purple & Neon Orange' },
  { id: 'tokyonight', name: 'Tokyo Night', color: '#8b5cf6', desc: 'Deep Midnight Indigo & Sakura Glow' },
  { id: 'arctic', name: 'Arctic Cyber', color: '#38bdf8', desc: 'Sub-Zero Cryo Blue & Pure White' },
];

const WALLPAPERS: { id: WallpaperId; name: string; desc: string }[] = [
  { id: 'cybergrid', name: '3D Cyber Grid Horizon', desc: 'Moving wireframe synthwave grid & glowing mountains' },
  { id: 'matrix', name: 'Matrix Code Rain', desc: 'High-density falling Japanese kanji & alphanumeric rain' },
  { id: 'starfield', name: '3D Warp Starfield', desc: 'Hyperspace particle stream with speed boost reactivity' },
  { id: 'flowfield', name: 'Fluid Flow Fields', desc: 'Perlin curl noise multi-color fluid ribbons' },
  { id: 'cybercity', name: 'Cyberpunk City Skyline', desc: 'Parallax neon skyscrapers with hovercars & rain' },
];

export const SettingsApp: React.FC<Props> = ({
  currentTheme,
  currentWallpaper,
  onSetTheme,
  onSetWallpaper,
  volume,
  onSetVolume,
  isMuted,
  onSetMuted,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#070b16] text-slate-100 select-none overflow-y-auto p-4 gap-6 font-sans">
      {/* 1. Theme Selection */}
      <div className="flex flex-col gap-3">
        <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-2 border-b border-cyan-500/20 pb-2">
          <Palette className="w-4 h-4" />
          SYSTEM THEME & CHROMATICS
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {THEMES.map(theme => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  onSetTheme(theme.id);
                  soundFX.playSuccess();
                }}
                className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-neon-cyan'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full shadow-md flex items-center justify-center"
                    style={{ backgroundColor: theme.color }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-100">{theme.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{theme.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Wallpaper Selection */}
      <div className="flex flex-col gap-3">
        <div className="text-xs font-mono font-bold text-pink-400 flex items-center gap-2 border-b border-pink-500/20 pb-2">
          <Monitor className="w-4 h-4" />
          LIVE WALLPAPER ENGINE (60 FPS WEBGL)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {WALLPAPERS.map(wp => {
            const isSelected = currentWallpaper === wp.id;
            return (
              <button
                key={wp.id}
                onClick={() => {
                  onSetWallpaper(wp.id);
                  soundFX.playSuccess();
                }}
                className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-pink-950/60 border-pink-400 shadow-neon-pink'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="font-mono text-xs font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    {wp.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{wp.desc}</div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-pink-400 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Audio & Sound FX */}
      <div className="flex flex-col gap-3">
        <div className="text-xs font-mono font-bold text-yellow-400 flex items-center gap-2 border-b border-yellow-500/20 pb-2">
          <Volume2 className="w-4 h-4" />
          AUDIO SYNTHESIS & SOUND FX
        </div>

        <div className="bg-[#0c1224] p-4 rounded-lg border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-xs font-bold text-slate-100">Master Sound FX</div>
              <div className="text-[11px] text-slate-400 font-mono">Procedural Web Audio clicks, sweeps & alerts</div>
            </div>
            <button
              onClick={() => {
                onSetMuted(!isMuted);
                soundFX.setMuted(!isMuted);
              }}
              className={`px-3 py-1 rounded text-xs font-mono font-bold border transition-all ${
                !isMuted
                  ? 'bg-yellow-400 text-black border-yellow-300'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              {!isMuted ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">VOLUME LEVEL</span>
              <span className="text-yellow-400 font-bold">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={e => {
                const val = Number(e.target.value);
                onSetVolume(val);
                soundFX.setVolume(val);
                soundFX.playClick(900);
              }}
              className="accent-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* 4. Hardware System Diagnostics */}
      <div className="flex flex-col gap-3">
        <div className="text-xs font-mono font-bold text-green-400 flex items-center gap-2 border-b border-green-500/20 pb-2">
          <Cpu className="w-4 h-4" />
          QUANTUM SYSTEM TELEMETRY
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-white/5 p-3 rounded border border-white/10">
            <div className="text-slate-400 text-[10px]">QUANTUM CORE</div>
            <div className="text-base font-bold text-cyan-400 mt-1">128 QUBITS</div>
            <div className="text-[9px] text-green-400">99.98% Coherence</div>
          </div>
          <div className="bg-white/5 p-3 rounded border border-white/10">
            <div className="text-slate-400 text-[10px]">NEURAL VRAM</div>
            <div className="text-base font-bold text-pink-400 mt-1">64 GB HBM3</div>
            <div className="text-[9px] text-cyan-400">12.4 TB/s Bandwidth</div>
          </div>
          <div className="bg-white/5 p-3 rounded border border-white/10">
            <div className="text-slate-400 text-[10px]">ICE FIREWALL</div>
            <div className="text-base font-bold text-yellow-400 mt-1">LEVEL 9</div>
            <div className="text-[9px] text-yellow-300">Intrusion: 0.00%</div>
          </div>
          <div className="bg-white/5 p-3 rounded border border-white/10">
            <div className="text-slate-400 text-[10px]">CORE THERMALS</div>
            <div className="text-base font-bold text-green-400 mt-1">32.4 °C</div>
            <div className="text-[9px] text-green-300">Cryo-Cooled</div>
          </div>
        </div>
      </div>
    </div>
  );
};

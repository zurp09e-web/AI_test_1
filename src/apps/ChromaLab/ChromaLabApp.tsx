import React, { useState, useEffect, useRef } from 'react';
import { Palette, Download, RotateCcw, Shuffle, Sparkles, ZoomIn, Eye, Sliders, Layers } from 'lucide-react';
import { soundFX } from '../../audio/soundEngine';

type ArtMode = 'flow' | 'fractal' | 'painter';

export const ChromaLabApp: React.FC = () => {
  const [mode, setMode] = useState<ArtMode>('flow');
  const [colorPalette, setColorPalette] = useState<'neon' | 'cyberpunk' | 'matrix' | 'sunset' | 'rainbow'>('neon');
  const [symmetry, setSymmetry] = useState<number>(8); // for painter
  const [fractalIterations, setFractalIterations] = useState<number>(60);
  const [particleSpeed, setParticleSpeed] = useState<number>(2.5);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fractal view state
  const fractalViewRef = useRef({
    x: -0.7,
    y: 0,
    zoom: 1.2,
  });

  const isMouseDownRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const PALETTES = {
    neon: ['#00f0ff', '#ff007f', '#ffe600', '#9d00ff', '#00ff66'],
    cyberpunk: ['#ffe600', '#00f0ff', '#ff0055', '#1a0033', '#ffffff'],
    matrix: ['#00ff66', '#00cc44', '#008822', '#ffffff', '#33ff88'],
    sunset: ['#ff007f', '#ff5500', '#ffe600', '#7700ff', '#ff00aa'],
    rainbow: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'],
  };

  // Flow Field Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = 760);
    let height = (canvas.height = 480);

    // Initial clear
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, width, height);

    if (mode === 'flow') {
      const numParticles = 600;
      interface Particle {
        x: number;
        y: number;
        vx: number;
        vy: number;
        color: string;
      }

      const colors = PALETTES[colorPalette];
      const particles: Particle[] = [];
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          color: colors[i % colors.length],
        });
      }

      let time = 0;

      const loop = () => {
        // Soft fade trail
        ctx.fillStyle = 'rgba(6, 9, 19, 0.04)';
        ctx.fillRect(0, 0, width, height);

        time += 0.004;

        particles.forEach(p => {
          const angle = (Math.sin(p.x * 0.005 + time) + Math.cos(p.y * 0.005 + time * 0.8)) * Math.PI * 2;
          p.vx = Math.cos(angle) * particleSpeed;
          p.vy = Math.sin(angle) * particleSpeed;

          const prevX = p.x;
          const prevY = p.y;

          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) { p.x = width; }
          if (p.x > width) { p.x = 0; }
          if (p.y < 0) { p.y = height; }
          if (p.y > height) { p.y = 0; }

          ctx.beginPath();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.6;
          ctx.shadowBlur = 4;
          ctx.shadowColor = p.color;
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.shadowBlur = 0;
        });

        animId = requestAnimationFrame(loop);
      };

      loop();
    } else if (mode === 'fractal') {
      // Render Mandelbrot Fractal
      const renderFractal = () => {
        const view = fractalViewRef.current;
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;
        const colors = PALETTES[colorPalette];

        for (let py = 0; py < height; py++) {
          for (let px = 0; px < width; px++) {
            const x0 = ((px - width / 2) / (width / 2)) / view.zoom + view.x;
            const y0 = ((py - height / 2) / (height / 2)) / view.zoom + view.y;

            let x = 0;
            let y = 0;
            let iter = 0;

            while (x * x + y * y <= 4 && iter < fractalIterations) {
              const xTemp = x * x - y * y + x0;
              y = 2 * x * y + y0;
              x = xTemp;
              iter++;
            }

            const pIdx = (py * width + px) * 4;
            if (iter === fractalIterations) {
              data[pIdx] = 5;
              data[pIdx + 1] = 7;
              data[pIdx + 2] = 15;
              data[pIdx + 3] = 255;
            } else {
              const hue = (iter / fractalIterations) * 360;
              // Simple vibrant RGB formula
              data[pIdx] = Math.sin(iter * 0.15) * 127 + 128;
              data[pIdx + 1] = Math.sin(iter * 0.15 + 2) * 127 + 128;
              data[pIdx + 2] = Math.sin(iter * 0.15 + 4) * 127 + 128;
              data[pIdx + 3] = 255;
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      };

      renderFractal();
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [mode, colorPalette, fractalIterations, particleSpeed]);

  const clearCanvas = () => {
    soundFX.playClick(400);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const exportImage = () => {
    soundFX.playSuccess();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `chromalab_cyber_art_${Date.now()}.png`;
    a.click();
  };

  // Painter mouse handlers
  const handlePainterPointer = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'fractal') {
      // Fractal Zoom & Pan
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const view = fractalViewRef.current;

      const normX = ((clickX - canvas.width / 2) / (canvas.width / 2)) / view.zoom + view.x;
      const normY = ((clickY - canvas.height / 2) / (canvas.height / 2)) / view.zoom + view.y;

      soundFX.playClick(1100);
      view.x = normX;
      view.y = normY;
      view.zoom *= 1.8;
      setFractalIterations(i => Math.min(200, i + 10));
      return;
    }

    if (mode !== 'painter') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isMouseDownRef.current) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const colors = PALETTES[colorPalette];
      const strokeColor = colors[Math.floor(Math.random() * colors.length)];

      ctx.strokeStyle = strokeColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = strokeColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      const angleStep = (Math.PI * 2) / symmetry;

      for (let s = 0; s < symmetry; s++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(s * angleStep);

        const relX = lastMousePosRef.current.x - cx;
        const relY = lastMousePosRef.current.y - cy;
        const curRelX = x - cx;
        const curRelY = y - cy;

        ctx.beginPath();
        ctx.moveTo(relX, relY);
        ctx.lineTo(curRelX, curRelY);
        ctx.stroke();

        // Mirror symmetry
        ctx.beginPath();
        ctx.moveTo(-relX, relY);
        ctx.lineTo(-curRelX, curRelY);
        ctx.stroke();

        ctx.restore();
      }
      ctx.shadowBlur = 0;
    }

    lastMousePosRef.current = { x, y };
  };

  return (
    <div className="flex flex-col h-full bg-[#060913] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#0c1222] border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#070b16] p-0.5 rounded border border-white/10 text-xs font-mono">
            {[
              { id: 'flow', label: 'FLOW FIELD', icon: Sparkles },
              { id: 'fractal', label: 'FRACTAL ZOOM', icon: ZoomIn },
              { id: 'painter', label: 'NEON KALEIDOSCOPE', icon: Palette },
            ].map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id as any);
                    soundFX.playClick(1000);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded font-bold transition-all ${
                    mode === m.id
                      ? 'bg-pink-500 text-white shadow-neon-pink'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={clearCanvas}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono bg-white/5 hover:bg-white/10 text-rose-400 border border-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            CLEAR
          </button>
        </div>

        {/* Right Palette & Export */}
        <div className="flex items-center gap-3">
          {/* Palette selector */}
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-slate-400">PALETTE:</span>
            <select
              value={colorPalette}
              onChange={e => {
                setColorPalette(e.target.value as any);
                soundFX.playClick();
              }}
              className="bg-[#070b16] border border-cyan-500/30 text-cyan-300 rounded px-2 py-1 text-xs font-mono outline-none cursor-pointer uppercase"
            >
              <option value="neon">Neon Glow</option>
              <option value="cyberpunk">Cyberpunk 2077</option>
              <option value="matrix">Matrix Green</option>
              <option value="sunset">Synthwave Sunset</option>
              <option value="rainbow">Chromatic Rainbow</option>
            </select>
          </div>

          {/* Export PNG */}
          <button
            onClick={exportImage}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs rounded shadow-neon-cyan transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT PNG
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-3 flex items-center justify-center bg-black/50 relative">
          <canvas
            ref={canvasRef}
            width={760}
            height={480}
            onMouseDown={e => {
              isMouseDownRef.current = true;
              lastMousePosRef.current = {
                x: e.clientX - e.currentTarget.getBoundingClientRect().left,
                y: e.clientY - e.currentTarget.getBoundingClientRect().top,
              };
              handlePainterPointer(e);
            }}
            onMouseUp={() => (isMouseDownRef.current = false)}
            onMouseMove={handlePainterPointer}
            className="rounded-lg border-2 border-pink-500/30 shadow-2xl cursor-crosshair w-full h-full max-w-[760px] max-h-[480px] object-cover"
          />

          {mode === 'fractal' && (
            <div className="absolute bottom-6 left-6 pointer-events-none text-xs font-mono text-pink-300 bg-black/80 px-3 py-1 rounded border border-pink-500/30">
              CLICK ANYWHERE ON FRACTAL TO DIVE DEEPER
            </div>
          )}
          {mode === 'painter' && (
            <div className="absolute bottom-6 left-6 pointer-events-none text-xs font-mono text-cyan-300 bg-black/80 px-3 py-1 rounded border border-cyan-500/30">
              CLICK & DRAG TO PAINT MULTI-AXIS KALEIDOSCOPE ART
            </div>
          )}
        </div>

        {/* Right Settings Sidebar */}
        <div className="w-56 bg-[#0a0f1e] border-l border-cyan-500/20 p-3 flex flex-col gap-3">
          <div className="text-xs font-mono font-bold text-pink-400 border-b border-pink-500/20 pb-1.5 flex items-center gap-1.5">
            <Sliders className="w-4 h-4" />
            GENERATIVE CONTROLS
          </div>

          {mode === 'painter' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">SYMMETRY AXES</span>
                <span className="text-pink-300 font-bold">{symmetry}X</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-xs font-mono">
                {[4, 6, 8, 16].map(num => (
                  <button
                    key={num}
                    onClick={() => setSymmetry(num)}
                    className={`py-1 rounded font-bold border ${
                      symmetry === num
                        ? 'bg-pink-500 text-white border-pink-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {num}X
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'flow' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">FLOW VELOCITY</span>
                <span className="text-cyan-300 font-bold">{particleSpeed}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6"
                step="0.5"
                value={particleSpeed}
                onChange={e => setParticleSpeed(Number(e.target.value))}
                className="accent-cyan-400"
              />
            </div>
          )}

          {mode === 'fractal' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">DETAIL ITERATIONS</span>
                <span className="text-yellow-300 font-bold">{fractalIterations}</span>
              </div>
              <input
                type="range"
                min="30"
                max="180"
                step="10"
                value={fractalIterations}
                onChange={e => setFractalIterations(Number(e.target.value))}
                className="accent-yellow-400"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

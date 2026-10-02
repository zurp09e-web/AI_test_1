import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Flame, Droplet, Sparkles, Zap, Shield, Bomb, Circle, Sliders, Layers } from 'lucide-react';
import { soundFX } from '../../audio/soundEngine';

type ElementType = 
  | 'empty'
  | 'sand'
  | 'water'
  | 'fire'
  | 'gunpowder'
  | 'oil'
  | 'wood'
  | 'stone'
  | 'acid'
  | 'lava'
  | 'ice'
  | 'laser'
  | 'eraser';

interface ElementInfo {
  name: string;
  color: string;
  type: ElementType;
  category: 'solid' | 'liquid' | 'gas' | 'energy' | 'special';
  desc: string;
}

const ELEMENTS: ElementInfo[] = [
  { name: 'Sand', color: '#eab308', type: 'sand', category: 'solid', desc: 'Granular solid, forms heaps' },
  { name: 'Water', color: '#06b6d4', type: 'water', category: 'liquid', desc: 'Flows, extinguishes fire' },
  { name: 'Fire', color: '#ef4444', type: 'fire', category: 'gas', desc: 'Ignites flammables, rises' },
  { name: 'Gunpowder', color: '#94a3b8', type: 'gunpowder', category: 'solid', desc: 'Explosive grain' },
  { name: 'Oil', color: '#854d0e', type: 'oil', category: 'liquid', desc: 'Highly flammable liquid' },
  { name: 'Lava', color: '#f97316', type: 'lava', category: 'liquid', desc: 'Molten rock, superheats' },
  { name: 'Acid', color: '#22c55e', type: 'acid', category: 'liquid', desc: 'Dissolves matter with gas' },
  { name: 'Wood', color: '#78350f', type: 'wood', category: 'solid', desc: 'Flammable barrier' },
  { name: 'Stone', color: '#64748b', type: 'stone', category: 'solid', desc: 'Indestructible wall' },
  { name: 'Ice', color: '#93c5fd', type: 'ice', category: 'solid', desc: 'Melts when heated' },
  { name: 'Laser', color: '#ec4899', type: 'laser', category: 'energy', desc: 'High-energy beam' },
  { name: 'Eraser', color: '#000000', type: 'eraser', category: 'special', desc: 'Clears pixels' },
];

const WIDTH = 180;
const HEIGHT = 120;

// Element numeric IDs
const ID_EMPTY = 0;
const ID_SAND = 1;
const ID_WATER = 2;
const ID_FIRE = 3;
const ID_GUNPOWDER = 4;
const ID_OIL = 5;
const ID_WOOD = 6;
const ID_STONE = 7;
const ID_ACID = 8;
const ID_LAVA = 9;
const ID_ICE = 10;
const ID_STEAM = 11;

export const QuantumSandApp: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<ElementType>('sand');
  const [brushSize, setBrushSize] = useState(3);
  const [gravityMode, setGravityMode] = useState<'down' | 'up' | 'zero' | 'reverse'>('down');
  const [isPaused, setIsPaused] = useState(false);
  const [particleCount, setParticleCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Uint8Array>(new Uint8Array(WIDTH * HEIGHT));
  const lifeRef = useRef<Uint8Array>(new Uint8Array(WIDTH * HEIGHT));
  const isMouseDownRef = useRef(false);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const selectedElementRef = useRef(selectedElement);
  selectedElementRef.current = selectedElement;

  const brushSizeRef = useRef(brushSize);
  brushSizeRef.current = brushSize;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const gravityModeRef = useRef(gravityMode);
  gravityModeRef.current = gravityMode;

  const elementToId = (type: ElementType): number => {
    switch (type) {
      case 'sand': return ID_SAND;
      case 'water': return ID_WATER;
      case 'fire': return ID_FIRE;
      case 'gunpowder': return ID_GUNPOWDER;
      case 'oil': return ID_OIL;
      case 'wood': return ID_WOOD;
      case 'stone': return ID_STONE;
      case 'acid': return ID_ACID;
      case 'lava': return ID_LAVA;
      case 'ice': return ID_ICE;
      case 'eraser': return ID_EMPTY;
      default: return ID_EMPTY;
    }
  };

  const getElementColor = (id: number): string => {
    switch (id) {
      case ID_SAND: return '#eab308';
      case ID_WATER: return '#06b6d4';
      case ID_FIRE: return Math.random() > 0.5 ? '#ef4444' : '#f97316';
      case ID_GUNPOWDER: return '#94a3b8';
      case ID_OIL: return '#713f12';
      case ID_WOOD: return '#78350f';
      case ID_STONE: return '#64748b';
      case ID_ACID: return '#22c55e';
      case ID_LAVA: return '#ea580c';
      case ID_ICE: return '#93c5fd';
      case ID_STEAM: return 'rgba(203, 213, 225, 0.4)';
      default: return '#080c18';
    }
  };

  const clearGrid = () => {
    soundFX.playClick(400);
    gridRef.current.fill(ID_EMPTY);
    lifeRef.current.fill(0);
    setParticleCount(0);
  };

  const loadPreset = (preset: 'volcano' | 'bomb' | 'acid' | 'fluid') => {
    soundFX.playSuccess();
    clearGrid();
    const grid = gridRef.current;

    if (preset === 'volcano') {
      // Build stone volcano cone
      for (let y = 50; y < HEIGHT; y++) {
        const span = (y - 50) * 1.3;
        for (let x = 0; x < WIDTH; x++) {
          const dist = Math.abs(x - WIDTH / 2);
          if (dist > 15 && dist < 15 + span) {
            grid[y * WIDTH + x] = ID_STONE;
          }
          if (dist <= 15 && y > 70) {
            grid[y * WIDTH + x] = ID_LAVA;
          }
        }
      }
    } else if (preset === 'bomb') {
      // Wood container with gunpowder and fire fuse
      for (let y = 60; y < 100; y++) {
        for (let x = 70; x < 110; x++) {
          if (y === 60 || y === 99 || x === 70 || x === 109) {
            grid[y * WIDTH + x] = ID_WOOD;
          } else {
            grid[y * WIDTH + x] = ID_GUNPOWDER;
          }
        }
      }
      // Fuse
      for (let y = 35; y < 60; y++) {
        grid[y * WIDTH + 90] = ID_WOOD;
      }
      grid[34 * WIDTH + 90] = ID_FIRE;
    } else if (preset === 'acid') {
      // Stone barriers with sand, oil, and acid on top
      for (let y = 70; y < 110; y++) {
        for (let x = 30; x < 150; x++) {
          if (x % 30 === 0 || y === 109) grid[y * WIDTH + x] = ID_STONE;
          else if (x < 60) grid[y * WIDTH + x] = ID_SAND;
          else if (x < 90) grid[y * WIDTH + x] = ID_OIL;
          else grid[y * WIDTH + x] = ID_WOOD;
        }
      }
      for (let y = 10; y < 30; y++) {
        for (let x = 40; x < 140; x++) {
          if (Math.random() > 0.4) grid[y * WIDTH + x] = ID_ACID;
        }
      }
    } else if (preset === 'fluid') {
      for (let y = 30; y < 90; y++) {
        for (let x = 30; x < 150; x++) {
          if (y < 50) grid[y * WIDTH + x] = ID_OIL;
          else if (y < 75) grid[y * WIDTH + x] = ID_WATER;
          else grid[y * WIDTH + x] = ID_SAND;
        }
      }
    }
  };

  // Main Physics Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const imgData = ctx.createImageData(WIDTH, HEIGHT);
    const data32 = new Uint32Array(imgData.data.buffer);

    // Color cache in 0xAABBGGRR format
    const COLOR_TABLE = new Uint32Array([
      0xFF180C08, // EMPTY
      0xFF08B3EA, // SAND
      0xFFD4B606, // WATER
      0xFF0055FF, // FIRE
      0xFFB8A394, // GUNPOWDER
      0xFF0E3F71, // OIL
      0xFF0F3578, // WOOD
      0xFF8B7464, // STONE
      0xFF5EC522, // ACID
      0xFF0C58EA, // LAVA
      0xFFFDC593, // ICE
      0x66E1D3CB, // STEAM
    ]);

    const stepSimulation = () => {
      const grid = gridRef.current;
      const life = lifeRef.current;
      const gMode = gravityModeRef.current;

      const gDir = gMode === 'up' ? -1 : gMode === 'reverse' ? -1 : 1;
      const isZeroG = gMode === 'zero';

      // Update brush drawing if mouse down
      if (isMouseDownRef.current) {
        const mx = mousePosRef.current.x;
        const my = mousePosRef.current.y;
        const radius = brushSizeRef.current;
        const el = selectedElementRef.current;

        if (el === 'laser') {
          // Fire a laser line downwards
          soundFX.playLaser();
          for (let y = my; y < HEIGHT; y++) {
            const idx = y * WIDTH + mx;
            if (grid[idx] === ID_GUNPOWDER || grid[idx] === ID_OIL) {
              grid[idx] = ID_FIRE;
              life[idx] = 20;
            } else if (grid[idx] !== ID_STONE) {
              grid[idx] = ID_FIRE;
              life[idx] = 10;
            }
          }
        } else {
          const elId = elementToId(el);
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx * dx + dy * dy <= radius * radius) {
                const px = mx + dx;
                const py = my + dy;
                if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
                  const idx = py * WIDTH + px;
                  if (elId === ID_EMPTY || grid[idx] === ID_EMPTY || el === 'eraser' || el === 'stone') {
                    grid[idx] = elId;
                    life[idx] = elId === ID_FIRE ? 25 + Math.floor(Math.random() * 20) : 0;
                  }
                }
              }
            }
          }
        }
      }

      if (isPausedRef.current) return;

      let count = 0;

      // Bottom-to-top or top-to-bottom scan
      const startY = gDir === 1 ? HEIGHT - 1 : 0;
      const endY = gDir === 1 ? -1 : HEIGHT;
      const stepY = gDir === 1 ? -1 : 1;

      for (let y = startY; y !== endY; y += stepY) {
        // Randomize X direction scan to avoid directional bias
        const xDir = Math.random() > 0.5 ? 1 : -1;
        const startX = xDir === 1 ? 0 : WIDTH - 1;
        const endX = xDir === 1 ? WIDTH : -1;

        for (let x = startX; x !== endX; x += xDir) {
          const idx = y * WIDTH + x;
          const cell = grid[idx];
          if (cell === ID_EMPTY) continue;
          count++;

          const ny = y + gDir;

          // 1. SAND / GUNPOWDER (Granular physics)
          if (cell === ID_SAND || cell === ID_GUNPOWDER) {
            if (!isZeroG && ny >= 0 && ny < HEIGHT) {
              const downIdx = ny * WIDTH + x;
              const dlIdx = ny * WIDTH + (x - 1);
              const drIdx = ny * WIDTH + (x + 1);

              if (grid[downIdx] === ID_EMPTY || grid[downIdx] === ID_WATER || grid[downIdx] === ID_OIL) {
                const swap = grid[downIdx];
                grid[downIdx] = cell;
                grid[idx] = swap;
              } else if (x > 0 && (grid[dlIdx] === ID_EMPTY || grid[dlIdx] === ID_WATER)) {
                const swap = grid[dlIdx];
                grid[dlIdx] = cell;
                grid[idx] = swap;
              } else if (x < WIDTH - 1 && (grid[drIdx] === ID_EMPTY || grid[drIdx] === ID_WATER)) {
                const swap = grid[drIdx];
                grid[drIdx] = cell;
                grid[idx] = swap;
              }
            }
          }

          // 2. LIQUIDS: WATER, OIL, ACID, LAVA
          else if (cell === ID_WATER || cell === ID_OIL || cell === ID_ACID || cell === ID_LAVA) {
            if (!isZeroG && ny >= 0 && ny < HEIGHT) {
              const downIdx = ny * WIDTH + x;
              if (grid[downIdx] === ID_EMPTY) {
                grid[downIdx] = cell;
                grid[idx] = ID_EMPTY;
                continue;
              }
            }

            // Horizontal liquid dispersion
            const dir = Math.random() > 0.5 ? 1 : -1;
            const side1 = y * WIDTH + (x + dir);
            const side2 = y * WIDTH + (x - dir);

            if (x + dir >= 0 && x + dir < WIDTH && grid[side1] === ID_EMPTY) {
              grid[side1] = cell;
              grid[idx] = ID_EMPTY;
            } else if (x - dir >= 0 && x - dir < WIDTH && grid[side2] === ID_EMPTY) {
              grid[side2] = cell;
              grid[idx] = ID_EMPTY;
            }

            // Chemical reactions
            if (cell === ID_ACID) {
              // Acid dissolves adjacent cells
              const neighbors = [
                (y - 1) * WIDTH + x,
                (y + 1) * WIDTH + x,
                y * WIDTH + (x - 1),
                y * WIDTH + (x + 1)
              ];
              neighbors.forEach(nIdx => {
                if (nIdx >= 0 && nIdx < WIDTH * HEIGHT) {
                  const target = grid[nIdx];
                  if (target !== ID_EMPTY && target !== ID_ACID && target !== ID_STONE && target !== ID_STEAM) {
                    grid[nIdx] = ID_STEAM;
                    life[nIdx] = 20;
                    grid[idx] = ID_EMPTY;
                  }
                }
              });
            } else if (cell === ID_LAVA) {
              // Lava ignites or melts adjacent
              const neighbors = [
                (y - 1) * WIDTH + x,
                (y + 1) * WIDTH + x,
                y * WIDTH + (x - 1),
                y * WIDTH + (x + 1)
              ];
              neighbors.forEach(nIdx => {
                if (nIdx >= 0 && nIdx < WIDTH * HEIGHT) {
                  const target = grid[nIdx];
                  if (target === ID_WATER) {
                    grid[nIdx] = ID_STEAM;
                    grid[idx] = ID_STONE; // Lava turns to stone!
                  } else if (target === ID_ICE) {
                    grid[nIdx] = ID_WATER;
                  } else if (target === ID_WOOD || target === ID_OIL || target === ID_GUNPOWDER) {
                    grid[nIdx] = ID_FIRE;
                    life[nIdx] = 30;
                  }
                }
              });
            }
          }

          // 3. FIRE
          else if (cell === ID_FIRE) {
            life[idx]--;
            if (life[idx] <= 0) {
              grid[idx] = Math.random() > 0.7 ? ID_STEAM : ID_EMPTY;
              life[idx] = 15;
              continue;
            }

            // Fire rises upwards
            const fireY = y - 1;
            if (fireY >= 0) {
              const upIdx = fireY * WIDTH + (x + (Math.random() > 0.5 ? 1 : -1));
              if (upIdx >= 0 && upIdx < WIDTH * HEIGHT && grid[upIdx] === ID_EMPTY) {
                grid[upIdx] = ID_FIRE;
                life[upIdx] = life[idx];
                grid[idx] = ID_EMPTY;
              }
            }

            // Ignite neighbors
            const neighbors = [
              (y - 1) * WIDTH + x,
              (y + 1) * WIDTH + x,
              y * WIDTH + (x - 1),
              y * WIDTH + (x + 1)
            ];
            neighbors.forEach(nIdx => {
              if (nIdx >= 0 && nIdx < WIDTH * HEIGHT) {
                const target = grid[nIdx];
                if (target === ID_GUNPOWDER) {
                  // EXPLOSION!
                  soundFX.playExplosion();
                  for (let ey = -6; ey <= 6; ey++) {
                    for (let ex = -6; ex <= 6; ex++) {
                      const eIdx = (y + ey) * WIDTH + (x + ex);
                      if (eIdx >= 0 && eIdx < WIDTH * HEIGHT && grid[eIdx] !== ID_STONE) {
                        grid[eIdx] = Math.random() > 0.3 ? ID_FIRE : ID_EMPTY;
                        life[eIdx] = 25;
                      }
                    }
                  }
                } else if (target === ID_OIL || target === ID_WOOD) {
                  grid[nIdx] = ID_FIRE;
                  life[nIdx] = 35;
                } else if (target === ID_WATER) {
                  grid[idx] = ID_STEAM;
                  life[idx] = 20;
                }
              }
            });
          }

          // 4. STEAM
          else if (cell === ID_STEAM) {
            life[idx]--;
            if (life[idx] <= 0) {
              grid[idx] = ID_EMPTY;
            } else if (y > 0 && grid[(y - 1) * WIDTH + x] === ID_EMPTY) {
              grid[(y - 1) * WIDTH + x] = ID_STEAM;
              life[(y - 1) * WIDTH + x] = life[idx];
              grid[idx] = ID_EMPTY;
            }
          }
        }
      }

      setParticleCount(count);

      // Render grid to image data
      for (let i = 0; i < WIDTH * HEIGHT; i++) {
        data32[i] = COLOR_TABLE[grid[i]];
      }

      ctx.putImageData(imgData, 0, 0);
    };

    const loop = () => {
      stepSimulation();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleCanvasPointer = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    mousePosRef.current = { x: Math.max(0, Math.min(WIDTH - 1, x)), y: Math.max(0, Math.min(HEIGHT - 1, y)) };
  };

  return (
    <div className="flex flex-col h-full bg-[#070b16] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#0d1424] border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsPaused(!isPaused);
              soundFX.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
              isPaused
                ? 'bg-yellow-400 text-black shadow-neon-yellow'
                : 'bg-cyan-500 text-black shadow-neon-cyan'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>

          <button
            onClick={clearGrid}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono bg-white/5 hover:bg-white/10 text-rose-400 border border-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            CLEAR
          </button>

          {/* Brush size slider */}
          <div className="flex items-center gap-2 bg-[#080d19] px-3 py-1 rounded border border-white/10 text-xs font-mono">
            <span className="text-slate-400">BRUSH:</span>
            <span className="text-cyan-300 font-bold w-4">{brushSize}</span>
            <input
              type="range"
              min="1"
              max="10"
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              className="w-16 accent-cyan-400"
            />
          </div>

          {/* Gravity mode */}
          <div className="flex items-center gap-1 bg-[#080d19] p-0.5 rounded border border-white/10 text-[11px] font-mono">
            {(['down', 'up', 'zero', 'reverse'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setGravityMode(mode);
                  soundFX.playClick(800);
                }}
                className={`px-2 py-0.5 rounded uppercase font-semibold ${
                  gravityMode === mode ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'zero' ? '0-G' : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Presets & Particle counter */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-mono text-cyan-400">
            PARTICLES: <span className="font-bold text-white">{particleCount}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-slate-400">SCENARIO:</span>
            <select
              onChange={e => loadPreset(e.target.value as any)}
              className="bg-[#080d19] border border-cyan-500/30 text-cyan-300 rounded px-2 py-1 text-xs font-mono outline-none cursor-pointer"
            >
              <option value="">Load Preset...</option>
              <option value="volcano">Volcano Eruption</option>
              <option value="bomb">Gunpowder Bomb</option>
              <option value="acid">Acid Catastrophe</option>
              <option value="fluid">Multi-Fluid Layers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Sandbox */}
        <div className="flex-1 p-3 flex items-center justify-center bg-black/60 relative">
          <div className="w-full h-full max-w-[800px] max-h-[500px] rounded-lg border-2 border-cyan-500/30 overflow-hidden shadow-2xl relative bg-[#080c18]">
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              onMouseDown={e => {
                isMouseDownRef.current = true;
                handleCanvasPointer(e);
              }}
              onMouseUp={() => (isMouseDownRef.current = false)}
              onMouseLeave={() => (isMouseDownRef.current = false)}
              onMouseMove={handleCanvasPointer}
              className="w-full h-full cursor-crosshair object-fill image-rendering-pixelated"
              style={{ imageRendering: 'pixelated' }}
            />

            <div className="absolute bottom-2 left-2 pointer-events-none text-[10px] font-mono text-cyan-400/60 bg-black/60 px-2 py-0.5 rounded">
              DRAW WITH MOUSE // REACTIVE PHYSICS ENGINE
            </div>
          </div>
        </div>

        {/* Right Element Palette */}
        <div className="w-52 bg-[#0b1020] border-l border-cyan-500/20 p-3 flex flex-col gap-2 overflow-y-auto">
          <div className="text-xs font-mono font-bold text-cyan-400 border-b border-cyan-500/20 pb-1.5 flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            ELEMENT MATRIX
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {ELEMENTS.map(el => {
              const isSelected = selectedElement === el.type;
              return (
                <button
                  key={el.name}
                  onClick={() => {
                    setSelectedElement(el.type);
                    soundFX.playClick(1000);
                  }}
                  className={`flex flex-col items-start p-2 rounded text-left transition-all border ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-neon-cyan'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: el.color }}
                    />
                    <span className="font-mono text-xs font-bold truncate text-slate-200">
                      {el.name}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5 capitalize">
                    {el.category}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Element Inspector */}
          <div className="mt-auto bg-[#060913] p-2.5 rounded border border-white/10 text-xs font-mono">
            <div className="text-cyan-400 font-bold mb-1">
              {ELEMENTS.find(e => e.type === selectedElement)?.name}
            </div>
            <div className="text-slate-400 text-[11px] leading-relaxed">
              {ELEMENTS.find(e => e.type === selectedElement)?.desc}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

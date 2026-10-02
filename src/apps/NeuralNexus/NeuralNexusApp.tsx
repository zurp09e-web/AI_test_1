import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Sparkles, Skull, Apple, Eye, Zap, Activity, Info, Sliders } from 'lucide-react';
import { soundFX } from '../../audio/soundEngine';

interface Organism {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  age: number;
  generation: number;
  type: 'prey' | 'predator';
  // Genome
  maxSpeed: number;
  visionRadius: number;
  reproduceEnergy: number;
  color: string;
  kills?: number;
}

interface Food {
  x: number;
  y: number;
  energy: number;
}

export const NeuralNexusApp: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [generation, setGeneration] = useState(1);
  const [preyCount, setPreyCount] = useState(40);
  const [predatorCount, setPredatorCount] = useState(4);
  const [foodCount, setFoodCount] = useState(80);
  const [selectedOrganism, setSelectedOrganism] = useState<Organism | null>(null);
  const [selectedTool, setSelectedTool] = useState<'inspect' | 'food' | 'predator' | 'prey' | 'nuke'>('inspect');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const organismsRef = useRef<Organism[]>([]);
  const foodRef = useRef<Food[]>([]);
  const nextIdRef = useRef(1);

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const selectedToolRef = useRef(selectedTool);
  selectedToolRef.current = selectedTool;

  // Initialize initial ecosystem
  const initEcosystem = () => {
    soundFX.playSuccess();
    const organisms: Organism[] = [];
    const food: Food[] = [];

    // Prey
    for (let i = 0; i < 45; i++) {
      organisms.push({
        id: nextIdRef.current++,
        x: Math.random() * 700 + 50,
        y: Math.random() * 400 + 50,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        energy: 100,
        age: 0,
        generation: 1,
        type: 'prey',
        maxSpeed: 2 + Math.random() * 1.5,
        visionRadius: 60 + Math.random() * 40,
        reproduceEnergy: 180 + Math.random() * 40,
        color: '#00f0ff',
      });
    }

    // Predators
    for (let i = 0; i < 4; i++) {
      organisms.push({
        id: nextIdRef.current++,
        x: Math.random() * 700 + 50,
        y: Math.random() * 400 + 50,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        energy: 150,
        age: 0,
        generation: 1,
        type: 'predator',
        maxSpeed: 2.8 + Math.random() * 1.2,
        visionRadius: 110 + Math.random() * 50,
        reproduceEnergy: 240 + Math.random() * 60,
        color: '#ff007f',
        kills: 0,
      });
    }

    // Food
    for (let i = 0; i < 90; i++) {
      food.push({
        x: Math.random() * 760 + 20,
        y: Math.random() * 460 + 20,
        energy: 40,
      });
    }

    organismsRef.current = organisms;
    foodRef.current = food;
    setGeneration(1);
    setSelectedOrganism(null);
  };

  useEffect(() => {
    initEcosystem();
  }, []);

  // Main Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let spawnFoodTimer = 0;

    const loop = () => {
      const width = canvas.width;
      const height = canvas.height;

      if (!isPausedRef.current) {
        const organisms = organismsRef.current;
        const foods = foodRef.current;

        // Auto spawn food
        spawnFoodTimer++;
        if (spawnFoodTimer > 8 && foods.length < 140) {
          spawnFoodTimer = 0;
          foods.push({
            x: Math.random() * (width - 40) + 20,
            y: Math.random() * (height - 40) + 20,
            energy: 40,
          });
        }

        let maxGen = 1;

        // Update Organisms
        for (let i = organisms.length - 1; i >= 0; i--) {
          const org = organisms[i];
          org.age++;
          maxGen = Math.max(maxGen, org.generation);

          // Energy decay based on speed & vision
          const metabolicCost = 0.08 + (org.maxSpeed * 0.04) + (org.visionRadius * 0.0005);
          org.energy -= metabolicCost;

          // Death check
          if (org.energy <= 0 || org.age > 3000) {
            organisms.splice(i, 1);
            if (selectedOrganism?.id === org.id) setSelectedOrganism(null);
            continue;
          }

          // Sensory Behavior (AI logic)
          let targetX = 0;
          let targetY = 0;
          let hasTarget = false;

          if (org.type === 'prey') {
            // Find closest food
            let closestDist = org.visionRadius;
            let closestFoodIdx = -1;

            for (let f = 0; f < foods.length; f++) {
              const dx = foods[f].x - org.x;
              const dy = foods[f].y - org.y;
              const dist = Math.hypot(dx, dy);
              if (dist < closestDist) {
                closestDist = dist;
                closestFoodIdx = f;
                targetX = foods[f].x;
                targetY = foods[f].y;
                hasTarget = true;
              }
            }

            // Flee from nearby predators!
            for (let p = 0; p < organisms.length; p++) {
              if (organisms[p].type === 'predator') {
                const pdx = org.x - organisms[p].x;
                const pdy = org.y - organisms[p].y;
                const pDist = Math.hypot(pdx, pdy);
                if (pDist < org.visionRadius * 0.8) {
                  // Run away fast!
                  targetX = org.x + pdx * 2;
                  targetY = org.y + pdy * 2;
                  hasTarget = true;
                }
              }
            }

            // Eat food
            if (closestFoodIdx !== -1 && closestDist < 8) {
              org.energy += foods[closestFoodIdx].energy;
              foods.splice(closestFoodIdx, 1);
            }
          } else {
            // Predator: hunt nearest prey
            let closestDist = org.visionRadius;
            let targetPreyIdx = -1;

            for (let p = 0; p < organisms.length; p++) {
              if (organisms[p].type === 'prey') {
                const dx = organisms[p].x - org.x;
                const dy = organisms[p].y - org.y;
                const dist = Math.hypot(dx, dy);
                if (dist < closestDist) {
                  closestDist = dist;
                  targetPreyIdx = p;
                  targetX = organisms[p].x;
                  targetY = organisms[p].y;
                  hasTarget = true;
                }
              }
            }

            // Attack prey
            if (targetPreyIdx !== -1 && closestDist < 12) {
              org.energy += organisms[targetPreyIdx].energy * 0.7;
              org.kills = (org.kills || 0) + 1;
              organisms.splice(targetPreyIdx, 1);
            }
          }

          // Steering towards target
          if (hasTarget) {
            const angle = Math.atan2(targetY - org.y, targetX - org.x);
            org.vx += Math.cos(angle) * 0.3;
            org.vy += Math.sin(angle) * 0.3;
          } else {
            // Random wander
            org.vx += (Math.random() - 0.5) * 0.4;
            org.vy += (Math.random() - 0.5) * 0.4;
          }

          // Speed limit
          const speed = Math.hypot(org.vx, org.vy);
          if (speed > org.maxSpeed) {
            org.vx = (org.vx / speed) * org.maxSpeed;
            org.vy = (org.vy / speed) * org.maxSpeed;
          }

          org.x += org.vx;
          org.y += org.vy;

          // Screen wrap / bounce
          if (org.x < 10) { org.x = 10; org.vx *= -1; }
          if (org.x > width - 10) { org.x = width - 10; org.vx *= -1; }
          if (org.y < 10) { org.y = 10; org.vy *= -1; }
          if (org.y > height - 10) { org.y = height - 10; org.vy *= -1; }

          // Reproduction (Mitosis with Genetic Mutation!)
          if (org.energy >= org.reproduceEnergy) {
            org.energy *= 0.5;
            const mutation = (Math.random() - 0.5) * 0.3;
            const newSpeed = Math.max(1, org.maxSpeed + mutation);
            const newVision = Math.max(30, org.visionRadius + (Math.random() - 0.5) * 10);

            organisms.push({
              id: nextIdRef.current++,
              x: org.x + (Math.random() - 0.5) * 10,
              y: org.y + (Math.random() - 0.5) * 10,
              vx: -org.vx,
              vy: -org.vy,
              energy: org.energy,
              age: 0,
              generation: org.generation + 1,
              type: org.type,
              maxSpeed: newSpeed,
              visionRadius: newVision,
              reproduceEnergy: org.reproduceEnergy + (Math.random() - 0.5) * 10,
              color: org.type === 'prey' ? (newSpeed > 3 ? '#ffe600' : '#00f0ff') : '#ff007f',
              kills: 0,
            });
          }
        }

        setGeneration(maxGen);
        setPreyCount(organisms.filter(o => o.type === 'prey').length);
        setPredatorCount(organisms.filter(o => o.type === 'predator').length);
        setFoodCount(foods.length);
      }

      // ---------------- RENDER ----------------
      ctx.fillStyle = '#060a15';
      ctx.fillRect(0, 0, width, height);

      // Subtle cyber grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Food (Algae nodes)
      const foods = foodRef.current;
      ctx.fillStyle = '#00ff66';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00ff66';
      foods.forEach(f => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Draw Organisms
      const organisms = organismsRef.current;
      organisms.forEach(org => {
        const isSelected = selectedOrganism?.id === org.id;

        // Vision aura for selected
        if (isSelected) {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(org.x, org.y, org.visionRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.save();
        ctx.translate(org.x, org.y);
        const heading = Math.atan2(org.vy, org.vx);
        ctx.rotate(heading);

        ctx.fillStyle = org.color;
        ctx.shadowBlur = isSelected ? 12 : 5;
        ctx.shadowColor = org.color;

        if (org.type === 'predator') {
          // Sharp predator diamond
          ctx.beginPath();
          ctx.moveTo(9, 0);
          ctx.lineTo(-6, -5);
          ctx.lineTo(-3, 0);
          ctx.lineTo(-6, 5);
          ctx.closePath();
          ctx.fill();
        } else {
          // Sleek prey triangle
          ctx.beginPath();
          ctx.moveTo(6, 0);
          ctx.lineTo(-4, -4);
          ctx.lineTo(-4, 4);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [selectedOrganism]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tool = selectedToolRef.current;

    if (tool === 'inspect') {
      // Find clicked organism
      const org = organismsRef.current.find(o => Math.hypot(o.x - x, o.y - y) < 20);
      if (org) {
        soundFX.playClick(1200);
        setSelectedOrganism(org);
      } else {
        setSelectedOrganism(null);
      }
    } else if (tool === 'food') {
      soundFX.playClick(900);
      for (let i = 0; i < 15; i++) {
        foodRef.current.push({
          x: x + (Math.random() - 0.5) * 40,
          y: y + (Math.random() - 0.5) * 40,
          energy: 40,
        });
      }
    } else if (tool === 'predator') {
      soundFX.playLaser();
      organismsRef.current.push({
        id: nextIdRef.current++,
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        energy: 160,
        age: 0,
        generation: 1,
        type: 'predator',
        maxSpeed: 3.2,
        visionRadius: 130,
        reproduceEnergy: 250,
        color: '#ff007f',
        kills: 0,
      });
    } else if (tool === 'prey') {
      soundFX.playSuccess();
      for (let i = 0; i < 6; i++) {
        organismsRef.current.push({
          id: nextIdRef.current++,
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          energy: 100,
          age: 0,
          generation: 1,
          type: 'prey',
          maxSpeed: 2.2 + Math.random(),
          visionRadius: 80,
          reproduceEnergy: 180,
          color: '#00f0ff',
        });
      }
    } else if (tool === 'nuke') {
      // Radiation event: mutate or destroy 50%
      soundFX.playExplosion();
      organismsRef.current = organismsRef.current.filter(() => Math.random() > 0.4);
      organismsRef.current.forEach(o => {
        o.maxSpeed = Math.max(1, o.maxSpeed + (Math.random() - 0.5) * 2);
        o.visionRadius = Math.max(40, o.visionRadius + (Math.random() - 0.5) * 40);
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#060a15] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top HUD */}
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
            onClick={initEcosystem}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono bg-white/5 hover:bg-white/10 text-rose-400 border border-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESET
          </button>

          <div className="h-4 w-[1px] bg-white/20 mx-1" />

          {/* Interactive God Tools */}
          <div className="flex items-center gap-1 bg-[#080d19] p-0.5 rounded border border-white/10 text-xs font-mono">
            {[
              { id: 'inspect', label: 'INSPECT', icon: Eye },
              { id: 'food', label: '+ALGAE', icon: Apple },
              { id: 'prey', label: '+PREY', icon: Sparkles },
              { id: 'predator', label: '+PREDATOR', icon: Skull },
              { id: 'nuke', label: 'MUTATE', icon: Zap },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTool(t.id as any);
                    soundFX.playClick(1000);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-all ${
                    selectedTool === t.id
                      ? 'bg-cyan-500 text-black font-bold shadow-neon-cyan'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            GEN: <span className="font-bold text-yellow-300">#{generation}</span>
          </div>
          <div>
            PREY: <span className="font-bold text-cyan-400">{preyCount}</span>
          </div>
          <div>
            PREDATORS: <span className="font-bold text-pink-400">{predatorCount}</span>
          </div>
          <div>
            ALGAE: <span className="font-bold text-green-400">{foodCount}</span>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative flex items-center justify-center bg-black/40">
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-crosshair object-cover"
          />
        </div>

        {/* Right Neural Inspector */}
        <div className="w-64 bg-[#0a0f1e] border-l border-cyan-500/20 p-3 flex flex-col gap-3 overflow-y-auto">
          <div className="text-xs font-mono font-bold text-cyan-400 border-b border-cyan-500/20 pb-1.5 flex items-center gap-1.5">
            <Activity className="w-4 h-4" />
            NEURAL GENOME INSPECTOR
          </div>

          {selectedOrganism ? (
            <div className="flex flex-col gap-2.5 text-xs font-mono">
              <div className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10">
                <span className="text-slate-400">ORGANISM ID</span>
                <span className="font-bold text-cyan-300">#{selectedOrganism.id}</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10">
                <span className="text-slate-400">SPECIES</span>
                <span
                  className="font-bold uppercase"
                  style={{ color: selectedOrganism.type === 'predator' ? '#ff007f' : '#00f0ff' }}
                >
                  {selectedOrganism.type}
                </span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10">
                <span className="text-slate-400">GENERATION</span>
                <span className="font-bold text-yellow-300">GEN {selectedOrganism.generation}</span>
              </div>

              <div className="flex flex-col gap-1 bg-white/5 p-2 rounded border border-white/10">
                <div className="flex justify-between">
                  <span className="text-slate-400">ENERGY</span>
                  <span className="text-green-400 font-bold">{Math.round(selectedOrganism.energy)}</span>
                </div>
                <div className="w-full h-2 bg-black/50 rounded overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${Math.min(100, (selectedOrganism.energy / 200) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10">
                <span className="text-slate-400">MAX VELOCITY</span>
                <span className="text-cyan-300 font-bold">{selectedOrganism.maxSpeed.toFixed(2)} px/f</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10">
                <span className="text-slate-400">RADAR VISION</span>
                <span className="text-purple-300 font-bold">{Math.round(selectedOrganism.visionRadius)} px</span>
              </div>

              {selectedOrganism.kills !== undefined && (
                <div className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10">
                  <span className="text-slate-400">PREY CONSUMED</span>
                  <span className="text-pink-400 font-bold">{selectedOrganism.kills} KILLS</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-xs font-mono text-slate-500">
              <Eye className="w-8 h-8 mb-2 opacity-40 text-cyan-400" />
              <div>Click any organism on the canvas to inspect its live neural network & genome.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

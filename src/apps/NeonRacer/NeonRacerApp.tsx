import React, { useState, useEffect, useRef } from 'react';
import { Zap, Play, RotateCcw, Trophy, Shield, Flame, Volume2, VolumeX } from 'lucide-react';
import { soundFX } from '../../audio/soundEngine';

interface TrafficCar {
  x: number; // -1 to 1 across road
  z: number; // distance
  speed: number;
  color: string;
  type: 'sedan' | 'truck' | 'police' | 'energy';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export const NeonRacerApp: React.FC = () => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(14850);
  const [nitro, setNitro] = useState(100);
  const [speed, setSpeed] = useState(0);
  const [empCount, setEmpCount] = useState(2);
  const [distance, setDistance] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Player state refs
  const playerRef = useRef({
    x: 0,
    speed: 0,
    maxSpeed: 280,
    nitroActive: false,
    invincibleTimer: 0,
  });

  const keysRef = useRef<{ left: boolean; right: boolean; up: boolean; down: boolean; nitro: boolean }>({
    left: false,
    right: false,
    up: false,
    down: false,
    nitro: false,
  });

  const trafficRef = useRef<TrafficCar[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const roadCurveRef = useRef(0);
  const targetCurveRef = useRef(0);
  const roadOffsetRef = useRef(0);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keysRef.current.down = true;
      if (e.code === 'Space' || e.code === 'ShiftLeft') keysRef.current.nitro = true;
      if (e.code === 'KeyX' || e.code === 'KeyE') triggerEmp();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keysRef.current.down = false;
      if (e.code === 'Space' || e.code === 'ShiftLeft') keysRef.current.nitro = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [empCount, gameState]);

  const startGame = () => {
    soundFX.playSuccess();
    playerRef.current = {
      x: 0,
      speed: 120,
      maxSpeed: 280,
      nitroActive: false,
      invincibleTimer: 60,
    };
    trafficRef.current = [];
    particlesRef.current = [];
    roadOffsetRef.current = 0;
    setScore(0);
    setNitro(100);
    setEmpCount(2);
    setDistance(0);
    setGameState('playing');
  };

  const triggerEmp = () => {
    if (empCount <= 0 || gameState !== 'playing') return;
    setEmpCount(c => c - 1);
    soundFX.playLaser();

    // Spawn EMP blast particles
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 8;
      particlesRef.current.push({
        x: 0,
        y: 200,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 40,
        color: '#00f0ff',
      });
    }

    // Destroy nearby traffic cars
    trafficRef.current = trafficRef.current.filter(c => {
      if (c.z < 600) {
        setScore(s => s + 500);
        return false;
      }
      return true;
    });
  };

  // Main Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let spawnTimer = 0;

    const loop = () => {
      const width = canvas.width;
      const height = canvas.height;
      const player = playerRef.current;
      const keys = keysRef.current;

      // Handle Acceleration & Nitro
      let targetMaxSpeed = 280;
      if (keys.nitro && nitro > 0) {
        targetMaxSpeed = 420;
        player.nitroActive = true;
        setNitro(n => Math.max(0, n - 0.6));
        if (Math.random() > 0.4) soundFX.playClick(1400);
      } else {
        player.nitroActive = false;
        // Recharge nitro slowly
        setNitro(n => Math.min(100, n + 0.15));
      }

      if (keys.up) {
        player.speed = Math.min(targetMaxSpeed, player.speed + 3.5);
      } else if (keys.down) {
        player.speed = Math.max(40, player.speed - 6);
      } else {
        player.speed = Math.min(targetMaxSpeed, Math.max(120, player.speed - 0.5));
      }

      setSpeed(Math.round(player.speed));

      // Steering
      const steerSpeed = 0.045 * (player.speed / 200);
      if (keys.left) player.x = Math.max(-0.85, player.x - steerSpeed);
      if (keys.right) player.x = Math.min(0.85, player.x + steerSpeed);

      // Curve generation
      if (Math.random() < 0.02) {
        targetCurveRef.current = (Math.random() - 0.5) * 1.8;
      }
      roadCurveRef.current += (targetCurveRef.current - roadCurveRef.current) * 0.03;

      // Road scroll
      roadOffsetRef.current += player.speed * 0.15;
      setDistance(d => d + Math.round(player.speed * 0.01));
      setScore(s => s + Math.round(player.speed * 0.05));

      if (player.invincibleTimer > 0) player.invincibleTimer--;

      // Spawn traffic
      spawnTimer++;
      if (spawnTimer > Math.max(25, 60 - Math.floor(player.speed / 15))) {
        spawnTimer = 0;
        const types: ('sedan' | 'truck' | 'police' | 'energy')[] = ['sedan', 'truck', 'police', 'energy'];
        const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff66', '#9d00ff'];
        const chosenType = Math.random() < 0.25 ? 'energy' : types[Math.floor(Math.random() * (types.length - 1))];

        trafficRef.current.push({
          x: (Math.random() - 0.5) * 1.5,
          z: 1200,
          speed: chosenType === 'energy' ? 0 : 80 + Math.random() * 80,
          color: colors[Math.floor(Math.random() * colors.length)],
          type: chosenType,
        });
      }

      // Update traffic
      for (let i = trafficRef.current.length - 1; i >= 0; i--) {
        const car = trafficRef.current[i];
        car.z -= (player.speed - car.speed) * 0.15;

        // Collision check
        if (car.z > -20 && car.z < 50 && Math.abs(car.x - player.x) < 0.28) {
          if (car.type === 'energy') {
            // Pick up energy core!
            soundFX.playSuccess();
            setNitro(n => Math.min(100, n + 35));
            setScore(s => s + 1000);
            trafficRef.current.splice(i, 1);
            continue;
          } else if (player.invincibleTimer === 0) {
            // Crash!
            soundFX.playExplosion();
            setGameState('gameover');
            setHighScore(h => Math.max(h, score));
            return;
          }
        }

        // Offscreen removal
        if (car.z < -60) {
          trafficRef.current.splice(i, 1);
        }
      }

      // ---------------- RENDER ----------------
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, width, height);

      // Cyber Horizon & Sky
      const horizonY = height * 0.42;
      const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
      grad.addColorStop(0, '#04060e');
      grad.addColorStop(0.7, '#1b0e2b');
      grad.addColorStop(1, '#ff007f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, horizonY);

      // Distant neon grid mountains & Sun
      ctx.fillStyle = '#ffe600';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff007f';
      ctx.beginPath();
      ctx.arc(width / 2 + roadCurveRef.current * 80, horizonY - 10, 48, Math.PI, 0);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 3D Road Projection
      const numSegments = 160;
      for (let i = numSegments - 1; i >= 0; i--) {
        const z = i * 8;
        const nextZ = (i + 1) * 8;

        const k1 = 200 / (z + 100);
        const k2 = 200 / (nextZ + 100);

        const y1 = horizonY + (height - horizonY) * k1;
        const y2 = horizonY + (height - horizonY) * k2;

        const roadW1 = width * 1.4 * k1;
        const roadW2 = width * 1.4 * k2;

        const curveOffset1 = Math.pow(1 - k1, 2) * roadCurveRef.current * 180;
        const curveOffset2 = Math.pow(1 - k2, 2) * roadCurveRef.current * 180;

        const cx1 = width / 2 + curveOffset1;
        const cx2 = width / 2 + curveOffset2;

        const isAlt = Math.floor((z + roadOffsetRef.current) / 32) % 2 === 0;

        // Ground / Grass
        ctx.fillStyle = isAlt ? '#0b0818' : '#070512';
        ctx.fillRect(0, y2, width, y1 - y2);

        // Road Surface
        ctx.fillStyle = isAlt ? '#141829' : '#0f1220';
        ctx.beginPath();
        ctx.moveTo(cx1 - roadW1 / 2, y1);
        ctx.lineTo(cx1 + roadW1 / 2, y1);
        ctx.lineTo(cx2 + roadW2 / 2, y2);
        ctx.lineTo(cx2 - roadW2 / 2, y2);
        ctx.closePath();
        ctx.fill();

        // Neon Curbs
        const curbW1 = roadW1 * 0.08;
        const curbW2 = roadW2 * 0.08;
        ctx.fillStyle = isAlt ? '#ff007f' : '#00f0ff';
        ctx.shadowBlur = isAlt ? 8 : 4;
        ctx.shadowColor = ctx.fillStyle;

        // Left curb
        ctx.beginPath();
        ctx.moveTo(cx1 - roadW1 / 2 - curbW1, y1);
        ctx.lineTo(cx1 - roadW1 / 2, y1);
        ctx.lineTo(cx2 - roadW2 / 2, y2);
        ctx.lineTo(cx2 - roadW2 / 2 - curbW2, y2);
        ctx.fill();

        // Right curb
        ctx.beginPath();
        ctx.moveTo(cx1 + roadW1 / 2, y1);
        ctx.lineTo(cx1 + roadW1 / 2 + curbW1, y1);
        ctx.lineTo(cx2 + roadW2 / 2 + curbW2, y2);
        ctx.lineTo(cx2 + roadW2 / 2, y2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Center line
        if (isAlt) {
          const lineW1 = roadW1 * 0.02;
          const lineW2 = roadW2 * 0.02;
          ctx.fillStyle = '#ffe600';
          ctx.beginPath();
          ctx.moveTo(cx1 - lineW1 / 2, y1);
          ctx.lineTo(cx1 + lineW1 / 2, y1);
          ctx.lineTo(cx2 + lineW2 / 2, y2);
          ctx.lineTo(cx2 - lineW2 / 2, y2);
          ctx.fill();
        }
      }

      // Draw Traffic Cars & Energy Orbs
      trafficRef.current
        .slice()
        .sort((a, b) => b.z - a.z)
        .forEach(car => {
          if (car.z < 0 || car.z > 1200) return;
          const k = 200 / (car.z + 100);
          const y = horizonY + (height - horizonY) * k;
          const roadW = width * 1.4 * k;
          const curveOffset = Math.pow(1 - k, 2) * roadCurveRef.current * 180;
          const x = width / 2 + curveOffset + car.x * (roadW / 2);

          const carW = 75 * k;
          const carH = 45 * k;

          if (car.type === 'energy') {
            // Glowing Energy Core
            ctx.fillStyle = '#00ff66';
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#00ff66';
            ctx.beginPath();
            ctx.arc(x, y - carH / 2, carW * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y - carH / 2, carW * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            // Cyber Car Body
            ctx.fillStyle = car.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = car.color;
            ctx.fillRect(x - carW / 2, y - carH, carW, carH);

            // Taillights
            ctx.fillStyle = '#ff0033';
            ctx.fillRect(x - carW * 0.4, y - carH * 0.3, carW * 0.2, carH * 0.2);
            ctx.fillRect(x + carW * 0.2, y - carH * 0.3, carW * 0.2, carH * 0.2);
            ctx.shadowBlur = 0;
          }
        });

      // Draw Player Car
      const playerScreenX = width / 2 + player.x * (width * 0.42);
      const playerScreenY = height - 55;
      const pW = 86;
      const pH = 44;

      // Thruster Flame & Nitro Blast
      const thrusterColor = player.nitroActive ? '#00f0ff' : '#ff007f';
      ctx.fillStyle = thrusterColor;
      ctx.shadowBlur = player.nitroActive ? 25 : 12;
      ctx.shadowColor = thrusterColor;
      const flameLen = player.nitroActive ? 40 + Math.random() * 20 : 15 + Math.random() * 10;

      // Left thruster
      ctx.beginPath();
      ctx.moveTo(playerScreenX - 24, playerScreenY + 10);
      ctx.lineTo(playerScreenX - 16, playerScreenY + 10);
      ctx.lineTo(playerScreenX - 20, playerScreenY + 10 + flameLen);
      ctx.fill();

      // Right thruster
      ctx.beginPath();
      ctx.moveTo(playerScreenX + 16, playerScreenY + 10);
      ctx.lineTo(playerScreenX + 24, playerScreenY + 10);
      ctx.lineTo(playerScreenX + 20, playerScreenY + 10 + flameLen);
      ctx.fill();

      // Car Hull
      ctx.fillStyle = '#0a0f1d';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(playerScreenX - pW / 2, playerScreenY - pH, pW, pH, 6);
      ctx.fill();
      ctx.stroke();

      // Cockpit Glow
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(playerScreenX - 22, playerScreenY - pH + 8, 44, 14);

      // Tail Lights
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(playerScreenX - pW / 2 + 4, playerScreenY - 8, 16, 6);
      ctx.fillRect(playerScreenX + pW / 2 - 20, playerScreenY - 8, 16, 6);
      ctx.shadowBlur = 0;

      // Particle explosions / EMP render
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(width / 2 + p.x, height / 2 + p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        if (p.life <= 0) particlesRef.current.splice(i, 1);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, nitro, empCount, score]);

  return (
    <div className="flex flex-col h-full bg-[#05070f] text-slate-100 select-none overflow-hidden font-mono relative">
      {/* Top Game HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#090d18] border-b border-cyan-500/20 z-10 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">SPEED:</span>
            <span className="text-cyan-400 font-bold text-sm w-14">{speed} KM/H</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">DISTANCE:</span>
            <span className="text-yellow-400 font-bold">{distance} M</span>
          </div>
        </div>

        {/* Nitro bar */}
        <div className="flex items-center gap-2">
          <Flame className={`w-4 h-4 ${nitro > 25 ? 'text-cyan-400' : 'text-rose-500 animate-bounce'}`} />
          <div className="w-28 h-3 bg-black/60 rounded border border-cyan-500/30 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-75"
              style={{ width: `${nitro}%` }}
            />
          </div>
        </div>

        {/* Score & EMP */}
        <div className="flex items-center gap-4">
          <button
            onClick={triggerEmp}
            disabled={empCount <= 0}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold border ${
              empCount > 0
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 hover:bg-cyan-500/40'
                : 'bg-white/5 border-white/10 text-slate-500 opacity-50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            EMP ({empCount}) [X]
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">SCORE:</span>
            <span className="text-pink-400 font-bold text-sm">{score.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        <canvas ref={canvasRef} width={760} height={440} className="w-full h-full object-cover" />

        {/* Start / Menu Overlay */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6 z-20">
            <div className="text-3xl font-display font-black text-cyan-400 tracking-wider text-glow-cyan animate-pulse">
              NEON RACER 3D
            </div>
            <div className="text-xs text-slate-300 max-w-sm text-center leading-relaxed font-mono">
              Pilot your hyper-kinetic cyber interceptor down the infinite neon expressway.
              Dodge traffic, collect green Energy Orbs, deploy EMP shockwaves, and engage nitro boost!
            </div>

            <div className="flex flex-col gap-1.5 text-[11px] text-cyan-300/80 bg-cyan-950/40 p-3 rounded border border-cyan-500/20">
              <div>• <b>A / D or Left / Right:</b> Steer Left & Right</div>
              <div>• <b>W / S or Up / Down:</b> Accelerate / Brake</div>
              <div>• <b>SPACE / SHIFT:</b> Nitro Boost Overdrive</div>
              <div>• <b>X key:</b> Trigger EMP Shockwave</div>
            </div>

            <button
              onClick={startGame}
              className="mt-2 flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded shadow-neon-cyan active:scale-95 transition-all text-sm uppercase tracking-wider"
            >
              <Play className="w-4 h-4 fill-current" />
              LAUNCH DRIVE
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-4 p-6 z-20">
            <div className="text-3xl font-display font-black text-rose-500 text-glow-pink">
              SYSTEM CRASHED
            </div>
            <div className="text-sm text-slate-300 font-mono">
              Vehicle hull integrity compromised.
            </div>

            <div className="flex gap-6 bg-white/5 p-4 rounded-lg border border-white/10 text-center font-mono">
              <div>
                <div className="text-xs text-slate-400">FINAL SCORE</div>
                <div className="text-xl font-bold text-cyan-400">{score.toLocaleString()}</div>
              </div>
              <div className="border-l border-white/10 pl-6">
                <div className="text-xs text-slate-400">HIGH SCORE</div>
                <div className="text-xl font-bold text-yellow-400">{highScore.toLocaleString()}</div>
              </div>
            </div>

            <button
              onClick={startGame}
              className="mt-2 flex items-center gap-2 px-6 py-2 bg-pink-500 hover:bg-pink-400 text-white font-bold rounded shadow-neon-pink active:scale-95 transition-all text-sm uppercase"
            >
              <RotateCcw className="w-4 h-4" />
              REBOOT ENGINE
            </button>
          </div>
        )}
      </div>

      {/* On-Screen Mobile/Touch Controls */}
      <div className="flex md:hidden items-center justify-between p-2 bg-[#090d18] border-t border-cyan-500/20">
        <div className="flex gap-2">
          <button
            onMouseDown={() => (keysRef.current.left = true)}
            onMouseUp={() => (keysRef.current.left = false)}
            className="w-12 h-10 bg-white/10 active:bg-cyan-500 active:text-black rounded font-bold"
          >
            ←
          </button>
          <button
            onMouseDown={() => (keysRef.current.right = true)}
            onMouseUp={() => (keysRef.current.right = false)}
            className="w-12 h-10 bg-white/10 active:bg-cyan-500 active:text-black rounded font-bold"
          >
            →
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onMouseDown={() => (keysRef.current.nitro = true)}
            onMouseUp={() => (keysRef.current.nitro = false)}
            className="px-4 h-10 bg-pink-500/30 text-pink-300 active:bg-pink-500 active:text-white rounded font-bold text-xs"
          >
            NITRO
          </button>
          <button
            onClick={triggerEmp}
            className="px-4 h-10 bg-cyan-500/30 text-cyan-300 active:bg-cyan-500 active:text-black rounded font-bold text-xs"
          >
            EMP
          </button>
        </div>
      </div>
    </div>
  );
};

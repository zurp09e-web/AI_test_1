import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Rotate3d, Eye, Sliders, Layers, Sparkles, Volume2 } from 'lucide-react';
import { soundFX } from '../../audio/soundEngine';
import { synthEngine } from '../../audio/synthAudioContext';

type ModelType = 'tesseract' | 'core' | 'earth' | 'dna' | 'polyhedron' | 'torus';
type RenderStyle = 'wireframe' | 'particles' | 'solid';

export const HologramViewerApp: React.FC = () => {
  const [modelType, setModelType] = useState<ModelType>('core');
  const [renderStyle, setRenderStyle] = useState<RenderStyle>('wireframe');
  const [hologramColor, setHologramColor] = useState<string>('#00f0ff');
  const [rotationSpeed, setRotationSpeed] = useState<number>(1.2);
  const [audioReactive, setAudioReactive] = useState<boolean>(true);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const mouseRef = useRef<{ isDown: boolean; x: number; y: number; rx: number; ry: number }>({
    isDown: false,
    x: 0,
    y: 0,
    rx: 0,
    ry: 0,
  });

  // Re-build 3D Model whenever modelType, renderStyle, or hologramColor changes
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Group for the model
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    const color = new THREE.Color(hologramColor);

    // Create 3D geometry based on selected model
    if (modelType === 'core') {
      // Outer icosahedron
      const geo = new THREE.IcosahedronGeometry(2.2, 1);
      const mat = renderStyle === 'particles'
        ? new THREE.PointsMaterial({ color, size: 0.1, transparent: true, opacity: 0.85 })
        : new THREE.MeshBasicMaterial({ color, wireframe: renderStyle === 'wireframe', transparent: true, opacity: 0.75 });
      const mesh = renderStyle === 'particles' ? new THREE.Points(geo, mat) : new THREE.Mesh(geo, mat);
      group.add(mesh);

      // Inner glowing core
      const innerGeo = new THREE.SphereGeometry(1.2, 16, 16);
      const innerMat = new THREE.MeshBasicMaterial({ color: 0xff007f, wireframe: true });
      group.add(new THREE.Mesh(innerGeo, innerMat));

      // Orbital Rings
      const ringGeo = new THREE.TorusGeometry(3.2, 0.04, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe600, wireframe: true });
      const ring1 = new THREE.Mesh(ringGeo, ringMat);
      ring1.rotation.x = Math.PI / 3;
      group.add(ring1);
    } else if (modelType === 'tesseract') {
      // Outer Cube
      const outerGeo = new THREE.BoxGeometry(2.6, 2.6, 2.6);
      const mat1 = new THREE.MeshBasicMaterial({ color, wireframe: true });
      group.add(new THREE.Mesh(outerGeo, mat1));

      // Inner Cube
      const innerGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
      const mat2 = new THREE.MeshBasicMaterial({ color: 0xff007f, wireframe: true });
      group.add(new THREE.Mesh(innerGeo, mat2));
    } else if (modelType === 'earth') {
      // Earth Globe
      const globeGeo = new THREE.SphereGeometry(2.2, 24, 24);
      const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.8 });
      group.add(new THREE.Mesh(globeGeo, mat));

      // Orbiting Satellites (Points)
      const satGeo = new THREE.BufferGeometry();
      const satPos = new Float32Array(60 * 3);
      for (let i = 0; i < 60 * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 2.8 + Math.random() * 0.8;
        satPos[i] = r * Math.sin(phi) * Math.cos(theta);
        satPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        satPos[i + 2] = r * Math.cos(phi);
      }
      satGeo.setAttribute('position', new THREE.BufferAttribute(satPos, 3));
      const satMat = new THREE.PointsMaterial({ color: 0x00ff66, size: 0.12 });
      group.add(new THREE.Points(satGeo, satMat));
    } else if (modelType === 'dna') {
      // DNA Double Helix
      const numPoints = 80;
      const strand1: THREE.Vector3[] = [];
      const strand2: THREE.Vector3[] = [];

      for (let i = 0; i < numPoints; i++) {
        const t = (i / numPoints) * Math.PI * 6;
        const y = (i / numPoints) * 5 - 2.5;
        const r = 1.2;
        strand1.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r));
        strand2.push(new THREE.Vector3(Math.cos(t + Math.PI) * r, y, Math.sin(t + Math.PI) * r));

        // Base pairs connectors
        if (i % 3 === 0) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([strand1[i], strand2[i]]);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xff007f });
          group.add(new THREE.Line(lineGeo, lineMat));
        }
      }

      const pGeo1 = new THREE.BufferGeometry().setFromPoints(strand1);
      const pGeo2 = new THREE.BufferGeometry().setFromPoints(strand2);
      const pMat = new THREE.PointsMaterial({ color, size: 0.14 });
      group.add(new THREE.Points(pGeo1, pMat));
      group.add(new THREE.Points(pGeo2, pMat));
    } else if (modelType === 'torus') {
      const geo = new THREE.TorusKnotGeometry(1.6, 0.45, 100, 16);
      const mat = new THREE.MeshBasicMaterial({ color, wireframe: renderStyle === 'wireframe' });
      group.add(new THREE.Mesh(geo, mat));
    } else if (modelType === 'polyhedron') {
      const geo = new THREE.DodecahedronGeometry(2.2);
      const mat = new THREE.MeshBasicMaterial({ color, wireframe: true });
      group.add(new THREE.Mesh(geo, mat));
    }

    // Animation Loop
    let animId: number;
    const freqData = new Uint8Array(32);

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (groupRef.current) {
        const mouse = mouseRef.current;
        if (!mouse.isDown) {
          groupRef.current.rotation.y += 0.008 * rotationSpeed;
          groupRef.current.rotation.x += 0.004 * rotationSpeed;
        } else {
          groupRef.current.rotation.y = mouse.ry;
          groupRef.current.rotation.x = mouse.rx;
        }

        // Audio reactivity
        if (audioReactive) {
          synthEngine.getVisualizerData(freqData, new Uint8Array(32));
          let avg = 0;
          for (let i = 0; i < 16; i++) avg += freqData[i];
          avg = avg / 16 / 255; // 0 to 1

          const targetScale = 1.0 + avg * 0.4;
          groupRef.current.scale.set(targetScale, targetScale, targetScale);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [modelType, renderStyle, hologramColor, rotationSpeed, audioReactive]);

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseRef.current.isDown = true;
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseRef.current.isDown || !groupRef.current) return;
    const dx = e.clientX - mouseRef.current.x;
    const dy = e.clientY - mouseRef.current.y;
    mouseRef.current.ry += dx * 0.01;
    mouseRef.current.rx += dy * 0.01;
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  return (
    <div className="flex flex-col h-full bg-[#050813] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#0c1224] border-b border-cyan-500/20">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'core', label: 'NEURAL CORE' },
            { id: 'tesseract', label: '4D TESSERACT' },
            { id: 'earth', label: 'ORBITAL GRID' },
            { id: 'dna', label: 'DNA HELIX' },
            { id: 'torus', label: 'KNOT MATRIX' },
            { id: 'polyhedron', label: 'POLYHEDRON' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => {
                setModelType(m.id as any);
                soundFX.playClick(1000);
              }}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                modelType === m.id
                  ? 'bg-cyan-500 text-black shadow-neon-cyan'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Audio Reactivity Toggle */}
        <button
          onClick={() => {
            setAudioReactive(!audioReactive);
            soundFX.playClick();
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border ${
            audioReactive
              ? 'bg-purple-950/60 border-purple-500 text-purple-300 shadow-neon-purple'
              : 'bg-white/5 border-white/10 text-slate-500'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          {audioReactive ? 'AUDIO-REACTIVE: ON' : 'AUDIO-REACTIVE: OFF'}
        </button>
      </div>

      {/* Main 3D Viewport */}
      <div className="flex-1 flex overflow-hidden">
        <div
          ref={mountRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 cursor-grab active:cursor-grabbing relative bg-gradient-radial from-[#0a1226] to-[#04060c] flex items-center justify-center"
        >
          {/* Hologram Reticle overlay */}
          <div className="absolute inset-4 pointer-events-none border border-cyan-500/15 rounded-lg flex flex-col justify-between p-3 text-[10px] font-mono text-cyan-400/50">
            <div className="flex justify-between">
              <span>HOLOGRAM MATRIX PROJECTION // 60 FPS</span>
              <span>RENDER: {renderStyle.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>DRAG TO ROTATE // INTERACTIVE 3D WEBGL</span>
              <span>BEAM COLOR: {hologramColor.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Right Settings */}
        <div className="w-56 bg-[#0a0f20] border-l border-cyan-500/20 p-3 flex flex-col gap-3">
          <div className="text-xs font-mono font-bold text-cyan-400 border-b border-cyan-500/20 pb-1.5 flex items-center gap-1.5">
            <Sliders className="w-4 h-4" />
            HOLOGRAM SETTINGS
          </div>

          {/* Render Mode */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono text-slate-400">PROJECTION STYLE</span>
            <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
              {(['wireframe', 'particles', 'solid'] as RenderStyle[]).map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setRenderStyle(s);
                    soundFX.playClick(900);
                  }}
                  className={`py-1 rounded capitalize font-bold border ${
                    renderStyle === s
                      ? 'bg-cyan-500 text-black border-cyan-300'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono text-slate-400">LASER TINT</span>
            <div className="flex gap-2">
              {['#00f0ff', '#ff007f', '#00ff66', '#ffe600', '#9d00ff'].map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setHologramColor(c);
                    soundFX.playClick(1100);
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    hologramColor === c ? 'scale-110 border-white shadow-lg' : 'border-transparent opacity-70'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Rotation speed */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">ROTATION SPEED</span>
              <span className="text-cyan-300">{rotationSpeed}x</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.2"
              value={rotationSpeed}
              onChange={e => setRotationSpeed(Number(e.target.value))}
              className="accent-cyan-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

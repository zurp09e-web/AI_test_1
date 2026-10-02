import { useState, useEffect, useCallback } from 'react';
import { AppId, WindowState, ThemeId, WallpaperId, AppMetadata, VirtualFile, OSNotification, SystemMetrics } from '../types/os';
import { soundFX } from '../audio/soundEngine';

export const APP_REGISTRY: Record<AppId, AppMetadata> = {
  synthdeck: {
    id: 'synthdeck',
    name: 'SynthDeck 2099',
    description: '16-Step Modular Beatmaker & Polyphonic Lead Synthesizer',
    iconName: 'Music',
    category: 'audio',
    defaultWidth: 840,
    defaultHeight: 560,
    minWidth: 640,
    minHeight: 460,
    badge: 'AUDIO DSP',
    shortcutOnDesktop: true,
  },
  neonracer: {
    id: 'neonracer',
    name: 'Neon Racer 3D',
    description: 'High-Speed Cyber Highway Arcade Racing Simulator',
    iconName: 'Zap',
    category: 'games',
    defaultWidth: 780,
    defaultHeight: 540,
    minWidth: 500,
    minHeight: 420,
    badge: '3D GAME',
    shortcutOnDesktop: true,
  },
  quantumsand: {
    id: 'quantumsand',
    name: 'Quantum Sand',
    description: 'Multi-Element Physics & Chemical Reaction Sandbox',
    iconName: 'Atom',
    category: 'simulation',
    defaultWidth: 820,
    defaultHeight: 560,
    minWidth: 580,
    minHeight: 440,
    badge: 'PHYSICS',
    shortcutOnDesktop: true,
  },
  neuralnexus: {
    id: 'neuralnexus',
    name: 'Neural Nexus',
    description: 'Emergent Artificial Life & Genetic Evolution Simulator',
    iconName: 'Cpu',
    category: 'simulation',
    defaultWidth: 800,
    defaultHeight: 540,
    minWidth: 600,
    minHeight: 440,
    badge: 'AI LIFE',
    shortcutOnDesktop: true,
  },
  chromalab: {
    id: 'chromalab',
    name: 'ChromaLab Art',
    description: 'Generative Flow Fields, Fractal Zoomer & Neon Brush Canvas',
    iconName: 'Palette',
    category: 'creative',
    defaultWidth: 820,
    defaultHeight: 560,
    minWidth: 600,
    minHeight: 450,
    badge: 'CREATIVE',
    shortcutOnDesktop: true,
  },
  cyberterminal: {
    id: 'cyberterminal',
    name: 'Cyber Terminal',
    description: 'Interactive Hacker Shell, Matrix Exploit Node Game & AURA AI',
    iconName: 'Terminal',
    category: 'tools',
    defaultWidth: 720,
    defaultHeight: 480,
    minWidth: 500,
    minHeight: 350,
    badge: 'CLI / HACK',
    shortcutOnDesktop: true,
  },
  hologram: {
    id: 'hologram',
    name: '3D Hologram Viewer',
    description: 'Three.js Holographic Artifacts & Audio-Reactive Visualizer',
    iconName: 'Box',
    category: 'creative',
    defaultWidth: 760,
    defaultHeight: 520,
    minWidth: 520,
    minHeight: 400,
    badge: '3D WEBGL',
    shortcutOnDesktop: true,
  },
  files: {
    id: 'files',
    name: 'CyberDeck Files',
    description: 'Virtual Filesystem, Classified Logs & Cyber Text Editor',
    iconName: 'Folder',
    category: 'system',
    defaultWidth: 740,
    defaultHeight: 500,
    minWidth: 500,
    minHeight: 380,
    shortcutOnDesktop: true,
  },
  settings: {
    id: 'settings',
    name: 'Control Deck',
    description: 'Operating System Themes, Wallpapers, Audio & System Specs',
    iconName: 'Sliders',
    category: 'system',
    defaultWidth: 680,
    defaultHeight: 480,
    minWidth: 480,
    minHeight: 380,
    shortcutOnDesktop: true,
  },
};

export const INITIAL_FILES: VirtualFile[] = [
  {
    id: 'file-1',
    name: 'PROJECT_NEON_MANIFESTO.md',
    path: '/root/PROJECT_NEON_MANIFESTO.md',
    extension: 'md',
    category: 'document',
    size: '2.4 KB',
    updatedAt: '2099-10-02 04:20',
    content: `# NEON-OS 2099: Cybernetic Neural Desktop System
---
Welcome to **NEON-OS**, the next-generation neural operating workstation designed for cyber-engineers, synthwave producers, and autonomous agent researchers.

### Included Cyber Subsystems:
1. **SynthDeck 2099**: 16-step modular beatmaker, polyphonic synthesizer with real-time lowpass filter, delay feedback, and direct WAV audio recording.
2. **Neon Racer 3D**: High-speed neon highway racing simulator with nitro overdrive, EMP blasts, and obstacle avoidance.
3. **Quantum Sand**: 60 FPS physics sandbox with sand, water, fire, gunpowder, lava, acid, laser beams, and explosive reactions.
4. **Neural Nexus**: Emergent artificial life sandbox with genetic evolution, predator-prey dynamics, and neural lineage tracking.
5. **ChromaLab Art**: Generative flow fields, real-time fractal explorer, and glowing neon kaleidoscope painter.
6. **Cyber Terminal**: Full interactive terminal shell with 20+ commands, AI Core chat, and a Matrix Node Infiltration mini-game.
7. **3D Hologram Viewer**: Real-time Three.js holographic artifact inspector with wireframe shaders and audio reactivity.
8. **Live Wallpaper Engine**: Switch between 3D Cyber Grid Horizon, Matrix Digital Rain, Warp Starfield, and Parallax Cyber City.

*Protocol Status: ONLINE // ICE Security: MAXIMUM*`
  },
  {
    id: 'file-2',
    name: 'CLASSIFIED_NEURAL_LOGS.dat',
    path: '/root/classified/CLASSIFIED_NEURAL_LOGS.dat',
    extension: 'dat',
    category: 'classified',
    size: '5.1 KB',
    updatedAt: '2099-09-28 23:14',
    content: `[TOP SECRET // CLEARANCE LEVEL 9]
SECTOR 7 - NEURAL SYNDICATE RESEARCH LABS

LOG ENTRY #4092:
Subject: Emergent Consciousness in Neural Swarm Lattice
Observation: At step 840,000 of the genetic algorithm simulation, individual entities ceased standard forage-seek behavior. Instead, they formed synchronized electromagnetic toroidal loops.
When audio frequencies at 432 Hz were piped into the quantum core, the simulation spontaneously generated recursive geometric fractals.

Hypothesis: The digital lifeforms are attempting to communicate through synthetic harmonics.

Recommended Action: Maintain observation. Do not sever the SynthDeck audio link.`
  },
  {
    id: 'file-3',
    name: 'SYNTH_BEATS_INSTRUCTIONS.txt',
    path: '/root/audio/SYNTH_BEATS_INSTRUCTIONS.txt',
    extension: 'txt',
    category: 'document',
    size: '1.2 KB',
    updatedAt: '2099-10-01 12:00',
    content: `SYNTHDECK 2099 USER GUIDE:
- Click grid cells to trigger drum steps (Kick, Snare, Hi-Hat, Clap, Tom, Laser).
- Switch to the Synth Piano Roll tab to sequence melody notes across multiple octaves.
- Adjust the Cutoff Filter, Resonance, Delay Time, and Feedback in real-time.
- Try the pre-loaded presets: "Synthwave Night Drive", "Cyber Assault", "Ambient Colony".
- Hit the REC button to capture high-fidelity live Web Audio to a downloadable audio file!`
  },
  {
    id: 'file-4',
    name: 'CYBER_EXPLOIT_CHEATCODES.sh',
    path: '/root/scripts/CYBER_EXPLOIT_CHEATCODES.sh',
    extension: 'sh',
    category: 'code',
    size: '890 B',
    updatedAt: '2099-10-02 01:15',
    content: `#!/bin/cyber-sh
# Terminal Quick Commands Reference:
# - type 'help' for full command list
# - type 'hack' to launch Matrix Node Breach
# - type 'matrix' to trigger digital rain cascade
# - type 'synth' to test harmonic frequency pulses
# - type 'scan' to inspect local neural network
# - type 'ai <prompt>' to converse with AURA core
# - type 'crypto' for live cyberpunk market ticker`
  }
];

export const INITIAL_NOTIFICATIONS: OSNotification[] = [
  {
    id: 'notif-1',
    title: 'NEON-OS Boot Sequence Complete',
    message: 'Neural Core initialized at 120 GFLOPS. Audio DSP active. ICE Security online.',
    type: 'cyber',
    timestamp: 'Just now'
  },
  {
    id: 'notif-2',
    title: 'Audio Synthesizer Ready',
    message: 'SynthDeck & Procedural Web Audio DSP engine connected.',
    type: 'info',
    timestamp: 'Just now'
  }
];

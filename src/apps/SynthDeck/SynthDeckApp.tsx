import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, RotateCcw, Shuffle, Download, Radio, Sliders, Music, Disc } from 'lucide-react';
import { synthEngine, SynthWaveform } from '../../audio/synthAudioContext';
import { soundFX } from '../../audio/soundEngine';

interface Preset {
  name: string;
  bpm: number;
  waveform: SynthWaveform;
  cutoff: number;
  resonance: number;
  delayTime: number;
  delayFeedback: number;
  drums: boolean[][];
  synthNotes: number[][]; // 16 steps, array of midi/freq indices
}

const DRUM_TRACKS = [
  { name: 'KICK 808', type: 'kick' as const, color: '#ff0055' },
  { name: 'SNARE', type: 'snare' as const, color: '#00f0ff' },
  { name: 'HI-HAT CL', type: 'hihat' as const, color: '#ffe600' },
  { name: 'HI-HAT OP', type: 'openhat' as const, color: '#ff9900' },
  { name: 'CLAP', type: 'clap' as const, color: '#00ff66' },
  { name: 'LASER FX', type: 'laser' as const, color: '#9d00ff' },
];

const NOTES = [
  { name: 'C5', freq: 523.25 },
  { name: 'B4', freq: 493.88 },
  { name: 'A4', freq: 440.00 },
  { name: 'G4', freq: 392.00 },
  { name: 'F4', freq: 349.23 },
  { name: 'E4', freq: 329.63 },
  { name: 'D4', freq: 293.66 },
  { name: 'C4', freq: 261.63 },
  { name: 'A3', freq: 220.00 },
  { name: 'F3', freq: 174.61 },
];

const PRESETS: Preset[] = [
  {
    name: 'Synthwave Night Drive',
    bpm: 118,
    waveform: 'sawtooth',
    cutoff: 2800,
    resonance: 5,
    delayTime: 0.25,
    delayFeedback: 0.35,
    drums: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Snare
      [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],             // HiHat
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // OpenHat
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, true, false, false, false, false, false, false, true, false],
    ],
    synthNotes: [
      [7], [], [7], [], [5], [], [7], [3],
      [7], [], [7], [], [5], [], [2], [0]
    ]
  },
  {
    name: 'Cyber Assault 2099',
    bpm: 135,
    waveform: 'square',
    cutoff: 3500,
    resonance: 8,
    delayTime: 0.18,
    delayFeedback: 0.45,
    drums: [
      [true, false, false, true, false, false, true, false, true, false, false, true, false, false, true, false],
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, true],
      [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      [false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true],
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
    ],
    synthNotes: [
      [0], [2], [0], [3], [0], [5], [0], [7],
      [8], [7], [5], [3], [2], [0], [2], [0]
    ]
  },
  {
    name: 'Ambient Colony',
    bpm: 85,
    waveform: 'sine',
    cutoff: 1400,
    resonance: 2,
    delayTime: 0.45,
    delayFeedback: 0.6,
    drums: [
      [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false, true, false, false, false],
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, true, false, false, false, false, false, false, false, false, false, false, false],
    ],
    synthNotes: [
      [0], [], [], [2], [], [], [3], [],
      [5], [], [], [7], [], [], [8], []
    ]
  }
];

export const SynthDeckApp: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(118);
  const [activeTab, setActiveTab] = useState<'drums' | 'synth' | 'keyboard'>('drums');
  const [waveform, setWaveform] = useState<SynthWaveform>('sawtooth');
  const [cutoff, setCutoff] = useState(2800);
  const [resonance, setResonance] = useState(5);
  const [delayTime, setDelayTime] = useState(0.25);
  const [delayFeedback, setDelayFeedback] = useState(0.35);
  const [volume, setVolume] = useState(0.7);

  // Sequencer Grid Data
  const [drumGrid, setDrumGrid] = useState<boolean[][]>(PRESETS[0].drums);
  const [synthGrid, setSynthGrid] = useState<number[][]>(PRESETS[0].synthNotes);

  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  const drumGridRef = useRef(drumGrid);
  drumGridRef.current = drumGrid;

  const synthGridRef = useRef(synthGrid);
  synthGridRef.current = synthGrid;

  // Sync engine params
  useEffect(() => {
    synthEngine.updateParameters({
      waveform,
      cutoff,
      resonance,
      delayTime,
      delayFeedback,
      volume,
    });
  }, [waveform, cutoff, resonance, delayTime, delayFeedback, volume]);

  // Master Clock Loop
  useEffect(() => {
    if (!isPlaying) return;

    synthEngine.init();
    const stepInterval = (60 / bpm / 4) * 1000; // 16th notes

    const interval = setInterval(() => {
      const step = (currentStepRef.current + 1) % 16;
      setCurrentStep(step);

      // Play drums for this step
      DRUM_TRACKS.forEach((track, trackIdx) => {
        if (drumGridRef.current[trackIdx]?.[step]) {
          synthEngine.playDrum(track.type);
        }
      });

      // Play synth notes for this step
      const noteIndices = synthGridRef.current[step];
      if (noteIndices && noteIndices.length > 0) {
        noteIndices.forEach(noteIdx => {
          if (NOTES[noteIdx]) {
            synthEngine.playNote(NOTES[noteIdx].freq, 0.22);
          }
        });
      }
    }, stepInterval);

    return () => clearInterval(interval);
  }, [isPlaying, bpm]);

  // Record timer
  useEffect(() => {
    let timer: number;
    if (isRecording) {
      timer = window.setInterval(() => setRecordTimer(t => t + 1), 1000);
    } else {
      setRecordTimer(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Oscilloscope & Visualizer Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqData = new Uint8Array(128);
    const timeData = new Uint8Array(128);
    let animId: number;

    const draw = () => {
      animId = requestAnimationFrame(draw);
      synthEngine.getVisualizerData(freqData, timeData);

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#090d18';
      ctx.fillRect(0, 0, w, h);

      // Draw frequency spectrum bars
      const barWidth = (w / freqData.length) * 2;
      for (let i = 0; i < freqData.length / 2; i++) {
        const val = freqData[i] / 255;
        const barHeight = val * (h * 0.7);
        const hue = 180 + (i / freqData.length) * 160;
        ctx.fillStyle = `hsl(${hue}, 100%, 55%)`;
        ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
      }

      // Draw oscilloscope wave
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      const sliceWidth = w / timeData.length;
      let x = 0;

      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  const toggleDrumCell = (trackIdx: number, stepIdx: number) => {
    soundFX.playClick(800);
    setDrumGrid(prev => {
      const next = prev.map(row => [...row]);
      next[trackIdx][stepIdx] = !next[trackIdx][stepIdx];
      return next;
    });
  };

  const toggleSynthCell = (noteIdx: number, stepIdx: number) => {
    soundFX.playClick(1000);
    synthEngine.playNote(NOTES[noteIdx].freq, 0.2);
    setSynthGrid(prev => {
      const next = prev.map(stepNotes => [...stepNotes]);
      const currentNotes = next[stepIdx] || [];
      if (currentNotes.includes(noteIdx)) {
        next[stepIdx] = currentNotes.filter(n => n !== noteIdx);
      } else {
        next[stepIdx] = [...currentNotes, noteIdx];
      }
      return next;
    });
  };

  const loadPreset = (preset: Preset) => {
    soundFX.playSuccess();
    setBpm(preset.bpm);
    setWaveform(preset.waveform);
    setCutoff(preset.cutoff);
    setResonance(preset.resonance);
    setDelayTime(preset.delayTime);
    setDelayFeedback(preset.delayFeedback);
    setDrumGrid(preset.drums);
    setSynthGrid(preset.synthNotes);
  };

  const clearAll = () => {
    soundFX.playClick(400);
    setDrumGrid(DRUM_TRACKS.map(() => Array(16).fill(false)));
    setSynthGrid(Array.from({ length: 16 }, () => []));
  };

  const randomize = () => {
    soundFX.playClick(1200);
    const newDrums = DRUM_TRACKS.map((t, idx) => {
      return Array.from({ length: 16 }, (_, step) => {
        if (idx === 0) return step % 4 === 0 || (step === 10 && Math.random() > 0.5); // Kick
        if (idx === 1) return step % 8 === 4; // Snare
        if (idx === 2) return Math.random() > 0.3; // HiHat
        return Math.random() > 0.8;
      });
    });
    const newSynth = Array.from({ length: 16 }, () => {
      if (Math.random() > 0.4) {
        return [Math.floor(Math.random() * NOTES.length)];
      }
      return [];
    });
    setDrumGrid(newDrums);
    setSynthGrid(newSynth);
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      synthEngine.init();
      const ok = synthEngine.startRecording();
      if (ok) {
        setIsRecording(true);
        soundFX.playSuccess();
      }
    } else {
      const blob = await synthEngine.stopRecording();
      setIsRecording(false);
      if (blob) {
        soundFX.playSuccess();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `synthdeck_track_${Date.now()}.webm`;
        a.click();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080c16] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header / Transport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0f1627] border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              synthEngine.init();
              setIsPlaying(!isPlaying);
              soundFX.playClick(isPlaying ? 500 : 900);
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded font-mono font-bold text-xs uppercase tracking-wider transition-all ${
              isPlaying
                ? 'bg-rose-500 text-white shadow-neon-pink'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-neon-cyan'
            }`}
          >
            {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isPlaying ? 'PAUSE' : 'PLAY LOOP'}
          </button>

          {/* BPM slider */}
          <div className="flex items-center gap-2 bg-[#080d19] px-3 py-1 rounded border border-white/10 text-xs font-mono">
            <span className="text-cyan-400">BPM:</span>
            <span className="font-bold w-7 text-right text-yellow-300">{bpm}</span>
            <input
              type="range"
              min="60"
              max="180"
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              className="w-20 accent-cyan-400"
            />
          </div>

          {/* Record button */}
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all border ${
              isRecording
                ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                : 'bg-white/5 border-white/10 hover:border-red-400/50 text-slate-300'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isRecording ? 'text-red-500' : 'text-slate-400'}`} />
            {isRecording ? `REC ${recordTimer}s` : 'RECORD'}
          </button>
        </div>

        {/* Visualizer & Presets */}
        <div className="flex items-center gap-3">
          <div className="relative w-36 h-8 rounded overflow-hidden border border-cyan-500/30">
            <canvas ref={canvasRef} width={144} height={32} className="w-full h-full" />
          </div>

          {/* Preset selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-slate-400">PRESET:</span>
            <select
              onChange={e => {
                const p = PRESETS.find(x => x.name === e.target.value);
                if (p) loadPreset(p);
              }}
              className="bg-[#080d19] border border-cyan-500/30 text-cyan-300 rounded px-2 py-1 text-xs font-mono outline-none cursor-pointer"
            >
              {PRESETS.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={randomize}
            title="Randomize Pattern"
            className="p-1.5 bg-white/5 hover:bg-white/10 text-yellow-400 rounded border border-white/10"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearAll}
            title="Clear All"
            className="p-1.5 bg-white/5 hover:bg-white/10 text-rose-400 rounded border border-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Tracks / Sequencer Workspace */}
        <div className="flex-1 flex flex-col p-3 overflow-y-auto">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => {
                setActiveTab('drums');
                soundFX.playClick();
              }}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                activeTab === 'drums'
                  ? 'bg-cyan-500 text-black shadow-neon-cyan'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              16-STEP DRUMS
            </button>
            <button
              onClick={() => {
                setActiveTab('synth');
                soundFX.playClick();
              }}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                activeTab === 'synth'
                  ? 'bg-pink-500 text-white shadow-neon-pink'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              SYNTH PIANO ROLL
            </button>
            <button
              onClick={() => {
                setActiveTab('keyboard');
                soundFX.playClick();
              }}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                activeTab === 'keyboard'
                  ? 'bg-yellow-400 text-black shadow-neon-yellow'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              LIVE CYBER KEYBOARD
            </button>
          </div>

          {/* TAB 1: Drum Sequencer */}
          {activeTab === 'drums' && (
            <div className="flex-1 flex flex-col gap-1.5 bg-[#0a0f1d] p-3 rounded-lg border border-cyan-500/20">
              {/* Step numbers header */}
              <div className="flex items-center gap-1.5 pl-24">
                {Array.from({ length: 16 }).map((_, step) => (
                  <div
                    key={step}
                    className={`flex-1 text-center font-mono text-[10px] py-0.5 rounded transition-colors ${
                      currentStep === step && isPlaying
                        ? 'bg-cyan-400 text-black font-bold'
                        : step % 4 === 0
                        ? 'text-cyan-300 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {step + 1}
                  </div>
                ))}
              </div>

              {/* Drum Track Rows */}
              {DRUM_TRACKS.map((track, tIdx) => (
                <div key={track.name} className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      synthEngine.init();
                      synthEngine.playDrum(track.type);
                    }}
                    className="w-24 text-left font-mono text-[11px] font-bold px-2 py-2 rounded bg-white/5 hover:bg-white/10 transition-colors truncate"
                    style={{ color: track.color }}
                  >
                    {track.name}
                  </button>

                  <div className="flex-1 flex items-center gap-1.5">
                    {Array.from({ length: 16 }).map((_, stepIdx) => {
                      const isActive = drumGrid[tIdx]?.[stepIdx];
                      const isCurrent = currentStep === stepIdx && isPlaying;
                      return (
                        <button
                          key={stepIdx}
                          onClick={() => toggleDrumCell(tIdx, stepIdx)}
                          className={`flex-1 h-9 rounded transition-all transform active:scale-95 border ${
                            isActive
                              ? 'border-transparent shadow-md'
                              : isCurrent
                              ? 'border-cyan-400/80 bg-cyan-900/40'
                              : stepIdx % 4 === 0
                              ? 'border-white/10 bg-[#131b2e] hover:bg-[#1a253f]'
                              : 'border-white/5 bg-[#0e1424] hover:bg-[#151e36]'
                          }`}
                          style={{
                            backgroundColor: isActive ? track.color : undefined,
                            boxShadow: isActive ? `0 0 8px ${track.color}` : undefined,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Synth Piano Roll */}
          {activeTab === 'synth' && (
            <div className="flex-1 flex flex-col gap-1 bg-[#0a0f1d] p-3 rounded-lg border border-pink-500/20 overflow-y-auto max-h-[340px]">
              {/* Step indicator */}
              <div className="flex items-center gap-1.5 pl-14">
                {Array.from({ length: 16 }).map((_, step) => (
                  <div
                    key={step}
                    className={`flex-1 text-center font-mono text-[10px] py-0.5 rounded ${
                      currentStep === step && isPlaying
                        ? 'bg-pink-500 text-white font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {step + 1}
                  </div>
                ))}
              </div>

              {NOTES.map((note, noteIdx) => (
                <div key={note.name} className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      synthEngine.init();
                      synthEngine.playNote(note.freq, 0.3);
                    }}
                    className="w-14 text-center font-mono text-[11px] font-bold py-1.5 rounded bg-pink-950/40 hover:bg-pink-900/60 text-pink-300 border border-pink-500/20"
                  >
                    {note.name}
                  </button>

                  <div className="flex-1 flex items-center gap-1.5">
                    {Array.from({ length: 16 }).map((_, stepIdx) => {
                      const isActive = synthGrid[stepIdx]?.includes(noteIdx);
                      const isCurrent = currentStep === stepIdx && isPlaying;
                      return (
                        <button
                          key={stepIdx}
                          onClick={() => toggleSynthCell(noteIdx, stepIdx)}
                          className={`flex-1 h-6 rounded transition-all border ${
                            isActive
                              ? 'bg-pink-500 border-pink-300 shadow-neon-pink'
                              : isCurrent
                              ? 'bg-pink-900/40 border-pink-400'
                              : stepIdx % 4 === 0
                              ? 'bg-[#151c2e] border-white/10 hover:bg-[#1f2a44]'
                              : 'bg-[#0f1422] border-white/5 hover:bg-[#182138]'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Live Cyber Keyboard */}
          {activeTab === 'keyboard' && (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0f1d] p-6 rounded-lg border border-yellow-500/20">
              <div className="text-xs font-mono text-slate-400 mb-4 text-center">
                Click keys or press corresponding keyboard letters to play lead synth live!
              </div>

              <div className="flex gap-2">
                {[
                  { note: 'C4', key: 'A', freq: 261.63 },
                  { note: 'D4', key: 'S', freq: 293.66 },
                  { note: 'E4', key: 'D', freq: 329.63 },
                  { note: 'F4', key: 'F', freq: 349.23 },
                  { note: 'G4', key: 'G', freq: 392.00 },
                  { note: 'A4', key: 'H', freq: 440.00 },
                  { note: 'B4', key: 'J', freq: 493.88 },
                  { note: 'C5', key: 'K', freq: 523.25 },
                ].map(k => (
                  <button
                    key={k.note}
                    onMouseDown={() => {
                      synthEngine.init();
                      synthEngine.playNote(k.freq, 0.4);
                    }}
                    className="w-14 h-36 bg-gradient-to-b from-white/90 to-white/70 hover:from-cyan-200 hover:to-cyan-400 text-black font-mono font-bold rounded-b flex flex-col justify-end items-center pb-3 shadow-lg active:translate-y-1 transition-all border-b-4 border-cyan-600"
                  >
                    <span className="text-xs text-slate-700">{k.key}</span>
                    <span className="text-sm">{k.note}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Synth DSP Sound Tweaker */}
        <div className="w-full md:w-64 bg-[#0a0f1e] p-3 border-t md:border-t-0 md:border-l border-cyan-500/20 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 font-bold border-b border-cyan-500/20 pb-1.5">
            <Sliders className="w-4 h-4" />
            SYNTH DSP ENGINE
          </div>

          {/* Waveform Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono text-slate-400">OSCILLATOR WAVE</label>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
              {(['sawtooth', 'square', 'sine', 'triangle'] as SynthWaveform[]).map(w => (
                <button
                  key={w}
                  onClick={() => {
                    setWaveform(w);
                    soundFX.playClick(900);
                  }}
                  className={`py-1 px-2 rounded uppercase font-semibold transition-colors border ${
                    waveform === w
                      ? 'bg-cyan-500 text-black border-cyan-300'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Cutoff Filter */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">FILTER CUTOFF</span>
              <span className="text-cyan-300">{cutoff} Hz</span>
            </div>
            <input
              type="range"
              min="200"
              max="8000"
              step="50"
              value={cutoff}
              onChange={e => setCutoff(Number(e.target.value))}
              className="accent-cyan-400"
            />
          </div>

          {/* Resonance Q */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">RESONANCE (Q)</span>
              <span className="text-pink-300">{resonance}</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={resonance}
              onChange={e => setResonance(Number(e.target.value))}
              className="accent-pink-400"
            />
          </div>

          {/* Delay Time */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">DELAY TIME</span>
              <span className="text-yellow-300">{Math.round(delayTime * 1000)} ms</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.8"
              step="0.01"
              value={delayTime}
              onChange={e => setDelayTime(Number(e.target.value))}
              className="accent-yellow-400"
            />
          </div>

          {/* Delay Feedback */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">DELAY FEEDBACK</span>
              <span className="text-green-300">{Math.round(delayFeedback * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={delayFeedback}
              onChange={e => setDelayFeedback(Number(e.target.value))}
              className="accent-green-400"
            />
          </div>

          {/* Volume */}
          <div className="flex flex-col gap-1 pt-2 border-t border-white/10">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">MASTER VOLUME</span>
              <span className="text-slate-200">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="accent-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

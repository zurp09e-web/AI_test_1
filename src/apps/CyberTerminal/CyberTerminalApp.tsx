import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Zap, RefreshCw, Cpu, Server, Play, CornerDownLeft } from 'lucide-react';
import { soundFX } from '../../audio/soundEngine';
import { INITIAL_FILES } from '../../state/useOSStore';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'matrix';
  text: string;
}

export const CyberTerminalApp: React.FC = () => {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: '1', type: 'system', text: 'NEON-OS [Version 2099.10.02-RELEASE]' },
    { id: '2', type: 'system', text: '(c) 2099 Cyber Syndicate Corp. All rights reserved.' },
    { id: '3', type: 'success', text: 'ICE Security Protocol: ACTIVE // Neural Shell connected.' },
    { id: '4', type: 'output', text: "Type 'help' to view available cyber commands or 'hack' to begin node infiltration." },
  ]);

  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isHackingGame, setIsHackingGame] = useState(false);

  // Mini-Game State
  const [hackLevel, setHackLevel] = useState(1);
  const [hackTimer, setHackTimer] = useState(30);
  const [hackNodes, setHackNodes] = useState<{ id: number; label: string; breached: boolean; target: boolean }[]>([]);
  const [gameActive, setGameActive] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, isHackingGame]);

  // Mini-Game Timer
  useEffect(() => {
    let timer: number;
    if (gameActive && hackTimer > 0) {
      timer = window.setInterval(() => {
        setHackTimer(t => {
          if (t <= 1) {
            setGameActive(false);
            soundFX.playError();
            setLines(prev => [
              ...prev,
              { id: Date.now().toString(), type: 'error', text: '>> ICE BREACH FAILED: Connection terminated by target firewall.' }
            ]);
            setIsHackingGame(false);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameActive, hackTimer]);

  const startHackingGame = () => {
    soundFX.playLaser();
    setIsHackingGame(true);
    setGameActive(true);
    setHackTimer(25);
    setHackLevel(1);

    const nodes = [
      { id: 1, label: 'PROXY_GATEWAY', breached: false, target: false },
      { id: 2, label: 'FIREWALL_BUFFER', breached: false, target: false },
      { id: 3, label: 'NEURAL_CIPHER', breached: false, target: false },
      { id: 4, label: 'QUANTUM_CORE', breached: false, target: true },
    ];
    setHackNodes(nodes);
  };

  const breachNode = (id: number) => {
    if (!gameActive) return;
    soundFX.playClick(1400);

    setHackNodes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, breached: true } : n);
      const allBreached = next.every(n => n.breached);

      if (allBreached) {
        soundFX.playSuccess();
        setGameActive(false);
        setLines(p => [
          ...p,
          { id: Date.now().toString(), type: 'success', text: '>> [ACCESS GRANTED] Core database decrypted! 5,000 NEON CREDITS transferred.' }
        ]);
        setTimeout(() => setIsHackingGame(false), 2000);
      }
      return next;
    });
  };

  const handleCommand = (cmdStr: string) => {
    const raw = cmdStr.trim();
    if (!raw) return;

    soundFX.playKeypress();
    setHistory(h => [...h, raw]);
    setHistoryIndex(-1);

    const newLine: TerminalLine = { id: Date.now().toString(), type: 'input', text: `user@neon-deck:~$ ${raw}` };
    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    const newOutputs: TerminalLine[] = [];

    switch (cmd) {
      case 'help':
        newOutputs.push({
          id: Date.now().toString(),
          type: 'output',
          text: `AVAILABLE COMMANDS:
  help               - Display this help manual
  hack / breach      - Launch Matrix Node Infiltration mini-game
  matrix             - Trigger high-density digital rain
  ai <prompt>        - Query AURA Autonomous Cyber AI Core
  scan               - Scan local network nodes and quantum entropy
  crypto             - Show live 2099 cyber-currency tickers
  sysinfo            - Display workstation specifications & ICE stats
  ls                 - List files in current directory
  cat <filename>     - Read virtual document
  clear              - Clear terminal window
  fortune            - Display cyberpunk proverb
  ping <host>        - Ping neural subnet`
        });
        break;

      case 'hack':
      case 'breach':
        newOutputs.push({
          id: Date.now().toString(),
          type: 'system',
          text: 'Initiating Cyber Infiltration protocol...'
        });
        startHackingGame();
        break;

      case 'matrix':
        soundFX.playLaser();
        newOutputs.push({
          id: Date.now().toString(),
          type: 'matrix',
          text: '01001110 01000101 01001111 01001110 // THE MATRIX IS EVERYWHERE // 01010011 01011001 01010011'
        });
        break;

      case 'scan':
        soundFX.playClick(1200);
        newOutputs.push({
          id: Date.now().toString(),
          type: 'success',
          text: `[PORT SCAN REPORT]
  PORT 22 (SSH/NEURAL): OPEN [ENCRYPTED]
  PORT 80 (HTTP/SYNTH): OPEN [ACTIVE]
  PORT 443 (ICE_FIREWALL): ONLINE [MAX SHIELD]
  PORT 8080 (QUANTUM_CORE): 120 GFLOPS [OPTIMAL]`
        });
        break;

      case 'crypto':
        newOutputs.push({
          id: Date.now().toString(),
          type: 'output',
          text: `CYBER MARKETS [2099]:
  ⚡ NEON-CREDIT: $4,210.50 (+14.2%)
  🔷 QUANTUM-ETH: $18,420.00 (+8.6%)
  🟡 RETRO-BTC: $142,500.00 (+3.1%)
  🟣 CYBER-SYNTH: $89.20 (+24.8%)`
        });
        break;

      case 'sysinfo':
        newOutputs.push({
          id: Date.now().toString(),
          type: 'system',
          text: `NEON WORKSTATION 2099 SPECS:
  CPU: 128-Core Quantum NeuroProcessor @ 9.4 GHz
  GPU: Dual Neural Holographic Matrix 64GB
  RAM: 1.0 TB Photonic Crystal Memory
  OS: NEON-OS Neural Kernel v4.19
  UPTIME: 142 Days, 8 Hours, 22 Minutes`
        });
        break;

      case 'ls':
        const fileNames = INITIAL_FILES.map(f => f.name).join('   ');
        newOutputs.push({
          id: Date.now().toString(),
          type: 'output',
          text: fileNames
        });
        break;

      case 'cat':
        if (!args) {
          newOutputs.push({ id: Date.now().toString(), type: 'error', text: 'Usage: cat <filename>' });
        } else {
          const file = INITIAL_FILES.find(f => f.name.toLowerCase() === args.toLowerCase());
          if (file) {
            newOutputs.push({ id: Date.now().toString(), type: 'output', text: file.content });
          } else {
            newOutputs.push({ id: Date.now().toString(), type: 'error', text: `File not found: ${args}` });
          }
        }
        break;

      case 'fortune':
        const quotes = [
          '"The sky above the port was the color of television, tuned to a dead channel." - William Gibson',
          '"Data does not sleep. Neither does the grid."',
          '"Any sufficiently advanced technology is indistinguishable from synthetic harmonics."',
          '"Behind every secure firewall lies a curious mind with a keyboard."'
        ];
        newOutputs.push({
          id: Date.now().toString(),
          type: 'output',
          text: quotes[Math.floor(Math.random() * quotes.length)]
        });
        break;

      case 'ai':
      case 'ask':
        if (!args) {
          newOutputs.push({ id: Date.now().toString(), type: 'error', text: 'Usage: ai <your question or prompt>' });
        } else {
          soundFX.playClick(1000);
          const aiResponses = [
            `AURA Core: Analyzing query "${args}"... Neural pathways confirm quantum stability. Creative synthesis protocols indicate 99.8% harmonic alignment.`,
            `AURA Core: Processing query through Sector 7 database. Recommendation: Engage SynthDeck beats at 128 BPM to amplify cognitive throughput.`,
            `AURA Core: Query received. The cyber grid operates on emergent feedback loops. Keep building, hacker.`,
          ];
          newOutputs.push({
            id: Date.now().toString(),
            type: 'success',
            text: aiResponses[Math.floor(Math.random() * aiResponses.length)]
          });
        }
        break;

      case 'clear':
        setLines([]);
        setInput('');
        return;

      default:
        soundFX.playError();
        newOutputs.push({
          id: Date.now().toString(),
          type: 'error',
          text: `Command not recognized: '${cmd}'. Type 'help' for manual.`
        });
        break;
    }

    setLines(prev => [...prev, newLine, ...newOutputs]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(nextIdx);
          setInput(history[nextIdx]);
        }
      }
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-col h-full bg-[#050811] text-slate-100 font-mono text-xs p-4 select-text overflow-hidden relative"
    >
      {/* Mini-Game Overlay if Active */}
      {isHackingGame && (
        <div className="mb-4 bg-[#0a1024] p-4 rounded-lg border-2 border-cyan-400 shadow-neon-cyan flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Zap className="w-4 h-4 text-yellow-400 fill-current" />
              MATRIX NODE BREACH IN PROGRESS
            </div>
            <div className={`font-bold ${hackTimer < 10 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
              ICE TIMEOUT: {hackTimer}s
            </div>
          </div>

          <div className="text-slate-300 text-[11px]">
            Click connected security nodes sequentially to override firewall encryption before ICE countermeasures trigger!
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {hackNodes.map(node => (
              <button
                key={node.id}
                onClick={() => breachNode(node.id)}
                disabled={node.breached}
                className={`p-3 rounded border flex flex-col items-center gap-1.5 transition-all ${
                  node.breached
                    ? 'bg-green-950/60 border-green-500 text-green-300 shadow-neon-green'
                    : 'bg-white/5 border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-300 active:scale-95'
                }`}
              >
                <Cpu className={`w-5 h-5 ${node.breached ? 'text-green-400' : 'text-cyan-400'}`} />
                <span className="font-bold text-[10px] truncate">{node.label}</span>
                <span className="text-[9px] uppercase">
                  {node.breached ? '✓ BREACHED' : 'OVERRIDE'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Terminal Line Log */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
        {lines.map(line => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap leading-relaxed ${
              line.type === 'input'
                ? 'text-cyan-300 font-bold'
                : line.type === 'error'
                ? 'text-rose-400'
                : line.type === 'success'
                ? 'text-green-400'
                : line.type === 'matrix'
                ? 'text-emerald-300 font-bold tracking-widest'
                : line.type === 'system'
                ? 'text-yellow-400'
                : 'text-slate-300'
            }`}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Prompt Row */}
      <div className="flex items-center gap-2 pt-3 border-t border-cyan-500/20 mt-2">
        <span className="text-cyan-400 font-bold whitespace-nowrap">user@neon-deck:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 bg-transparent text-slate-100 outline-none font-mono text-xs placeholder-slate-600"
          placeholder="type a command ('help', 'hack', 'matrix', 'scan', 'ai')..."
        />
        <button
          onClick={() => handleCommand(input)}
          className="p-1 text-cyan-400 hover:text-cyan-300"
        >
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Web Audio DSP Engine for SynthDeck & Beatmaker

export type SynthWaveform = 'sawtooth' | 'square' | 'sine' | 'triangle';

export class SynthEngine {
  private ctx: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private destNode: MediaStreamAudioDestinationNode | null = null;

  public waveform: SynthWaveform = 'sawtooth';
  public cutoffFreq: number = 2500;
  public resonance: number = 4;
  public delayTime: number = 0.25;
  public delayFeedback: number = 0.35;
  public volume: number = 0.7;

  constructor() {
    // Lazy init on first user interaction
  }

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(this.cutoffFreq, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(this.resonance, this.ctx.currentTime);

      // Delay FX
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.setValueAtTime(this.delayTime, this.ctx.currentTime);
      this.delayGain = this.ctx.createGain();
      this.delayGain.gain.setValueAtTime(this.delayFeedback, this.ctx.currentTime);

      // Wiring
      this.filterNode.connect(this.masterGain);
      this.filterNode.connect(this.delayNode);
      this.delayNode.connect(this.delayGain);
      this.delayGain.connect(this.delayNode); // feedback loop
      this.delayGain.connect(this.masterGain);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Media stream for recording
      if (this.ctx.createMediaStreamDestination) {
        this.destNode = this.ctx.createMediaStreamDestination();
        this.masterGain.connect(this.destNode);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public updateParameters(params: {
    waveform?: SynthWaveform;
    cutoff?: number;
    resonance?: number;
    delayTime?: number;
    delayFeedback?: number;
    volume?: number;
  }) {
    if (params.waveform) this.waveform = params.waveform;
    if (params.cutoff !== undefined) {
      this.cutoffFreq = params.cutoff;
      if (this.filterNode && this.ctx) {
        this.filterNode.frequency.setTargetAtTime(this.cutoffFreq, this.ctx.currentTime, 0.05);
      }
    }
    if (params.resonance !== undefined) {
      this.resonance = params.resonance;
      if (this.filterNode && this.ctx) {
        this.filterNode.Q.setTargetAtTime(this.resonance, this.ctx.currentTime, 0.05);
      }
    }
    if (params.delayTime !== undefined) {
      this.delayTime = params.delayTime;
      if (this.delayNode && this.ctx) {
        this.delayNode.delayTime.setTargetAtTime(this.delayTime, this.ctx.currentTime, 0.05);
      }
    }
    if (params.delayFeedback !== undefined) {
      this.delayFeedback = params.delayFeedback;
      if (this.delayGain && this.ctx) {
        this.delayGain.gain.setTargetAtTime(this.delayFeedback, this.ctx.currentTime, 0.05);
      }
    }
    if (params.volume !== undefined) {
      this.volume = params.volume;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
      }
    }
  }

  // Play a Synth Note (Lead / Bass)
  public playNote(freq: number, duration = 0.25, time?: number) {
    this.init();
    if (!this.ctx || !this.filterNode) return;

    const startTime = time ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = this.waveform;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.28, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  // Synthesize Drum Sounds
  public playDrum(type: 'kick' | 'snare' | 'hihat' | 'openhat' | 'clap' | 'tom' | 'laser', time?: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const startTime = time ?? this.ctx.currentTime;

    switch (type) {
      case 'kick': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, startTime);
        osc.frequency.exponentialRampToValueAtTime(32, startTime + 0.18);
        gain.gain.setValueAtTime(0.8, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + 0.26);
        break;
      }

      case 'snare': {
        // Noise buffer + tone
        const noiseBuffer = this.createNoiseBuffer(0.18);
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(800, startTime);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, startTime);
        osc.frequency.exponentialRampToValueAtTime(60, startTime + 0.1);
        oscGain.gain.setValueAtTime(0.35, startTime);
        oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        noise.start(startTime);
        noise.stop(startTime + 0.19);
        osc.start(startTime);
        osc.stop(startTime + 0.11);
        break;
      }

      case 'hihat': {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.045);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, startTime);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.045);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(startTime);
        noise.stop(startTime + 0.05);
        break;
      }

      case 'openhat': {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.28);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6000, startTime);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(startTime);
        noise.stop(startTime + 0.29);
        break;
      }

      case 'clap': {
        [0, 0.015, 0.03].forEach((offset) => {
          if (!this.ctx || !this.masterGain) return;
          const noise = this.ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(0.12);
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1200, startTime + offset);
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.3, startTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + offset + 0.12);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);
          noise.start(startTime + offset);
          noise.stop(startTime + offset + 0.13);
        });
        break;
      }

      case 'tom': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, startTime);
        osc.frequency.exponentialRampToValueAtTime(65, startTime + 0.2);
        gain.gain.setValueAtTime(0.5, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + 0.23);
        break;
      }

      case 'laser': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1600, startTime);
        osc.frequency.exponentialRampToValueAtTime(80, startTime + 0.14);
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + 0.15);
        break;
      }
    }
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public getVisualizerData(freqData: Uint8Array, timeData: Uint8Array) {
    if (!this.analyser) return;
    (this.analyser as any).getByteFrequencyData(freqData);
    (this.analyser as any).getByteTimeDomainData(timeData);
  }

  // Recording feature
  public startRecording(): boolean {
    if (!this.destNode) return false;
    try {
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(this.destNode.stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.start();
      this.isRecording = true;
      return true;
    } catch {
      return false;
    }
  }

  public stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.isRecording = false;
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  public getCurrentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }
}

export const synthEngine = new SynthEngine();

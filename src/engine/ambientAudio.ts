import type { WeatherType, WorldThemeId } from '../types/game';

/**
 * Lightweight, zero-asset procedural ambient soundscape built on Web Audio API.
 * Muted by default; adapts dynamically to both World Theme and Live Weather!
 */
class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeSources: Array<{ stop: () => void }> = [];
  private isPlaying = false;
  private currentTheme: WorldThemeId = 'fantasy';
  private currentWeather: WeatherType = 'cloudy';
  private currentTension = 20;
  private volume = 0.35;
  private tensionGain: GainNode | null = null;
  private tensionPulseLfo: OscillatorNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Gentle pink/brownian smoothing
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = lastOut * 2.8;
    }
    return buffer;
  }

  private teardownGraph(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // ignore already stopped
      }
    }
    for (const node of this.activeNodes) {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeSources = [];
    this.activeNodes = [];
    this.tensionGain = null;
    this.tensionPulseLfo = null;
  }

  private buildThemeSoundscape(ctx: AudioContext, theme: WorldThemeId): void {
    if (!this.masterGain) return;
    this.teardownGraph();

    const noiseBuf = this.createNoiseBuffer(ctx, 4);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;

    const filter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();

    // Subtle harmonic drone tailored per world atmosphere
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const droneFilter = ctx.createBiquadFilter();
    const droneGain = ctx.createGain();

    // Slow breathing LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    if (theme === 'fantasy') {
      // Soft hearth wind + warm medieval D-fifth drone
      filter.type = 'lowpass';
      filter.frequency.value = 340;
      noiseGain.gain.value = 0.22;

      osc1.type = 'sine';
      osc1.frequency.value = 73.42; // D2
      osc2.type = 'triangle';
      osc2.frequency.value = 110.0; // A2
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 260;
      droneGain.gain.value = 0.08;

      lfo.frequency.value = 0.09;
      lfoGain.gain.value = 90;
    } else if (theme === 'cyberpunk') {
      // Rain hiss + deep neon sub-hum
      filter.type = 'bandpass';
      filter.frequency.value = 920;
      filter.Q.value = 0.7;
      noiseGain.gain.value = 0.16;

      osc1.type = 'sawtooth';
      osc1.frequency.value = 55.0; // A1
      osc2.type = 'sine';
      osc2.frequency.value = 82.41; // E2
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 180;
      droneGain.gain.value = 0.07;

      lfo.frequency.value = 0.14;
      lfoGain.gain.value = 140;
    } else if (theme === 'mystery') {
      // Coastal rain & fog + soft noir minor pad
      filter.type = 'bandpass';
      filter.frequency.value = 640;
      filter.Q.value = 0.9;
      noiseGain.gain.value = 0.18;

      osc1.type = 'sine';
      osc1.frequency.value = 65.41; // C2
      osc2.type = 'sine';
      osc2.frequency.value = 77.78; // Eb2
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 220;
      droneGain.gain.value = 0.06;

      lfo.frequency.value = 0.07;
      lfoGain.gain.value = 80;
    } else if (theme === 'zombies') {
      // Distant urban wind + tense low pulse
      filter.type = 'lowpass';
      filter.frequency.value = 290;
      noiseGain.gain.value = 0.24;

      osc1.type = 'sine';
      osc1.frequency.value = 48.99; // G1
      osc2.type = 'triangle';
      osc2.frequency.value = 51.91; // Ab1 (subtle tension)
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 150;
      droneGain.gain.value = 0.055;

      lfo.frequency.value = 0.11;
      lfoGain.gain.value = 70;
    } else {
      // Apocalyptic: desert wind sweep + dusty low rumble
      filter.type = 'bandpass';
      filter.frequency.value = 420;
      filter.Q.value = 1.4;
      noiseGain.gain.value = 0.22;

      osc1.type = 'sine';
      osc1.frequency.value = 58.27; // Bb1
      osc2.type = 'sine';
      osc2.frequency.value = 87.31; // F2
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 190;
      droneGain.gain.value = 0.065;

      lfo.frequency.value = 0.06;
      lfoGain.gain.value = 160;
    }

    // Weather acoustic layer override (rain hiss, storm gale, snow/fog wind)
    if (this.currentWeather === 'rain') {
      filter.type = 'bandpass';
      filter.frequency.value = 1250;
      filter.Q.value = 0.65;
      noiseGain.gain.value = Math.max(noiseGain.gain.value, 0.28);
    } else if (this.currentWeather === 'storm') {
      filter.type = 'bandpass';
      filter.frequency.value = 1480;
      filter.Q.value = 0.55;
      noiseGain.gain.value = 0.36;
      lfo.frequency.value = 0.18;
      lfoGain.gain.value = 280;
    } else if (this.currentWeather === 'snow' || this.currentWeather === 'fog') {
      filter.type = 'bandpass';
      filter.frequency.value = 520;
      filter.Q.value = 1.6;
      noiseGain.gain.value = Math.max(noiseGain.gain.value, 0.24);
    }

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc1.connect(droneFilter);
    osc2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.masterGain);

    // Dynamic tension layer: soft sub-bass suspense pulse that emerges when scene tension > 35
    const tensionOsc = ctx.createOscillator();
    tensionOsc.type = 'sine';
    tensionOsc.frequency.value = 44.0;
    const tensionFilter = ctx.createBiquadFilter();
    tensionFilter.type = 'lowpass';
    tensionFilter.frequency.value = 110;
    const tensionBaseGain = ctx.createGain();
    const tensionPulseLfo = ctx.createOscillator();
    const tensionPulseDepth = ctx.createGain();
    const tensionRatio = Math.max(0, Math.min(1, (this.currentTension - 35) / 65));
    tensionBaseGain.gain.value = tensionRatio * 0.12;
    tensionPulseLfo.frequency.value = 0.55 + tensionRatio * 0.85;
    tensionPulseDepth.gain.value = tensionRatio * 0.045;

    tensionPulseLfo.connect(tensionPulseDepth);
    tensionPulseDepth.connect(tensionBaseGain.gain);
    tensionOsc.connect(tensionFilter);
    tensionFilter.connect(tensionBaseGain);
    tensionBaseGain.connect(this.masterGain);

    this.tensionGain = tensionBaseGain;
    this.tensionPulseLfo = tensionPulseLfo;

    noiseSrc.start();
    osc1.start();
    osc2.start();
    lfo.start();
    tensionOsc.start();
    tensionPulseLfo.start();

    this.activeSources = [noiseSrc, osc1, osc2, lfo, tensionOsc, tensionPulseLfo];
    this.activeNodes = [
      noiseSrc,
      filter,
      noiseGain,
      osc1,
      osc2,
      droneFilter,
      droneGain,
      lfo,
      lfoGain,
      tensionOsc,
      tensionFilter,
      tensionBaseGain,
      tensionPulseLfo,
      tensionPulseDepth,
    ];
  }

  public start(theme: WorldThemeId, volume = this.volume): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    this.currentTheme = theme;
    this.volume = Math.max(0, Math.min(1, volume));

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    if (!this.isPlaying) {
      this.buildThemeSoundscape(ctx, theme);
      this.isPlaying = true;
    }

    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(this.volume * 0.45, now, 0.35);
  }

  public setTheme(theme: WorldThemeId): void {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    if (this.isPlaying && this.ctx) {
      this.buildThemeSoundscape(this.ctx, theme);
    }
  }

  public setWeather(weather: WeatherType): void {
    if (this.currentWeather === weather) return;
    this.currentWeather = weather;
    if (this.isPlaying && this.ctx) {
      this.buildThemeSoundscape(this.ctx, this.currentTheme);
    }
  }

  public setTension(tension: number): void {
    const clamped = Math.max(0, Math.min(100, tension));
    if (Math.abs(clamped - this.currentTension) < 2) return;
    this.currentTension = clamped;
    if (this.isPlaying && this.ctx && this.tensionGain && this.tensionPulseLfo) {
      const ratio = Math.max(0, Math.min(1, (clamped - 35) / 65));
      const now = this.ctx.currentTime;
      this.tensionGain.gain.setTargetAtTime(ratio * 0.12, now, 0.4);
      this.tensionPulseLfo.frequency.setTargetAtTime(0.55 + ratio * 0.85, now, 0.4);
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.isPlaying && this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.volume * 0.45,
        this.ctx.currentTime,
        0.15,
      );
    }
  }

  public stop(): void {
    if (!this.isPlaying || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0.0001, now, 0.2);
    this.isPlaying = false;
    window.setTimeout(() => {
      if (!this.isPlaying) {
        this.teardownGraph();
      }
    }, 500);
  }
}

export const ambientAudio = new AmbientAudioEngine();

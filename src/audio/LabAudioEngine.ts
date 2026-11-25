/**
 * Procedural Web Audio API sound synthesizer for OmniLab 3D.
 * Zero external MP3/WAV URLs — 100% real-time Web Audio synthesis.
 */
class LabAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.9; // 90% default loud lab audio
  private muted = false;
  private enabled = false;

  // Continuous loop nodes
  private burnerSource: AudioBufferSourceNode | null = null;
  private burnerGain: GainNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceEnabled = false;
  private lastTickTime = 0;

  public isAmbienceEnabled(): boolean {
    return this.ambienceEnabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getVolume(): number {
    return this.volume;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public enable(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume * 1.35; // Boosted gain
      // Soft compressor so loud tactile clicks stay punchy without clipping
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -10;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      this.masterGain.connect(compressor);
      compressor.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.enabled = true;
    // Play subtle confirmation click
    this.playMetallicTick(1400, 0.25);
    return true;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume * 1.35,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume * 1.35,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  private ensureReady(): boolean {
    if (!this.enabled || !this.ctx || !this.masterGain) {
      return false;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return true;
  }

  private createNoiseBuffer(durationSec: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /** Sharp high-frequency metallic click (Vernier slide, Screw gauge ratchet, Turret click) */
  public playMetallicTick(freq = 2800, strength = 0.5): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastTickTime < 0.032) return; // Rate-limit rapid slider drags
    this.lastTickTime = now;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + 0.028);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.75, now);
    osc2.frequency.exponentialRampToValueAtTime(freq * 0.9, now + 0.018);

    gain.gain.setValueAtTime(0.45 * strength, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.04);
    osc2.stop(now + 0.04);
  }

  /** Filtered liquid pour sound */
  public playLiquidPour(duration = 0.45): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const buf = this.createNoiseBuffer(duration);
    if (!buf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(1450, now + duration * 0.7);
    filter.Q.value = 3.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(now);
    src.stop(now + duration);
  }

  /** Single liquid drop plink */
  public playDroplet(): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720 + Math.random() * 160, now);
    osc.frequency.exponentialRampToValueAtTime(1550, now + 0.065);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /** Conical flask swirling slosh */
  public playSwirl(): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const buf = this.createNoiseBuffer(0.38);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.linearRampToValueAtTime(880, now + 0.19);
    filter.frequency.linearRampToValueAtTime(380, now + 0.36);
    filter.Q.value = 4.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.39);
  }

  /** Loud fizzing effervescence during gas evolution */
  public playFizz(duration = 0.9): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const buf = this.createNoiseBuffer(duration);
    if (!buf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2800, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + duration);
  }

  /** Matchstick strike + gas ignition whoosh */
  public playFlameIgnite(): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Strike snap
    this.playMetallicTick(4200, 0.8);

    // Gas whoosh
    const buf = this.createNoiseBuffer(0.45);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'bandpass';
    lp.frequency.setValueAtTime(320, now + 0.05);
    lp.frequency.exponentialRampToValueAtTime(1100, now + 0.22);
    lp.frequency.exponentialRampToValueAtTime(240, now + 0.45);
    lp.Q.value = 1.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now + 0.04);
    gain.gain.linearRampToValueAtTime(0.7, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    src.connect(lp);
    lp.connect(gain);
    gain.connect(this.masterGain);
    src.start(now + 0.04);
    src.stop(now + 0.46);
  }

  /** Continuous Bunsen burner low roar */
  public setBurnerLoop(active: boolean): void {
    if (!active) {
      if (this.burnerGain && this.ctx) {
        this.burnerGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
      }
      if (this.burnerSource) {
        const s = this.burnerSource;
        setTimeout(() => {
          try {
            s.stop();
          } catch {
            // already stopped
          }
        }, 120);
        this.burnerSource = null;
      }
      return;
    }

    if (!this.ensureReady() || !this.ctx || !this.masterGain || this.burnerSource) return;
    const buf = this.createNoiseBuffer(2.0);
    if (!buf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.24, this.ctx.currentTime + 0.2);

    src.connect(lp);
    lp.connect(gain);
    gain.connect(this.masterGain);
    src.start();
    this.burnerSource = src;
    this.burnerGain = gain;
  }

  /** Sharp acoustic pop for H2 gas splinter test */
  public playPopTest(): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.11);

    gain.gain.setValueAtTime(0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /** Heavy 3D knife-switch mechanical clack */
  public playSwitchClack(): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.045);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /** 60Hz Transformer / AC electromagnet hum */
  public setTransformerHum(active: boolean): void {
    if (!active) {
      if (this.humGain && this.ctx) {
        this.humGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      if (this.humOsc) {
        const o = this.humOsc;
        setTimeout(() => {
          try {
            o.stop();
          } catch {
            // stopped
          }
        }, 120);
        this.humOsc = null;
      }
      return;
    }

    if (!this.ensureReady() || !this.ctx || !this.masterGain || this.humOsc) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.16, this.ctx.currentTime + 0.15);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    this.humOsc = osc;
    this.humGain = gain;
  }

  /** Pendulum air whoosh */
  public playPendulumWhoosh(): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const buf = this.createNoiseBuffer(0.22);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(280, now);
    bp.frequency.exponentialRampToValueAtTime(520, now + 0.11);
    bp.frequency.exponentialRampToValueAtTime(240, now + 0.22);
    bp.Q.value = 2.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.005, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.11);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.22);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.23);
  }

  /** Helical spring oscillation boing */
  public playSpringBoing(): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.35);

    lfo.frequency.value = 18;
    lfoGain.gain.value = 35;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(this.masterGain);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.43);
    osc.stop(now + 0.43);
  }

  /** Crisp C5 -> E5 -> G5 harmonic chime ONLY on earning a [✔] step tick mark */
  public playStepTick(): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const start = now + idx * 0.075;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.48, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  /** Loud low-frequency error buzz on lab mistakes / safety alerts */
  public playSafetyBuzz(): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(115, now);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(123, now); // Dissonant beat

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 620;

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.setValueAtTime(0.65, now + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.43);
    osc2.stop(now + 0.43);
  }

  /** Celebratory completion fanfare */
  public playCompletionFanfare(): void {
    if (!this.ensureReady() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const start = now + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.5, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + (idx === 3 ? 0.65 : 0.3));

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + (idx === 3 ? 0.68 : 0.32));
    });
  }

  /** Soft continuous cleanroom / fume-hood ventilation ambience */
  public setAmbience(active: boolean): void {
    this.ambienceEnabled = active;
    if (!active) {
      if (this.ambienceGain && this.ctx) {
        this.ambienceGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
      }
      if (this.ambienceSource) {
        const src = this.ambienceSource;
        setTimeout(() => {
          try {
            src.stop();
          } catch {
            // stopped
          }
        }, 180);
        this.ambienceSource = null;
      }
      return;
    }

    if (!this.ensureReady() || !this.ctx || !this.masterGain || this.ambienceSource) return;
    const buf = this.createNoiseBuffer(3.0);
    if (!buf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.value = 260;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.4);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterGain);
    src.start();
    this.ambienceSource = src;
    this.ambienceGain = gain;
  }

  public stopAllLoops(): void {
    this.setBurnerLoop(false);
    this.setTransformerHum(false);
  }
}

export const labAudio = new LabAudioEngine();

class ProceduralAudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;

  // Ocean Nodes
  private oceanGain: GainNode | null = null;
  private oceanFilter: BiquadFilterNode | null = null;

  // Wind / Storm Nodes
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.setupOceanSurf();
    this.setupWindAmbience();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    if (this.oceanGain) {
      this.oceanGain.gain.setTargetAtTime(muted ? 0 : 0.18, t, 0.2);
    }
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(muted ? 0 : 0.08, t, 0.2);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // --- OCEAN SURF GENERATOR ---
  private setupOceanSurf() {
    if (!this.ctx) return;

    // 5-second buffer of generated white noise
    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.loop = true;

    // Filter to sound like heavy surf
    this.oceanFilter = this.ctx.createBiquadFilter();
    this.oceanFilter.type = 'lowpass';
    this.oceanFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

    // LFO to sweep filter cutoff up and down (Incoming/Outgoing wave cycle)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime); // 1 wave every ~5.5s

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(220, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(this.oceanFilter.frequency);

    this.oceanGain = this.ctx.createGain();
    this.oceanGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.oceanFilter);
    this.oceanFilter.connect(this.oceanGain);
    this.oceanGain.connect(this.ctx.destination);

    whiteNoise.start();
    lfo.start();
  }

  // --- WIND & STORM AMBIENCE ---
  private setupWindAmbience() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    noise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);

    noise.start();
  }

  // --- WEATHER RESPONSE ---
  public updateWeatherAudio(weather: 'Clear' | 'Rain' | 'Storm' | 'Fog') {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    if (!this.windGain || !this.windFilter) return;

    switch (weather) {
      case 'Storm':
        this.windGain.gain.setTargetAtTime(0.28, t, 1.0);
        this.windFilter.frequency.setTargetAtTime(750, t, 1.0);
        break;
      case 'Rain':
        this.windGain.gain.setTargetAtTime(0.16, t, 1.0);
        this.windFilter.frequency.setTargetAtTime(550, t, 1.0);
        break;
      case 'Fog':
        this.windGain.gain.setTargetAtTime(0.04, t, 1.0);
        this.windFilter.frequency.setTargetAtTime(250, t, 1.0);
        break;
      case 'Clear':
      default:
        this.windGain.gain.setTargetAtTime(0.06, t, 1.0);
        this.windFilter.frequency.setTargetAtTime(380, t, 1.0);
        break;
    }
  }

  // --- PROCEDURAL SOUND EFFECTS ---
  public playChopSound() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  public playTerraformSound() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }
}

export const audioManager = typeof window !== 'undefined' ? new ProceduralAudioManager() : null;
let audioCtx: AudioContext | null = null;
function ac(): AudioContext {
  audioCtx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

function tone(freq: number, type: OscillatorType, startOffset: number, dur: number, peak: number) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + startOffset);
  g.gain.setValueAtTime(0.0001, a.currentTime + startOffset);
  g.gain.exponentialRampToValueAtTime(peak, a.currentTime + startOffset + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + startOffset + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start(a.currentTime + startOffset);
  o.stop(a.currentTime + startOffset + dur + 0.02);
}

function sweep(f0: number, f1: number, type: OscillatorType, startOffset: number, dur: number, peak: number) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  const t0 = a.currentTime + startOffset;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(startOffset: number, dur: number, filterFreq: number, peak: number) {
  const a = ac();
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filt = a.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = filterFreq;
  const g = a.createGain();
  const t0 = a.currentTime + startOffset;
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt);
  filt.connect(g);
  g.connect(a.destination);
  src.start(t0);
}

export interface SoundPreset {
  name: string;
  sub: string;
  play: (v: number) => void;
}

let customAudioEl: HTMLAudioElement | null = null;
let customSoundDataRef: string | null = null;
export function setCustomSoundData(data: string | null) {
  customSoundDataRef = data;
  customAudioEl = null;
}
function playCustom(v: number) {
  if (!customSoundDataRef) return;
  if (!customAudioEl) customAudioEl = new Audio(customSoundDataRef);
  customAudioEl.volume = Math.min(1, v);
  customAudioEl.currentTime = 0;
  customAudioEl.play().catch(() => {});
}

export const SPIN_PRESETS: Record<string, SoundPreset> = {
  tick: { name: 'Ticking Sound', sub: 'Soft Mechanical Precision', play: (v) => tone(1400, 'square', 0, 0.05, 0.5 * v) },
  drumroll: { name: 'Drum Roll', sub: 'Organic Percussive Timbre', play: (v) => noiseBurst(0, 0.06, 1200, 0.7 * v) },
  bell: { name: 'Bell Chime', sub: 'Pristine Crystal Resonance', play: (v) => { tone(1800, 'sine', 0, 0.12, 0.5 * v); tone(2700, 'sine', 0, 0.12, 0.25 * v); } },
  beep: { name: 'Beep', sub: 'Gentle Digital Sine Pulse', play: (v) => tone(900, 'sine', 0, 0.05, 0.5 * v) },
  marimba: { name: 'Marimba Xylophone', sub: 'Organic Percussive Wood', play: (v) => tone(700 + Math.random() * 300, 'triangle', 0, 0.12, 0.5 * v) },
  retro8bit: { name: '8-Bit Retro Arcade', sub: 'Classic Laser Chirp', play: (v) => sweep(1600, 400, 'square', 0, 0.07, 0.5 * v) },
  plasma: { name: 'Futuristic Plasma Pluck', sub: 'Warm FM Synth Pluck', play: (v) => sweep(500, 900, 'sawtooth', 0, 0.08, 0.4 * v) },
  none: { name: 'No Sound', sub: 'Stealth Audio Protocol', play: () => {} },
  custom: { name: 'Custom Sound', sub: 'External Audio Interface', play: (v) => playCustom(v) },
};

export const WIN_PRESETS: Record<string, SoundPreset> = {
  none: { name: 'No sound', sub: 'Stealth Silent Mode', play: () => {} },
  random: {
    name: 'Random sound',
    sub: 'Surprise Audio Choice',
    play: (v) => {
      const keys = Object.keys(WIN_PRESETS).filter((k) => !['none', 'random'].includes(k));
      WIN_PRESETS[keys[Math.floor(Math.random() * keys.length)]].play(v);
    },
  },
  applause: { name: 'Subdued applause', sub: 'Gentle Hand Claps', play: (v) => { for (let i = 0; i < 8; i++) noiseBurst(i * 0.06, 0.05, 2500, 0.2 * v); } },
  joke: { name: 'Joke punchline', sub: 'Ba-Dum-Tss Comedy', play: (v) => { tone(180, 'triangle', 0, 0.15, 0.5 * v); tone(140, 'triangle', 0.2, 0.18, 0.5 * v); noiseBurst(0.42, 0.25, 6000, 0.4 * v); } },
  announcement: { name: 'Announcement', sub: 'Attention-grabbing', play: (v) => sweep(300, 1200, 'sine', 0, 0.4, 0.5 * v) },
  twinkle: { name: 'Twinkling star', sub: 'Dreamy Magic Sparkle', play: (v) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 'triangle', i * 0.12, 0.5, 0.4 * v)) },
  correct: { name: 'Correct answer', sub: 'Bright Quiz Ding', play: (v) => { tone(880, 'sine', 0, 0.15, 0.5 * v); tone(1318.5, 'sine', 0.1, 0.25, 0.5 * v); } },
  swoosh: { name: 'Swoosh ding', sub: 'Dynamic Sound Effect', play: (v) => { sweep(200, 2000, 'sine', 0, 0.25, 0.4 * v); tone(1600, 'sine', 0.25, 0.3, 0.4 * v); } },
  synthbell: { name: 'Synth bell', sub: 'Modern Electronic Bell', play: (v) => { tone(1200, 'sine', 0, 0.3, 0.4 * v); tone(1800, 'sine', 0, 0.3, 0.2 * v); } },
  notification: { name: 'Notification bell', sub: 'Soft Alert Chime', play: (v) => { tone(1000, 'sine', 0, 0.15, 0.4 * v); tone(1500, 'sine', 0.15, 0.2, 0.4 * v); } },
  mystery: { name: 'Mystery bell', sub: 'Enigmatic Mystery Tone', play: (v) => [600, 560, 500, 440].forEach((f, i) => tone(f, 'sine', i * 0.15, 0.3, 0.35 * v)) },
  microwave: { name: 'Microwave ding', sub: 'Quick Metallic Bell', play: (v) => [0, 0.15, 0.3].forEach((t) => tone(1800, 'square', t, 0.08, 0.35 * v)) },
  loudapplause: { name: 'Loud applause', sub: 'Cheering & Clapping', play: (v) => { for (let i = 0; i < 28; i++) noiseBurst(i * 0.045, 0.07, 2600, 0.4 * v); } },
  fanfare: { name: 'Fanfare', sub: 'Regal Brass Horns', play: (v) => { [261.6, 329.6, 392, 523.25].forEach((f) => tone(f, 'sawtooth', 0, 0.6, 0.15 * v)); tone(523.25, 'sawtooth', 0.35, 0.5, 0.3 * v); } },
  bellring: { name: 'Bell ringing', sub: 'Continuous Bell Ring', play: (v) => { for (let i = 0; i < 6; i++) tone(i % 2 ? 1500 : 1900, 'sine', i * 0.18, 0.2, 0.4 * v); } },
  cashregister: { name: 'Cash Register', sub: 'Classic Money Ka-Ching', play: (v) => { tone(1500, 'square', 0, 0.08, 0.4 * v); tone(1900, 'square', 0.08, 0.12, 0.4 * v); noiseBurst(0.2, 0.15, 3000, 0.3 * v); } },
};

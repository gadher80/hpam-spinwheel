import type { ConfettiEffect } from './state';

type Shape = 'rect' | 'circle' | 'triangle' | 'star' | 'heart';
interface Particle {
  x: number; y: number; vx: number; vy: number; g: number;
  size: number; color: string; shape: Shape; rot: number; vr: number; life: number;
}

const COLORS = ['#e8b563', '#c1a5ce', '#15999e', '#e0b7c7', '#5e8298'];

export const CONFETTI_EFFECTS: [ConfettiEffect, string][] = [
  ['none', 'None'], ['paper', 'Paper'], ['classic', 'Classic'], ['shapes', 'Shapes'],
  ['stars', 'Stars'], ['hearts', 'Hearts'], ['fireworks', 'Fireworks'], ['cannons', 'Side Cannons'],
];

export class ConfettiEngine {
  private cx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private parts: Particle[] = [];
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.cx = canvas.getContext('2d')!;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private drawShape(shape: Shape, size: number) {
    const cx = this.cx;
    cx.beginPath();
    if (shape === 'circle') { cx.arc(0, 0, size / 2, 0, Math.PI * 2); }
    else if (shape === 'triangle') { cx.moveTo(0, -size / 2); cx.lineTo(size / 2, size / 2); cx.lineTo(-size / 2, size / 2); cx.closePath(); }
    else if (shape === 'star') {
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        cx.lineTo(Math.cos(ang) * size / 2, Math.sin(ang) * size / 2);
        const ang2 = ang + Math.PI / 5;
        cx.lineTo(Math.cos(ang2) * size / 4, Math.sin(ang2) * size / 4);
      }
      cx.closePath();
    } else if (shape === 'heart') {
      const s = size / 2;
      cx.moveTo(0, s * 0.3);
      cx.bezierCurveTo(s, -s * 0.6, s * 1.6, s * 0.4, 0, s * 1.2);
      cx.bezierCurveTo(-s * 1.6, s * 0.4, -s, -s * 0.6, 0, s * 0.3);
      cx.closePath();
    } else { cx.rect(-size / 2, -size * 0.3, size, size * 0.6); }
    cx.fill();
  }

  private spawnGroup(x: number, y: number, count: number, shapes: Shape[], colors: string[], opts: {
    angleMin?: number; angleSpread?: number; speedMin?: number; speedRange?: number; gravity?: number; life?: number;
  } = {}): Particle[] {
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const ang = opts.angleMin !== undefined ? opts.angleMin + Math.random() * (opts.angleSpread || 0) : Math.random() * Math.PI * 2;
      const speed = (opts.speedMin || 4) + Math.random() * (opts.speedRange || 8);
      arr.push({
        x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        g: opts.gravity !== undefined ? opts.gravity : 0.25 + Math.random() * 0.15,
        size: 4 + Math.random() * 6, color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, life: (opts.life || 140) + Math.random() * 40,
      });
    }
    return arr;
  }

  burst(effect: ConfettiEffect) {
    if (effect === 'none') return;
    const w = this.canvas.width, h = this.canvas.height;
    const groups: Particle[][] = [];
    if (effect === 'classic') {
      groups.push(this.spawnGroup(w / 2, h * 0.35, 150, ['rect'], COLORS, { angleMin: -Math.PI, angleSpread: Math.PI * 2, speedMin: 2, speedRange: 10 }));
    } else if (effect === 'shapes') {
      groups.push(this.spawnGroup(w / 2, h * 0.35, 150, ['rect', 'circle', 'triangle'], COLORS, { angleMin: -Math.PI, angleSpread: Math.PI * 2, speedMin: 2, speedRange: 10 }));
    } else if (effect === 'stars') {
      groups.push(this.spawnGroup(w / 2, h * 0.35, 120, ['star'], COLORS, { angleMin: -Math.PI, angleSpread: Math.PI * 2, speedMin: 2, speedRange: 9 }));
    } else if (effect === 'hearts') {
      groups.push(this.spawnGroup(w / 2, h * 0.35, 110, ['heart'], COLORS, { angleMin: -Math.PI, angleSpread: Math.PI * 2, speedMin: 2, speedRange: 8 }));
    } else if (effect === 'paper') {
      const arr: Particle[] = [];
      for (let i = 0; i < 130; i++) arr.push({
        x: Math.random() * w, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
        g: 0.03, size: 6 + Math.random() * 6, color: COLORS[Math.floor(Math.random() * COLORS.length)], shape: 'rect',
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.15, life: 260 + Math.random() * 80,
      });
      groups.push(arr);
    } else if (effect === 'fireworks') {
      [0, 220, 440].forEach((delay) => {
        setTimeout(() => {
          this.parts.push(...this.spawnGroup(w * (0.25 + Math.random() * 0.5), h * (0.2 + Math.random() * 0.3), 90, ['circle', 'star'], COLORS, { angleMin: 0, angleSpread: Math.PI * 2, speedMin: 2, speedRange: 7, gravity: 0.15, life: 90 }));
          this.ensureLoop();
        }, delay);
      });
    } else if (effect === 'cannons') {
      groups.push(this.spawnGroup(0, h, 90, ['rect', 'circle'], COLORS, { angleMin: -Math.PI * 0.75, angleSpread: Math.PI * 0.5, speedMin: 8, speedRange: 8, gravity: 0.28 }));
      groups.push(this.spawnGroup(w, h, 90, ['rect', 'circle'], COLORS, { angleMin: -Math.PI * 0.25, angleSpread: -Math.PI * 0.5, speedMin: 8, speedRange: 8, gravity: 0.28 }));
    }
    groups.forEach((g) => this.parts.push(...g));
    this.ensureLoop();
  }

  private ensureLoop() {
    if (this.running) return;
    this.running = true;
    const frame = () => {
      const cx = this.cx;
      cx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      let alive = false;
      this.parts.forEach((p) => {
        if (p.life <= 0) return;
        alive = true;
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.color;
        this.drawShape(p.shape, p.size);
        cx.restore();
      });
      this.parts = this.parts.filter((p) => p.life > 0);
      if (alive || this.parts.length) { requestAnimationFrame(frame); }
      else { this.running = false; cx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
    };
    requestAnimationFrame(frame);
  }
}

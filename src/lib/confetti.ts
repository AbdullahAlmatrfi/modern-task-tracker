import { reducedMotion } from './motion';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  color: string;
}

let canvas: HTMLCanvasElement | null = null;
let parts: Particle[] = [];
let raf = 0;

export function registerConfetti(el: HTMLCanvasElement | null): void {
  canvas = el;
  if (el) resizeConfetti();
}

export function resizeConfetti(): void {
  if (!canvas) return;
  const r = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * r;
  canvas.height = window.innerHeight * r;
  canvas.getContext('2d')?.setTransform(r, 0, 0, r, 0, 0);
}

function step(): void {
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) {
    raf = 0;
    return;
  }
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;
    p.vx *= 0.98;
    p.life -= 0.024;
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (parts.length) raf = requestAnimationFrame(step);
  else {
    raf = 0;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

/** A small burst of dots from a point on screen. */
export function burst(x: number, y: number, color: string): void {
  if (reducedMotion || !canvas) return;
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 4.5;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.2, r: 2 + Math.random() * 2.6, life: 1, color });
  }
  if (!raf) raf = requestAnimationFrame(step);
}

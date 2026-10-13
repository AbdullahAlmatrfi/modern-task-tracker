import type { Task } from '../types';

function hash(s: string): number {
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
  return x;
}

/** CSS color for a lane. The same name always gets the same color, on every device. */
export function laneColor(lane: string | null): string {
  if (!lane) return 'var(--accent)';
  return `var(--t${(hash(lane) % 6) + 1})`;
}

/** The lanes you actually use, most used first. */
export function topLanes(tasks: Task[], n = 5): string[] {
  const count = new Map<string, number>();
  for (const t of tasks) if (t.lane) count.set(t.lane, (count.get(t.lane) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([lane]) => lane);
}

import type { DayKey, WeekStart } from '../types';

export const pad = (n: number): string => String(n).padStart(2, '0');

export const toKey = (d: Date): DayKey => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromKey = (k: DayKey): Date => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (k: DayKey, n: number): DayKey => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const todayKey = (now: number = Date.now()): DayKey => toKey(new Date(now));

/** Whole days from b to a (a - b). */
export const diffDays = (a: DayKey, b: DayKey): number =>
  Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 864e5);

/** First day of the week that contains `k`. */
export const weekStartOf = (k: DayKey, ws: WeekStart): DayKey => {
  const dow = fromKey(k).getDay();
  return addDays(k, -((dow - ws + 7) % 7));
};

export const weekDays = (anchor: DayKey, ws: WeekStart): DayKey[] => {
  const s = weekStartOf(anchor, ws);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
};

export function dayLabel(k: DayKey, today: DayKey): string {
  const diff = diffDays(k, today);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return fromKey(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function relativeLabel(k: DayKey, today: DayKey): string {
  const diff = diffDays(k, today);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return diff < 0 ? `${Math.abs(diff)} days ago` : `In ${diff} days`;
}

export const fmtMinutes = (m: number): string =>
  m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`;

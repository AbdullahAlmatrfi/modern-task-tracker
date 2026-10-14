import type { DayKey, Task } from '../types';
import { addDays, fmtMinutes, fromKey, toKey, todayKey } from './dates';

export function groupByDay(tasks: Task[]): Record<DayKey, Task[]> {
  const out: Record<DayKey, Task[]> = {};
  for (const t of tasks) (out[t.day] ??= []).push(t);
  return out;
}

/** Timed tasks first by time, then high priority, then the order they were added. */
export function sortActive(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ta = a.time ?? '99:99';
    const tb = b.time ?? '99:99';
    if (ta !== tb) return ta < tb ? -1 : 1;
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
}

/**
 * Was the task finished by the end of `day`? A day's record is frozen: a task you finish
 * on Wednesday does not turn Tuesday's ring green.
 */
export function doneBy(t: Task, day: DayKey): boolean {
  if (!t.done) return false;
  if (t.doneAt === null) return true;
  return toKey(new Date(t.doneAt)) <= day;
}

/** The tasks planned for `day`, with `done` as it stood at the end of that day. */
export function plannedOn(tasks: Task[], day: DayKey): Task[] {
  return tasks
    .filter((t) => t.day === day)
    .map((t) => (doneBy(t, day) === t.done ? t : { ...t, done: !t.done }));
}

/** Unfinished tasks planned for an earlier day. They wait until they are ticked or deleted. */
export function leftOver(tasks: Task[], today: DayKey): Task[] {
  return tasks.filter((t) => !t.done && t.day < today);
}

/** Days in a row (ending today, or yesterday if today isn't finished) where every task was done. */
export function streak(byDay: Record<DayKey, Task[]>, today: DayKey): number {
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const list = byDay[addDays(today, -i)] ?? [];
    const day = addDays(today, -i);
    const full = list.length > 0 && list.every((t) => doneBy(t, day));
    if (full) n++;
    else if (i === 0) continue;
    else break;
  }
  return n;
}

export interface Completed {
  task: Task;
  /** When it was finished (falls back to its planned day). */
  at: number;
}

export function completed(tasks: Task[]): Completed[] {
  return tasks
    .filter((t) => t.done)
    .map((task) => ({ task, at: task.doneAt ?? fromKey(task.day).getTime() }))
    .sort((a, b) => b.at - a.at);
}

export function lastNDaysCounts(done: Completed[], today: DayKey, n: number): { day: DayKey; count: number }[] {
  const counts: Record<string, number> = {};
  for (const c of done) {
    const d = new Date(c.at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    counts[k] = (counts[k] ?? 0) + 1;
  }
  const out: { day: DayKey; count: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    out.push({ day, count: counts[day] ?? 0 });
  }
  return out;
}

/** Unfinished tasks from the previous `span` days. */
export function carryOver(tasks: Task[], today: DayKey, span = 7): Task[] {
  const from = addDays(today, -span);
  return tasks.filter((t) => !t.done && t.day < today && t.day >= from);
}

export interface TimeInfo {
  label: string;
  tone: 'late' | 'soon';
}

export function timeInfo(t: Task, now: number): TimeInfo | null {
  if (!t.time || t.done) return null;
  const today = todayKey(now);
  if (t.day < today) return { label: 'missed', tone: 'late' };
  if (t.day > today) return null;
  const [hh, mm] = t.time.split(':').map(Number);
  const at = fromKey(t.day);
  at.setHours(hh, mm, 0, 0);
  const diff = Math.round((at.getTime() - now) / 60000);
  if (diff < 0) return { label: `overdue ${fmtMinutes(-diff)}`, tone: 'late' };
  if (diff <= 90) return { label: `in ${fmtMinutes(diff)}`, tone: 'soon' };
  return null;
}

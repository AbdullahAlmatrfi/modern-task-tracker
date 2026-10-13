import type { Data, Goal, Task } from '../types';
import { newId } from '../lib/id';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface Imported {
  tasks: Task[];
  goals: Goal[];
}

export function exportJson(data: Data): string {
  return JSON.stringify(
    {
      app: 'dayflow',
      version: 4,
      exportedAt: new Date().toISOString(),
      tasks: Object.values(data.tasks),
      goals: Object.values(data.goals),
    },
    null,
    2,
  );
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function cleanTask(x: unknown): Task | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.trim().slice(0, 200) : '';
  const day = typeof o.day === 'string' && DAY.test(o.day) ? o.day : '';
  if (!title || !day) return null;
  const now = Date.now();
  const done = o.done === true;
  return {
    id: typeof o.id === 'string' && o.id.length >= 8 ? o.id : newId(),
    day,
    title,
    description: typeof o.description === 'string' ? o.description.slice(0, 2000) : '',
    time: typeof o.time === 'string' && TIME.test(o.time) ? o.time : null,
    lane: typeof o.lane === 'string' && o.lane ? o.lane.toLowerCase() : null,
    priority: o.priority === true,
    done,
    doneAt: done ? num(o.doneAt, now) : null,
    createdAt: num(o.createdAt, now),
    updatedAt: now,
  };
}

function cleanGoal(x: unknown): Goal | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.trim().slice(0, 120) : '';
  const start = typeof o.start === 'string' && DAY.test(o.start) ? o.start : '';
  const target = typeof o.target === 'string' && DAY.test(o.target) ? o.target : '';
  if (!title || !start || !target || target <= start) return null;
  const now = Date.now();
  return {
    id: typeof o.id === 'string' && o.id.length >= 8 ? o.id : newId(),
    title,
    start,
    target,
    lane: typeof o.lane === 'string' && o.lane ? o.lane.toLowerCase() : null,
    reachedAt: typeof o.reachedAt === 'number' && Number.isFinite(o.reachedAt) ? o.reachedAt : null,
    createdAt: num(o.createdAt, now),
    updatedAt: now,
  };
}

/**
 * Reads a Dayflow export, or the older single-page version
 * ({ days: { "2026-10-13": [{ t, d, time, tag, pri, done, doneAt, c }] } }).
 */
export function parseImport(text: string): Imported {
  const o = JSON.parse(text) as Record<string, unknown>;
  if (o && Array.isArray(o.tasks)) {
    return {
      tasks: o.tasks.map(cleanTask).filter((t): t is Task => t !== null),
      goals: (Array.isArray(o.goals) ? o.goals : []).map(cleanGoal).filter((g): g is Goal => g !== null),
    };
  }
  if (o && o.days && typeof o.days === 'object') {
    const tasks: Task[] = [];
    for (const [day, list] of Object.entries(o.days as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      for (const raw of list) {
        const r = raw as Record<string, unknown>;
        if (r?.ex === true) continue;
        const t = cleanTask({
          title: r.t,
          description: r.d,
          day,
          time: r.time,
          lane: r.tag,
          priority: r.pri === 1 || r.pri === true,
          done: r.done,
          doneAt: r.doneAt || undefined,
          createdAt: r.c,
        });
        if (t) tasks.push(t);
      }
    }
    return { tasks, goals: [] };
  }
  throw new Error('This file is not a Dayflow export.');
}

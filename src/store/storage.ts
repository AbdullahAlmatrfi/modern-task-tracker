import type { Data, Prefs } from '../types';
import { emptyData } from './reducer';

const dataKey = (userId: string | null) => `dayflow:v3:${userId ?? 'guest'}`;
const PREFS_KEY = 'dayflow:prefs';

export function loadData(userId: string | null): Data {
  try {
    const raw = localStorage.getItem(dataKey(userId));
    if (raw) {
      const o = JSON.parse(raw) as Partial<Data>;
      if (o && typeof o.tasks === 'object' && typeof o.pending === 'object') {
        // data saved before goals existed has no goals yet
        return { tasks: o.tasks, pending: o.pending, goals: o.goals ?? {}, goalPending: o.goalPending ?? {} };
      }
    }
  } catch {
    /* unreadable or blocked: start empty */
  }
  return emptyData();
}

export function saveData(userId: string | null, data: Data): void {
  try {
    localStorage.setItem(dataKey(userId), JSON.stringify(data));
  } catch {
    /* storage full or blocked */
  }
}

export function clearData(userId: string | null): void {
  try {
    localStorage.removeItem(dataKey(userId));
  } catch {
    /* ignore */
  }
}

export const defaultPrefs: Prefs = { weekStart: 0, focusMinutes: 25 };

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...defaultPrefs, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    /* ignore */
  }
  return defaultPrefs;
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Local calendar day, "YYYY-MM-DD". */
export type DayKey = string;

export interface Task {
  id: string;
  day: DayKey;
  title: string;
  description: string;
  /** "HH:MM" 24h, or null when the task has no set time. */
  time: string | null;
  /** Lane name (the #tag), lowercase, or null. */
  lane: string | null;
  priority: boolean;
  done: boolean;
  /** Epoch ms when it was checked off, or null. */
  doneAt: number | null;
  /** Manual order within a list (smaller is higher). Falls back to createdAt when unset. */
  position?: number;
  createdAt: number;
  updatedAt: number;
}

/** A dated goal. The journey line runs from `start` (the day it was set) to `target`. */
export interface Goal {
  id: string;
  title: string;
  start: DayKey;
  target: DayKey;
  /** Optional lane. Tasks in this lane between start and target count toward the goal. */
  lane: string | null;
  /** Epoch ms when marked as reached, or null. */
  reachedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type Pending = 'upsert' | 'delete';

/** Everything saved locally. The `*Pending` maps are the outbox of changes not yet pushed to Supabase. */
export interface Data {
  tasks: Record<string, Task>;
  pending: Record<string, Pending>;
  goals: Record<string, Goal>;
  goalPending: Record<string, Pending>;
}

export type WeekStart = 0 | 1 | 6;

export interface Prefs {
  weekStart: WeekStart;
  focusMinutes: 15 | 25 | 50;
}

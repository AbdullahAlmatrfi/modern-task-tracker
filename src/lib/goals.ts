import type { DayKey, Goal, Task } from '../types';
import { diffDays } from './dates';
import { newId } from './id';

export type GoalState = 'active' | 'due' | 'passed' | 'reached';

export interface GoalProgress {
  /** Days from start to target (at least 1). */
  totalDays: number;
  /** Days travelled so far, kept between 0 and totalDays. */
  elapsed: number;
  /** Days until the target. Negative once it has passed. */
  left: number;
  /** 0 to 1: where "today" sits on the line. */
  pct: number;
  state: GoalState;
}

export function goalProgress(g: Goal, today: DayKey): GoalProgress {
  const totalDays = Math.max(1, diffDays(g.target, g.start));
  const elapsed = Math.min(Math.max(diffDays(today, g.start), 0), totalDays);
  const left = diffDays(g.target, today);
  const state: GoalState = g.reachedAt !== null ? 'reached' : left < 0 ? 'passed' : left === 0 ? 'due' : 'active';
  return { totalDays, elapsed, left, pct: elapsed / totalDays, state };
}

/** Day offsets along the line where a small tick is drawn: weekly, then fortnightly, then monthly. */
export function goalTicks(totalDays: number): number[] {
  const step = totalDays <= 70 ? 7 : totalDays <= 210 ? 14 : 30;
  const out: number[] = [];
  for (let d = step; d < totalDays; d += step) out.push(d);
  return out;
}

/** Tasks in the goal's lane inside its date range. Null when the goal has no lane. */
export function goalTaskStats(g: Goal, tasks: Task[]): { done: number; total: number } | null {
  if (!g.lane) return null;
  let done = 0;
  let total = 0;
  for (const t of tasks) {
    if (t.lane !== g.lane || t.day < g.start || t.day > g.target) continue;
    total++;
    if (t.done) done++;
  }
  return { done, total };
}

export function daysLeftText(left: number): { big: string; small: string } {
  if (left > 1) return { big: String(left), small: 'days left' };
  if (left === 1) return { big: '1', small: 'day left' };
  if (left === 0) return { big: '0', small: 'it is today' };
  const n = Math.abs(left);
  return { big: String(n), small: n === 1 ? 'day past' : 'days past' };
}

/** Active goals soonest first, then reached goals, newest first. */
export function orderGoals(goals: Goal[]): Goal[] {
  const active = goals.filter((g) => g.reachedAt === null).sort((a, b) => (a.target < b.target ? -1 : a.target > b.target ? 1 : a.createdAt - b.createdAt));
  const reached = goals.filter((g) => g.reachedAt !== null).sort((a, b) => (b.reachedAt ?? 0) - (a.reachedAt ?? 0));
  return [...active, ...reached];
}

export interface NewGoalFields {
  title: string;
  target: DayKey;
  lane: string | null;
}

export function createGoal(start: DayKey, f: NewGoalFields, now: number = Date.now()): Goal {
  return {
    id: newId(),
    title: f.title,
    start,
    target: f.target,
    lane: f.lane,
    reachedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Data, Goal, Pending, Task } from '../types';

interface TaskRow {
  id: string;
  user_id: string;
  day: string;
  title: string;
  description: string;
  start_time: string | null;
  lane: string | null;
  priority: boolean;
  done: boolean;
  done_at: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  start_day: string;
  target_day: string;
  lane: string | null;
  reached_at: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

const PAGE = 1000;
const CHUNK = 200;

const iso = (ms: number) => new Date(ms).toISOString();

const taskToRow = (t: Task, userId: string): TaskRow => ({
  id: t.id,
  user_id: userId,
  day: t.day,
  title: t.title,
  description: t.description,
  start_time: t.time,
  lane: t.lane,
  priority: t.priority,
  done: t.done,
  done_at: t.doneAt === null ? null : iso(t.doneAt),
  created_at: iso(t.createdAt),
  updated_at: iso(t.updatedAt),
  deleted: false,
});

const taskFromRow = (r: TaskRow): Task => ({
  id: r.id,
  day: r.day,
  title: r.title,
  description: r.description ?? '',
  time: r.start_time,
  lane: r.lane,
  priority: r.priority,
  done: r.done,
  doneAt: r.done_at ? Date.parse(r.done_at) : null,
  createdAt: Date.parse(r.created_at),
  updatedAt: Date.parse(r.updated_at),
});

const goalToRow = (g: Goal, userId: string): GoalRow => ({
  id: g.id,
  user_id: userId,
  title: g.title,
  start_day: g.start,
  target_day: g.target,
  lane: g.lane,
  reached_at: g.reachedAt === null ? null : iso(g.reachedAt),
  created_at: iso(g.createdAt),
  updated_at: iso(g.updatedAt),
  deleted: false,
});

const goalFromRow = (r: GoalRow): Goal => ({
  id: r.id,
  title: r.title,
  start: r.start_day,
  target: r.target_day,
  lane: r.lane,
  reachedAt: r.reached_at ? Date.parse(r.reached_at) : null,
  createdAt: Date.parse(r.created_at),
  updatedAt: Date.parse(r.updated_at),
});

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function fetchAll<R>(sb: SupabaseClient, table: string): Promise<R[]> {
  const out: R[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from(table)
      .select('*')
      .order('updated_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as R[];
    for (const r of page) out.push(r);
    if (page.length < PAGE) break;
  }
  return out;
}

export interface Deleted {
  id: string;
  updatedAt: number;
}

export interface PullResult {
  tasks: Task[];
  deletedTasks: Deleted[];
  goals: Goal[];
  deletedGoals: Deleted[];
}

/** Reads every task and goal for the signed-in user (row-level security limits it to their own). */
export async function pullAll(sb: SupabaseClient): Promise<PullResult> {
  const out: PullResult = { tasks: [], deletedTasks: [], goals: [], deletedGoals: [] };
  for (const r of await fetchAll<TaskRow>(sb, 'tasks')) {
    if (r.deleted) out.deletedTasks.push({ id: r.id, updatedAt: Date.parse(r.updated_at) });
    else out.tasks.push(taskFromRow(r));
  }
  for (const r of await fetchAll<GoalRow>(sb, 'goals')) {
    if (r.deleted) out.deletedGoals.push({ id: r.id, updatedAt: Date.parse(r.updated_at) });
    else out.goals.push(goalFromRow(r));
  }
  return out;
}

export interface Pushed {
  id: string;
  updatedAt: number;
  deleted: boolean;
}

async function pushTable<T extends { id: string; updatedAt: number }, R>(
  sb: SupabaseClient,
  table: string,
  records: Record<string, T>,
  pending: Record<string, Pending>,
  toRow: (item: T) => R,
): Promise<Pushed[]> {
  const upserts: T[] = [];
  const deletes: string[] = [];
  for (const [id, op] of Object.entries(pending)) {
    if (op === 'upsert') {
      const item = records[id];
      if (item) upserts.push(item);
    } else {
      deletes.push(id);
    }
  }
  const sent: Pushed[] = [];
  for (const part of chunks(upserts, CHUNK)) {
    const { error } = await sb.from(table).upsert(part.map(toRow) as never, { onConflict: 'id' });
    if (error) throw error;
    for (const item of part) sent.push({ id: item.id, updatedAt: item.updatedAt, deleted: false });
  }
  for (const part of chunks(deletes, CHUNK)) {
    const { error } = await sb.from(table).update({ deleted: true, updated_at: iso(Date.now()) }).in('id', part);
    if (error) throw error;
    for (const id of part) sent.push({ id, updatedAt: 0, deleted: true });
  }
  return sent;
}

/** Sends every change in the outbox. Returns what was sent so the store can clear it. */
export async function pushPending(
  sb: SupabaseClient,
  userId: string,
  data: Data,
): Promise<{ tasks: Pushed[]; goals: Pushed[] }> {
  const tasks = await pushTable(sb, 'tasks', data.tasks, data.pending, (t) => taskToRow(t, userId));
  const goals = await pushTable(sb, 'goals', data.goals, data.goalPending, (g) => goalToRow(g, userId));
  return { tasks, goals };
}

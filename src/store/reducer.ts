import type { Data, DayKey, Goal, Pending, Task } from '../types';

export type TaskPatch = Partial<Pick<Task, 'title' | 'description' | 'time' | 'lane' | 'priority'>>;
export type GoalPatch = Partial<Pick<Goal, 'title' | 'target' | 'lane'>>;

type SyncedItem = { id: string; updatedAt: number; deleted: boolean };
type DeletedItem = { id: string; updatedAt: number };

export type Action =
  | { type: 'add'; task: Task }
  | { type: 'toggle'; id: string; at: number }
  | { type: 'update'; id: string; patch: TaskPatch; at: number }
  | { type: 'remove'; id: string }
  | { type: 'restore'; task: Task; at: number }
  | { type: 'carry'; ids: string[]; day: DayKey; at: number }
  | { type: 'import'; tasks: Task[]; goals?: Goal[] }
  | { type: 'synced'; items: SyncedItem[] }
  | { type: 'merge'; rows: Task[]; deleted: DeletedItem[] }
  | { type: 'goal/add'; goal: Goal }
  | { type: 'goal/update'; id: string; patch: GoalPatch; at: number }
  | { type: 'goal/reach'; id: string; at: number }
  | { type: 'goal/remove'; id: string }
  | { type: 'goal/restore'; goal: Goal; at: number }
  | { type: 'goal/synced'; items: SyncedItem[] }
  | { type: 'goal/merge'; rows: Goal[]; deleted: DeletedItem[] };

export const emptyData = (): Data => ({ tasks: {}, pending: {}, goals: {}, goalPending: {} });

/** Clears outbox entries the server has confirmed, unless the item changed again meanwhile. */
function clearSynced<T extends { updatedAt: number }>(
  items: SyncedItem[],
  records: Record<string, T>,
  pending: Record<string, Pending>,
): Record<string, Pending> {
  const out = { ...pending };
  for (const it of items) {
    const p = out[it.id];
    if (p === 'upsert' && records[it.id]?.updatedAt === it.updatedAt) delete out[it.id];
    else if (p === 'delete' && !records[it.id]) delete out[it.id];
  }
  return out;
}

/** Newer remote copy wins; an unsent local change wins until it is pushed. */
function mergeRemote<T extends { id: string; updatedAt: number }>(
  rows: T[],
  deleted: DeletedItem[],
  records: Record<string, T>,
  pending: Record<string, Pending>,
): Record<string, T> | null {
  const out = { ...records };
  let changed = false;
  for (const row of rows) {
    if (pending[row.id]) continue;
    const local = out[row.id];
    if (!local || row.updatedAt > local.updatedAt) {
      out[row.id] = row;
      changed = true;
    }
  }
  for (const d of deleted) {
    if (pending[d.id]) continue;
    const local = out[d.id];
    if (local && d.updatedAt >= local.updatedAt) {
      delete out[d.id];
      changed = true;
    }
  }
  return changed ? out : null;
}

export function reducer(state: Data, action: Action): Data {
  switch (action.type) {
    case 'add':
      return {
        ...state,
        tasks: { ...state.tasks, [action.task.id]: action.task },
        pending: { ...state.pending, [action.task.id]: 'upsert' },
      };

    case 'toggle': {
      const t = state.tasks[action.id];
      if (!t) return state;
      const done = !t.done;
      const next: Task = { ...t, done, doneAt: done ? action.at : null, updatedAt: action.at };
      return {
        ...state,
        tasks: { ...state.tasks, [t.id]: next },
        pending: { ...state.pending, [t.id]: 'upsert' },
      };
    }

    case 'update': {
      const t = state.tasks[action.id];
      if (!t) return state;
      return {
        ...state,
        tasks: { ...state.tasks, [t.id]: { ...t, ...action.patch, updatedAt: action.at } },
        pending: { ...state.pending, [t.id]: 'upsert' },
      };
    }

    case 'remove': {
      if (!state.tasks[action.id]) return state;
      const tasks = { ...state.tasks };
      delete tasks[action.id];
      return { ...state, tasks, pending: { ...state.pending, [action.id]: 'delete' } };
    }

    case 'restore':
      return {
        ...state,
        tasks: { ...state.tasks, [action.task.id]: { ...action.task, updatedAt: action.at } },
        pending: { ...state.pending, [action.task.id]: 'upsert' },
      };

    case 'carry': {
      const tasks = { ...state.tasks };
      const pending = { ...state.pending };
      for (const id of action.ids) {
        const t = tasks[id];
        if (!t) continue;
        tasks[id] = { ...t, day: action.day, time: null, updatedAt: action.at };
        pending[id] = 'upsert';
      }
      return { ...state, tasks, pending };
    }

    case 'import': {
      const tasks = { ...state.tasks };
      const pending = { ...state.pending };
      for (const t of action.tasks) {
        tasks[t.id] = t;
        pending[t.id] = 'upsert';
      }
      const goals = { ...state.goals };
      const goalPending = { ...state.goalPending };
      for (const g of action.goals ?? []) {
        goals[g.id] = g;
        goalPending[g.id] = 'upsert';
      }
      return { tasks, pending, goals, goalPending };
    }

    case 'synced':
      return { ...state, pending: clearSynced(action.items, state.tasks, state.pending) };

    case 'merge': {
      const tasks = mergeRemote(action.rows, action.deleted, state.tasks, state.pending);
      return tasks ? { ...state, tasks } : state;
    }

    case 'goal/add':
      return {
        ...state,
        goals: { ...state.goals, [action.goal.id]: action.goal },
        goalPending: { ...state.goalPending, [action.goal.id]: 'upsert' },
      };

    case 'goal/update': {
      const g = state.goals[action.id];
      if (!g) return state;
      return {
        ...state,
        goals: { ...state.goals, [g.id]: { ...g, ...action.patch, updatedAt: action.at } },
        goalPending: { ...state.goalPending, [g.id]: 'upsert' },
      };
    }

    case 'goal/reach': {
      const g = state.goals[action.id];
      if (!g) return state;
      const next: Goal = { ...g, reachedAt: g.reachedAt === null ? action.at : null, updatedAt: action.at };
      return {
        ...state,
        goals: { ...state.goals, [g.id]: next },
        goalPending: { ...state.goalPending, [g.id]: 'upsert' },
      };
    }

    case 'goal/remove': {
      if (!state.goals[action.id]) return state;
      const goals = { ...state.goals };
      delete goals[action.id];
      return { ...state, goals, goalPending: { ...state.goalPending, [action.id]: 'delete' } };
    }

    case 'goal/restore':
      return {
        ...state,
        goals: { ...state.goals, [action.goal.id]: { ...action.goal, updatedAt: action.at } },
        goalPending: { ...state.goalPending, [action.goal.id]: 'upsert' },
      };

    case 'goal/synced':
      return { ...state, goalPending: clearSynced(action.items, state.goals, state.goalPending) };

    case 'goal/merge': {
      const goals = mergeRemote(action.rows, action.deleted, state.goals, state.goalPending);
      return goals ? { ...state, goals } : state;
    }
  }
}

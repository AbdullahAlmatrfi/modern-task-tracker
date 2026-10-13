import { describe, expect, it } from 'vitest';
import { emptyData, reducer } from './reducer';
import { exportJson, parseImport } from './portable';
import { createTask } from '../lib/task';
import { createGoal, goalProgress, goalTicks } from '../lib/goals';
import type { Data } from '../types';

const day = '2026-10-13';
const withTask = (): { data: Data; id: string } => {
  const task = createTask(day, { title: 'Write tests' }, 100);
  return { data: reducer(emptyData(), { type: 'add', task }), id: task.id };
};

describe('reducer', () => {
  it('adds a task and queues it for sync', () => {
    const { data, id } = withTask();
    expect(data.tasks[id].title).toBe('Write tests');
    expect(data.pending[id]).toBe('upsert');
  });

  it('toggles done and back', () => {
    const { data, id } = withTask();
    const done = reducer(data, { type: 'toggle', id, at: 200 });
    expect(done.tasks[id]).toMatchObject({ done: true, doneAt: 200, updatedAt: 200 });
    const undone = reducer(done, { type: 'toggle', id, at: 300 });
    expect(undone.tasks[id]).toMatchObject({ done: false, doneAt: null, updatedAt: 300 });
  });

  it('removes a task and queues a delete, then restores it', () => {
    const { data, id } = withTask();
    const task = data.tasks[id];
    const gone = reducer(data, { type: 'remove', id });
    expect(gone.tasks[id]).toBeUndefined();
    expect(gone.pending[id]).toBe('delete');
    const back = reducer(gone, { type: 'restore', task, at: 500 });
    expect(back.tasks[id].updatedAt).toBe(500);
    expect(back.pending[id]).toBe('upsert');
  });

  it('carries tasks to a new day and clears their time', () => {
    const task = createTask('2026-10-12', { title: 'late', time: '10:00' }, 1);
    const s = reducer(emptyData(), { type: 'add', task });
    const moved = reducer(s, { type: 'carry', ids: [task.id], day, at: 9 });
    expect(moved.tasks[task.id]).toMatchObject({ day, time: null, updatedAt: 9 });
  });

  it('clears the outbox only when the pushed version is still current', () => {
    const { data, id } = withTask();
    const edited = reducer(data, { type: 'update', id, patch: { title: 'Changed' }, at: 400 });
    const stale = reducer(edited, { type: 'synced', items: [{ id, updatedAt: 100, deleted: false }] });
    expect(stale.pending[id]).toBe('upsert');
    const fresh = reducer(edited, { type: 'synced', items: [{ id, updatedAt: 400, deleted: false }] });
    expect(fresh.pending[id]).toBeUndefined();
  });

  it('merge: newer remote wins, unsent local change wins, remote delete removes', () => {
    const { data, id } = withTask(); // local updatedAt 100, pending upsert
    const remote = { ...data.tasks[id], title: 'From phone', updatedAt: 900 };
    // local has an unsent change: remote must not overwrite it
    expect(reducer(data, { type: 'merge', rows: [remote], deleted: [] }).tasks[id].title).toBe('Write tests');
    // once synced, newer remote wins
    const synced = reducer(data, { type: 'synced', items: [{ id, updatedAt: 100, deleted: false }] });
    expect(reducer(synced, { type: 'merge', rows: [remote], deleted: [] }).tasks[id].title).toBe('From phone');
    // an older remote copy does not win
    const older = { ...remote, updatedAt: 50 };
    expect(reducer(synced, { type: 'merge', rows: [older], deleted: [] }).tasks[id].title).toBe('Write tests');
    // a newer remote delete removes it
    expect(reducer(synced, { type: 'merge', rows: [], deleted: [{ id, updatedAt: 1000 }] }).tasks[id]).toBeUndefined();
  });

  it('merge adds tasks that only exist remotely', () => {
    const remote = createTask(day, { title: 'Only on phone' }, 5);
    const s = reducer(emptyData(), { type: 'merge', rows: [remote], deleted: [] });
    expect(s.tasks[remote.id].title).toBe('Only on phone');
    expect(s.pending[remote.id]).toBeUndefined();
  });
});

describe('import / export', () => {
  it('round-trips an export', () => {
    const { data } = withTask();
    const back = parseImport(exportJson(data)).tasks;
    expect(back).toHaveLength(1);
    expect(back[0].title).toBe('Write tests');
  });

  it('reads the older single-page format and skips sample tasks', () => {
    const legacy = JSON.stringify({
      v: 2,
      days: {
        '2026-10-13': [
          { id: 'abc', t: 'Real task', d: 'notes', time: '09:30', tag: 'Code', pri: 1, done: true, doneAt: 1700000000000, c: 5 },
          { id: 'def', t: 'Sample', ex: true, c: 6 },
        ],
      },
    });
    const out = parseImport(legacy).tasks;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      title: 'Real task',
      description: 'notes',
      time: '09:30',
      lane: 'code',
      priority: true,
      done: true,
      day: '2026-10-13',
    });
  });

  it('rejects files it does not understand', () => {
    expect(() => parseImport('{"hello":1}')).toThrow();
  });
});

describe('goals', () => {
  const mk = () => createGoal('2026-10-13', { title: 'Ship it', target: '2026-12-25', lane: null }, 100);

  it('adds, updates, reaches, removes and restores a goal', () => {
    const g = mk();
    let s = reducer(emptyData(), { type: 'goal/add', goal: g });
    expect(s.goals[g.id].title).toBe('Ship it');
    expect(s.goalPending[g.id]).toBe('upsert');
    s = reducer(s, { type: 'goal/update', id: g.id, patch: { title: 'Ship v1' }, at: 200 });
    expect(s.goals[g.id]).toMatchObject({ title: 'Ship v1', updatedAt: 200 });
    s = reducer(s, { type: 'goal/reach', id: g.id, at: 300 });
    expect(s.goals[g.id].reachedAt).toBe(300);
    s = reducer(s, { type: 'goal/reach', id: g.id, at: 400 });
    expect(s.goals[g.id].reachedAt).toBeNull();
    const gone = reducer(s, { type: 'goal/remove', id: g.id });
    expect(gone.goals[g.id]).toBeUndefined();
    expect(gone.goalPending[g.id]).toBe('delete');
    const back = reducer(gone, { type: 'goal/restore', goal: s.goals[g.id], at: 500 });
    expect(back.goals[g.id].updatedAt).toBe(500);
  });

  it('merges remote goals without touching unsent local ones', () => {
    const g = mk();
    const s = reducer(emptyData(), { type: 'goal/add', goal: g });
    const remote = { ...g, title: 'Remote', updatedAt: 900 };
    expect(reducer(s, { type: 'goal/merge', rows: [remote], deleted: [] }).goals[g.id].title).toBe('Ship it');
    const synced = reducer(s, { type: 'goal/synced', items: [{ id: g.id, updatedAt: 100, deleted: false }] });
    expect(reducer(synced, { type: 'goal/merge', rows: [remote], deleted: [] }).goals[g.id].title).toBe('Remote');
  });

  it('exports and imports goals', () => {
    const g = mk();
    const s = reducer(emptyData(), { type: 'goal/add', goal: g });
    const back = parseImport(exportJson(s));
    expect(back.goals).toHaveLength(1);
    expect(back.goals[0]).toMatchObject({ title: 'Ship it', target: '2026-12-25' });
  });

  it('works out progress and state', () => {
    const g = mk();
    const p = goalProgress(g, '2026-10-13');
    expect(p).toMatchObject({ totalDays: 73, elapsed: 0, left: 73, state: 'active' });
    expect(goalProgress(g, '2026-12-25').state).toBe('due');
    expect(goalProgress(g, '2026-12-26').state).toBe('passed');
    expect(goalProgress({ ...g, reachedAt: 5 }, '2026-11-01').state).toBe('reached');
    expect(goalProgress(g, '2026-11-01').pct).toBeCloseTo(19 / 73);
    expect(goalTicks(73)[0]).toBe(14);
  });
});

import { describe, expect, it } from 'vitest';
import { addDays, diffDays, weekDays, weekStartOf } from './dates';
import { parseQuickAdd } from './parse';
import { carryOver, completed, groupByDay, lastNDaysCounts, sortActive, streak, timeInfo, doneBy, leftOver, plannedOn } from './stats';
import { positionAt, sortManual } from './order';
import { createTask } from './task';
import type { Task } from '../types';

const mk = (day: string, over: Partial<Task> = {}): Task => ({ ...createTask(day, { title: 'x' }, 1), ...over });

describe('parseQuickAdd', () => {
  it('reads time, lane and priority', () => {
    expect(parseQuickAdd('Grade quiz 16:30 #Teach !')).toEqual({
      title: 'Grade quiz',
      time: '16:30',
      lane: 'teach',
      priority: true,
    });
  });
  it('reads am/pm and "at"', () => {
    expect(parseQuickAdd('call bank 4pm').time).toBe('16:00');
    expect(parseQuickAdd('call bank 12am').time).toBe('00:00');
    expect(parseQuickAdd('standup at 9:15').time).toBe('09:15');
  });
  it('leaves plain text alone', () => {
    expect(parseQuickAdd('  buy   milk ')).toEqual({ title: 'buy milk', time: null, lane: null, priority: false });
  });
  it('does not treat "!" inside a word as priority', () => {
    expect(parseQuickAdd('wow!great').priority).toBe(false);
  });
});

describe('dates', () => {
  it('finds the week start for each setting', () => {
    // 2026-10-13 is a Tuesday
    expect(weekStartOf('2026-10-13', 0)).toBe('2026-10-11');
    expect(weekStartOf('2026-10-13', 1)).toBe('2026-10-12');
    expect(weekStartOf('2026-10-13', 6)).toBe('2026-10-10');
  });
  it('lists seven days', () => {
    const d = weekDays('2026-10-13', 0);
    expect(d).toHaveLength(7);
    expect(d[0]).toBe('2026-10-11');
    expect(d[6]).toBe('2026-10-17');
  });
  it('adds days across a month end', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(diffDays('2026-11-01', '2026-10-31')).toBe(1);
  });
});

describe('stats', () => {
  const today = '2026-10-13';
  it('counts a streak and skips an unfinished today', () => {
    const tasks = [
      mk('2026-10-12', { done: true }),
      mk('2026-10-11', { done: true }),
      mk('2026-10-10', { done: false }),
      mk('2026-10-13', { done: false }),
    ];
    expect(streak(groupByDay(tasks), today)).toBe(2);
  });
  it('includes today when it is finished', () => {
    const tasks = [mk('2026-10-13', { done: true }), mk('2026-10-12', { done: true })];
    expect(streak(groupByDay(tasks), today)).toBe(2);
  });
  it('sorts timed tasks first, then priority', () => {
    const a = mk(today, { title: 'a', time: '14:00', createdAt: 3 });
    const b = mk(today, { title: 'b', time: '09:00', createdAt: 4 });
    const c = mk(today, { title: 'c', priority: true, createdAt: 5 });
    const d = mk(today, { title: 'd', createdAt: 1 });
    expect(sortActive([d, c, a, b]).map((t) => t.title)).toEqual(['b', 'a', 'c', 'd']);
  });
  it('lists unfinished tasks from the past week only', () => {
    const tasks = [
      mk('2026-10-12'),
      mk('2026-10-06'),
      mk('2026-10-05'),
      mk('2026-10-12', { done: true }),
      mk('2026-10-13'),
    ];
    expect(carryOver(tasks, today, 7)).toHaveLength(2);
  });
  it('orders history newest first and builds 14 day counts', () => {
    const noon = (k: string) => new Date(`${k}T12:00:00`).getTime();
    const tasks = [
      mk('2026-10-12', { done: true, doneAt: noon('2026-10-12') }),
      mk('2026-10-13', { done: true, doneAt: noon('2026-10-13') }),
      mk('2026-10-13', { done: true, doneAt: noon('2026-10-13') + 1000 }),
    ];
    const done = completed(tasks);
    expect(done[0].at).toBeGreaterThan(done[2].at);
    const counts = lastNDaysCounts(done, today, 14);
    expect(counts).toHaveLength(14);
    expect(counts[13]).toEqual({ day: today, count: 2 });
    expect(counts[12]).toEqual({ day: '2026-10-12', count: 1 });
  });
  it('reports overdue, soon and later', () => {
    const now = new Date('2026-10-13T12:00:00').getTime();
    expect(timeInfo(mk(today, { time: '11:30' }), now)).toEqual({ label: 'overdue 30m', tone: 'late' });
    expect(timeInfo(mk(today, { time: '12:40' }), now)).toEqual({ label: 'in 40m', tone: 'soon' });
    expect(timeInfo(mk(today, { time: '18:00' }), now)).toBeNull();
    expect(timeInfo(mk('2026-10-12', { time: '09:00' }), now)).toEqual({ label: 'missed', tone: 'late' });
    expect(timeInfo(mk(today, { time: '11:30', done: true }), now)).toBeNull();
  });
});

describe('manual order', () => {
  const t = (id: string, createdAt: number, position?: number) =>
    ({ ...createTask('2026-10-13', { title: id }, createdAt), id, ...(position === undefined ? {} : { position }) });

  it('orders by position, falling back to when the task was added', () => {
    const list = [t('c', 30), t('a', 10), t('b', 20, 5)];
    expect(sortManual(list).map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });

  it('puts a task first, last or between neighbours', () => {
    const others = [t('a', 100), t('b', 200), t('c', 300)];
    expect(positionAt(others, 0)).toBeLessThan(100);
    expect(positionAt(others, 3)).toBeGreaterThan(300);
    expect(positionAt(others, 1)).toBe(150);
  });

  it('moving the last task to the top puts it first', () => {
    const list = [t('a', 100), t('b', 200), t('c', 300)];
    const others = list.slice(0, 2);
    const moved = { ...list[2], position: positionAt(others, 0) };
    expect(sortManual([...others, moved]).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('days stay frozen', () => {
  const today = '2026-10-14';
  const at = (d: number, h = 9) => new Date(2026, 9, d, h).getTime();
  const mk2 = (day: string, extra: Partial<Task> = {}): Task => ({ ...createTask(day, { title: day }, 1), ...extra });

  it('a task finished the next day does not count as done on its own day', () => {
    const t = mk2('2026-10-13', { done: true, doneAt: at(14) });
    expect(doneBy(t, '2026-10-13')).toBe(false);
    expect(doneBy(t, '2026-10-14')).toBe(true);
    expect(plannedOn([t], '2026-10-13')[0].done).toBe(false);
  });

  it('plannedOn only returns that day, so a leftover never touches today', () => {
    const old = mk2('2026-10-13');
    const now = mk2(today);
    expect(plannedOn([old, now], today)).toEqual([now]);
  });

  it('leftOver keeps unfinished tasks from any earlier day, however old, but not finished ones', () => {
    const old = mk2('2026-08-01');
    const finished = mk2('2026-10-01', { done: true, doneAt: at(2) });
    const todayTask = mk2(today);
    expect(leftOver([old, finished, todayTask], today)).toEqual([old]);
  });

  it('the streak does not count a day whose task was finished later', () => {
    const late = mk2('2026-10-13', { done: true, doneAt: at(14) });
    const ok = mk2(today, { done: true, doneAt: at(14) });
    expect(streak(groupByDay([late, ok]), today)).toBe(1);
  });
});

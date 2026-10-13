import { describe, expect, it } from 'vitest';
import { addDays, diffDays, weekDays, weekStartOf } from './dates';
import { parseQuickAdd } from './parse';
import { carryOver, completed, groupByDay, lastNDaysCounts, sortActive, streak, timeInfo } from './stats';
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

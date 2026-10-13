import type { Task } from '../types';

/** The number a task is ordered by: its dragged position, or the moment it was added. */
export const orderKey = (t: Task): number => t.position ?? t.createdAt;

/** Manual order, top to bottom. New tasks land at the bottom. */
export function sortManual(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => orderKey(a) - orderKey(b) || a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
}

/**
 * The position that puts a task at `index` in `others` (the list without the moved task).
 * It sits halfway between its new neighbours, so no other task needs to change.
 */
export function positionAt(others: Task[], index: number): number {
  const prev = others[index - 1];
  const next = others[index];
  if (!prev && !next) return Date.now();
  if (!prev) return orderKey(next) - 1000;
  if (!next) return orderKey(prev) + 1000;
  return (orderKey(prev) + orderKey(next)) / 2;
}

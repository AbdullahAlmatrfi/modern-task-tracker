import type { DayKey, Task } from '../types';
import { newId } from './id';

export interface NewTaskFields {
  title: string;
  description?: string;
  time?: string | null;
  lane?: string | null;
  priority?: boolean;
}

export function createTask(day: DayKey, f: NewTaskFields, now: number = Date.now()): Task {
  return {
    id: newId(),
    day,
    title: f.title,
    description: f.description ?? '',
    time: f.time ?? null,
    lane: f.lane ?? null,
    priority: f.priority ?? false,
    done: false,
    doneAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

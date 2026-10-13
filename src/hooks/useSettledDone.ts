import { useEffect, useState } from 'react';
import type { Task } from '../types';
import { reducedMotion } from '../lib/motion';

/**
 * Which section each task belongs in. When a task is ticked it stays where it is for a
 * moment, so the check and strike-through animation can play, then it moves to "Done".
 */
export function useSettledDone(tasks: Task[], delay = 650): Record<string, boolean> {
  const wait = reducedMotion ? 0 : delay;
  const [settled, setSettled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tasks.map((t) => [t.id, t.done])),
  );

  useEffect(() => {
    const timers: number[] = [];
    const fresh: Record<string, boolean> = {};
    for (const t of tasks) if (!(t.id in settled)) fresh[t.id] = t.done;
    if (Object.keys(fresh).length) setSettled((s) => ({ ...s, ...fresh }));
    for (const t of tasks) {
      if (t.id in settled && settled[t.id] !== t.done) {
        timers.push(window.setTimeout(() => setSettled((s) => ({ ...s, [t.id]: t.done })), wait));
      }
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  return settled;
}

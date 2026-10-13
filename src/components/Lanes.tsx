import type { CSSProperties } from 'react';
import type { Task } from '../types';
import { laneColor } from '../lib/lanes';

export function Lanes({ tasks }: { tasks: Task[] }) {
  const map = new Map<string, { lane: string | null; n: number; done: number }>();
  for (const t of tasks) {
    const key = t.lane ?? 'general';
    const o = map.get(key) ?? { lane: t.lane, n: 0, done: 0 };
    o.n++;
    if (t.done) o.done++;
    map.set(key, o);
  }
  if (map.size === 0) return null;

  return (
    <section>
      <h2 className="sec">Lanes</h2>
      <div id="lanes">
        {[...map.entries()].map(([name, o]) => (
          <div key={name} className="lane" style={{ '--c': laneColor(o.lane) } as CSSProperties}>
            <span className="ln">
              <i className="dot" />
              <span>{name}</span>
            </span>
            <div className="bar">
              <i style={{ '--w': `${Math.round((o.done / o.n) * 100)}%` } as CSSProperties} />
            </div>
            <span className="lc">
              {o.done}/{o.n}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

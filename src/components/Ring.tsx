import { useEffect, useMemo, useState } from 'react';
import type { Task } from '../types';
import { laneColor } from '../lib/lanes';
import { useCountUp } from '../hooks/useCountUp';

const RC = 2 * Math.PI * 84;
const RW = 10;

/** One arc per task, in its lane color. An arc fills when its task is done. */
export function Ring({ tasks }: { tasks: Task[] }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setArmed(true));
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, []);

  const list = useMemo(() => [...tasks].sort((a, b) => a.createdAt - b.createdAt), [tasks]);
  const N = list.length;
  const done = list.filter((t) => t.done).length;
  const count = useCountUp(done);

  const single = N === 1;
  const gap = single ? 0 : Math.max(5, Math.min(12, 70 / Math.max(N, 1)));
  const seg = single ? RC : (RC - N * gap) / Math.max(N, 1);
  const dash = single ? RC : Math.max(seg - RW, 0.5);

  return (
    <div
      className={'ringwrap' + (N > 0 && done === N ? ' complete' : '')}
      role="img"
      aria-label={`${done} of ${N} tasks done`}
    >
      <svg id="ring" viewBox="0 0 200 200" aria-hidden="true">
        <g transform="rotate(-90 100 100)">
          {N === 0 ? (
            <circle cx="100" cy="100" r="84" strokeWidth={RW} className="trk" style={{ stroke: 'var(--fg)' }} />
          ) : (
            list.map((t, i) => {
              const offset = single ? 0 : -(i * (seg + gap) + RW / 2);
              const color = laneColor(t.lane);
              const on = armed && t.done;
              return (
                <g key={t.id}>
                  <circle
                    cx="100"
                    cy="100"
                    r="84"
                    strokeWidth={RW}
                    className="trk"
                    style={{ stroke: color }}
                    strokeDasharray={`${dash} ${RC}`}
                    strokeDashoffset={offset}
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="84"
                    strokeWidth={RW}
                    className="fill"
                    style={{
                      stroke: color,
                      strokeDasharray: on ? `${dash} ${RC}` : `0.01 ${RC}`,
                      opacity: on ? 1 : 0,
                    }}
                    strokeDashoffset={offset}
                  />
                </g>
              );
            })
          )}
        </g>
      </svg>
      <div className="ringc">
        <div className="big">{count}</div>
        <div className="lbl">of {N} done</div>
      </div>
    </div>
  );
}

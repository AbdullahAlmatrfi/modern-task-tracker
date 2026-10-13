import type { DayKey, Task, WeekStart } from '../types';
import { diffDays, fromKey, weekDays, weekStartOf } from '../lib/dates';
import { ChevronIcon } from './icons';

interface Props {
  anchor: DayKey;
  selected: DayKey | null;
  today: DayKey;
  weekStart: WeekStart;
  byDay: Record<DayKey, Task[]>;
  onSelect: (day: DayKey) => void;
  onShift: (days: number) => void;
}

const MINI = 2 * Math.PI * 9;

export function Week({ anchor, selected, today, weekStart, byDay, onSelect, onShift }: Props) {
  const days = weekDays(anchor, weekStart);
  const thisWeek = weekStartOf(anchor, weekStart) === weekStartOf(today, weekStart);
  const range = `${fromKey(days[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${fromKey(
    days[6],
  ).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  return (
    <div className="weekwrap">
      <div className="weekhead">
        <h2 className="sec">{thisWeek ? 'This week' : range}</h2>
        <div className="btns">
          <button type="button" className="ib prev" aria-label="Previous week" onClick={() => onShift(-7)}>
            <ChevronIcon />
          </button>
          <button type="button" className="ib next" aria-label="Next week" onClick={() => onShift(7)}>
            <ChevronIcon />
          </button>
        </div>
      </div>
      <nav className="week" aria-label="Pick a day">
        {days.map((k) => {
          const list = byDay[k] ?? [];
          const done = list.filter((t) => t.done).length;
          const frac = list.length ? done / list.length : 0;
          const d = fromKey(k);
          return (
            <button
              key={k}
              type="button"
              className={'wd' + (k === today ? ' today' : '')}
              aria-pressed={k === selected}
              aria-label={`${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}${
                list.length ? `, ${done} of ${list.length} done` : ''
              }${diffDays(k, today) === 0 ? ', today' : ''}`}
              onClick={() => onSelect(k)}
            >
              <span className="w">{d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}</span>
              <span className="n">{d.getDate()}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="mtrk" />
                {list.length > 0 && (
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="mfill"
                    transform="rotate(-90 12 12)"
                    strokeDasharray={`${frac * MINI} ${MINI}`}
                    style={{ opacity: frac ? 1 : 0 }}
                  />
                )}
              </svg>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

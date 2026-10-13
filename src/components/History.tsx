import { useMemo, useState, type CSSProperties } from 'react';
import type { DayKey, Task } from '../types';
import { dayLabel, fromKey, pad, toKey, weekStartOf } from '../lib/dates';
import { laneColor } from '../lib/lanes';
import { completed, lastNDaysCounts, streak, groupByDay, type Completed } from '../lib/stats';
import type { WeekStart } from '../types';
import { CheckIcon, TrashIcon } from './icons';

interface Props {
  tasks: Task[];
  today: DayKey;
  weekStart: WeekStart;
  onUndo: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const PAGE = 80;

export function History({ tasks, today, weekStart, onUndo, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [lane, setLane] = useState('all');
  const [limit, setLimit] = useState(PAGE);

  const all = useMemo(() => completed(tasks), [tasks]);
  const byDay = useMemo(() => groupByDay(tasks), [tasks]);
  const weekMs = fromKey(weekStartOf(today, weekStart)).getTime();
  const thisWeek = all.filter((c) => c.at >= weekMs).length;
  const bars = useMemo(() => lastNDaysCounts(all, today, 14), [all, today]);
  const max = Math.max(1, ...bars.map((b) => b.count));

  const lanes = useMemo(() => {
    const set = new Set<string>();
    for (const c of all) set.add(c.task.lane ?? 'general');
    return [...set];
  }, [all]);
  const activeLane = lane === 'all' || lanes.includes(lane) ? lane : 'all';

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((c) => {
      if (activeLane !== 'all') {
        if (activeLane === 'general' ? c.task.lane !== null : c.task.lane !== activeLane) return false;
      }
      if (q && !`${c.task.title} ${c.task.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, activeLane, query]);

  const groups: { day: DayKey; items: Completed[] }[] = [];
  for (const c of rows.slice(0, limit)) {
    const k = toKey(new Date(c.at));
    const last = groups[groups.length - 1];
    if (last && last.day === k) last.items.push(c);
    else groups.push({ day: k, items: [c] });
  }

  return (
    <div className="view">
      <div className="hstats">
        <Stat n={all.length} label="completed" />
        <Stat n={thisWeek} label="this week" />
        <Stat n={streak(byDay, today)} label="day streak" />
      </div>

      <div>
        <h2 className="sec" style={{ marginBottom: 12 }}>
          Last 14 days
        </h2>
        <div className="hbars">
          {bars.map((b) => (
            <div
              key={b.day}
              className={'hb' + (b.day === today ? ' td' : '')}
              title={`${dayLabel(b.day, today)}: ${b.count} done`}
            >
              <i
                className={b.count ? '' : 'z'}
                style={{ '--h': `${b.count ? Math.max(6, Math.round((b.count / max) * 60)) : 3}px` } as CSSProperties}
              />
              <span>{fromKey(b.day).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="sr" htmlFor="hq">
          Search history
        </label>
        <input
          id="hq"
          className="hq"
          type="search"
          placeholder="Search completed tasks"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
        />
        <div className="hfilters">
          {['all', ...lanes].map((l) => (
            <button
              key={l}
              type="button"
              className="tagbtn"
              aria-pressed={activeLane === l}
              style={{ '--c': l === 'all' ? 'var(--fg)' : laneColor(l === 'general' ? null : l) } as CSSProperties}
              onClick={() => {
                setLane(l);
                setLimit(PAGE);
              }}
            >
              {l !== 'all' && <i className="dot" />}
              {l}
            </button>
          ))}
        </div>
      </div>

      <div id="hlist">
        {rows.length === 0 ? (
          <div className="empty">
            <div className="etitle">{all.length ? 'No matches' : 'Nothing completed yet'}</div>
            <p>
              {all.length
                ? 'Try a different search or lane.'
                : 'Tick off a task and it lands here, grouped by the day you finished it.'}
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.day}>
              <h2 className="sec">
                {dayLabel(g.day, today)} <span className="cnt">{g.items.length}</span>
              </h2>
              <ul className="rows">
                {g.items.map((c) => (
                  <HistoryRow key={c.task.id} item={c} today={today} onUndo={onUndo} onDelete={onDelete} />
                ))}
              </ul>
            </div>
          ))
        )}
        {rows.length > limit && (
          <button type="button" className="btn more" onClick={() => setLimit((n) => n + PAGE)}>
            Show more ({rows.length - limit} left)
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="hs">
      <b>{n}</b>
      <span>{label}</span>
    </div>
  );
}

function HistoryRow({
  item,
  today,
  onUndo,
  onDelete,
}: {
  item: Completed;
  today: DayKey;
  onUndo: (t: Task) => void;
  onDelete: (t: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  const { task, at } = item;
  const when = new Date(at);
  const doneDay = toKey(when);
  return (
    <li className="row done hrow" style={{ '--c': laneColor(task.lane) } as CSSProperties}>
      <button
        type="button"
        className="chk"
        role="checkbox"
        aria-checked="true"
        aria-label={`Move back to to-do: ${task.title}`}
        title="Move back to to-do"
        onClick={() => onUndo(task)}
      >
        <span>
          <CheckIcon />
        </span>
      </button>
      <div className="main">
        <div className="title">
          <span>{task.title}</span>
        </div>
        {task.description && (
          <div className={'desc' + (open ? ' open' : '')} onClick={() => setOpen((o) => !o)}>
            {task.description}
          </div>
        )}
        <div className="meta">
          <span className="tm">
            done {pad(when.getHours())}:{pad(when.getMinutes())}
          </span>
          {task.lane && (
            <span className="tg">
              <i className="dot" />#{task.lane}
            </span>
          )}
          {task.priority && <span className="pri">high</span>}
          {task.day !== doneDay && <span>planned {dayLabel(task.day, today)}</span>}
        </div>
      </div>
      <div className="acts">
        <button type="button" className="ib" aria-label="Delete from history" title="Delete" onClick={() => onDelete(task)}>
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}

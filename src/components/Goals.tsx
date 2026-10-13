import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import type { DayKey, Goal, Task } from '../types';
import { addDays, dayLabel, fromKey, toKey } from '../lib/dates';
import { laneColor } from '../lib/lanes';
import { daysLeftText, goalProgress, goalTaskStats, goalTicks, orderGoals } from '../lib/goals';
import { CheckIcon, FlagIcon, PencilIcon, TrashIcon } from './icons';

export interface GoalFields {
  title: string;
  target: DayKey;
  lane: string | null;
}

interface Props {
  goals: Goal[];
  tasks: Task[];
  today: DayKey;
  lanes: string[];
  onAdd: (fields: GoalFields) => void;
  onUpdate: (id: string, fields: GoalFields) => void;
  onReach: (goal: Goal, card: HTMLElement) => void;
  onDelete: (goal: Goal) => void;
}

const VISIBLE = 3;
const longDate = (k: DayKey) =>
  fromKey(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const shortDate = (k: DayKey) => fromKey(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function Goals({ goals, tasks, today, lanes, onAdd, onUpdate, onReach, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const ordered = orderGoals(goals);
  const shown = showAll ? ordered : ordered.slice(0, VISIBLE);
  const activeCount = goals.filter((g) => g.reachedAt === null).length;

  return (
    <section className="goals" aria-label="Goals">
      <div className="goalshead">
        <h2 className="sec">
          Goals <span className="cnt">{activeCount}</span>
        </h2>
        {!adding && (
          <button type="button" className="tagbtn" onClick={() => setAdding(true)}>
            + Goal
          </button>
        )}
      </div>

      {adding && (
        <GoalForm
          today={today}
          lanes={lanes}
          minDate={addDays(today, 1)}
          submitLabel="Set goal"
          onCancel={() => setAdding(false)}
          onSubmit={(f) => {
            onAdd(f);
            setAdding(false);
          }}
        />
      )}

      {goals.length === 0 && !adding && (
        <div className="goalempty">
          <FlagIcon />
          <p>Set a goal with a date. A line will run from today to that day, and you will watch yourself travel along it.</p>
        </div>
      )}

      {shown.map((g) =>
        editing === g.id ? (
          <GoalForm
            key={g.id}
            today={today}
            lanes={lanes}
            initial={g}
            minDate={addDays(g.start, 1)}
            submitLabel="Save"
            onCancel={() => setEditing(null)}
            onSubmit={(f) => {
              onUpdate(g.id, f);
              setEditing(null);
            }}
          />
        ) : (
          <GoalCard
            key={g.id}
            goal={g}
            tasks={tasks}
            today={today}
            onEdit={() => setEditing(g.id)}
            onReach={onReach}
            onDelete={onDelete}
          />
        ),
      )}

      {ordered.length > VISIBLE && (
        <button type="button" className="btn ghost goalmore" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Show fewer' : `Show all (${ordered.length})`}
        </button>
      )}
    </section>
  );
}

function GoalCard({
  goal,
  tasks,
  today,
  onEdit,
  onReach,
  onDelete,
}: {
  goal: Goal;
  tasks: Task[];
  today: DayKey;
  onEdit: () => void;
  onReach: (goal: Goal, card: HTMLElement) => void;
  onDelete: (goal: Goal) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const p = goalProgress(goal, today);
  const stats = goalTaskStats(goal, tasks);
  const count = daysLeftText(p.left);
  const ticks = goalTicks(p.totalDays);
  const pct = Math.round(p.pct * 1000) / 10;
  const color = laneColor(goal.lane);
  const nowShift = p.pct < 0.14 ? '-10%' : p.pct > 0.86 ? '-90%' : '-50%';

  if (!open) {
    return (
      <button
        type="button"
        className={`goalrow ${p.state}`}
        style={{ '--c': color, '--p': `${pct}%` } as CSSProperties}
        aria-label={`${goal.title}, ${count.big} ${count.small}. Open details`}
        onClick={() => setOpen(true)}
      >
        <span className="grt">{goal.title}</span>
        <span className="grbar" aria-hidden="true">
          <i />
        </span>
        <span className="grc">{p.state === 'reached' ? 'reached' : `${count.big} ${count.small}`}</span>
      </button>
    );
  }

  return (
    <article
      ref={ref}
      className={`goal ${p.state}`}
      style={{ '--c': color, '--p': `${pct}%`, '--tx': nowShift } as CSSProperties}
    >
      <div className="gtop">
        <div className="gtitle">{goal.title}</div>
        {p.state === 'reached' ? (
          <div className="gcount">
            <b>
              <CheckIcon />
            </b>
            <span>reached</span>
          </div>
        ) : (
          <div className="gcount">
            <b>{count.big}</b>
            <span>{count.small}</span>
          </div>
        )}
      </div>

      <div
        className="gline"
        role="img"
        aria-label={`${goal.title}: day ${p.elapsed} of ${p.totalDays}, ${count.big} ${count.small}`}
      >
        <div className="gtrack">
          <div className="gdash" />
          <div className="gdone" />
          {ticks.map((d) => (
            <i key={d} className="gtick" style={{ left: `${(d / p.totalDays) * 100}%` }} />
          ))}
          <span className="gstart" />
          {p.state !== 'reached' && p.state !== 'passed' && p.pct < 1 && <span className="gtravel" />}
          <span className="gnow">
            <em>{p.state === 'reached' ? 'Reached' : p.elapsed === 0 ? 'Day 0' : `Day ${p.elapsed}`}</em>
          </span>
          <span className="gflag">
            <FlagIcon />
          </span>
        </div>
        <div className="glabels">
          <span>{shortDate(goal.start)}</span>
          <span>{longDate(goal.target)}</span>
        </div>
      </div>

      <div className="gfoot">
        <div className="gstats">
          <span>{p.totalDays} days total</span>
          {p.state === 'reached' && goal.reachedAt !== null && (
            <span>
              reached {dayLabel(toKey(new Date(goal.reachedAt)), today)}
            </span>
          )}
          {goal.lane && stats && (
            <span className="tg">
              <i className="dot" />#{goal.lane}: {stats.done}/{stats.total} tasks done
            </span>
          )}
        </div>
        <div className="gacts">
          <button type="button" className="ib gless" onClick={() => setOpen(false)}>
            Less
          </button>
          <button
            type="button"
            className="ib"
            aria-label={p.state === 'reached' ? 'Mark as not reached' : 'Mark as reached'}
            title={p.state === 'reached' ? 'Mark as not reached' : 'Mark as reached'}
            onClick={() => ref.current && onReach(goal, ref.current)}
          >
            <CheckIcon />
          </button>
          <button type="button" className="ib" aria-label="Edit goal" title="Edit" onClick={onEdit}>
            <PencilIcon />
          </button>
          <button type="button" className="ib" aria-label="Delete goal" title="Delete" onClick={() => onDelete(goal)}>
            <TrashIcon />
          </button>
        </div>
      </div>
    </article>
  );
}

function GoalForm({
  today,
  lanes,
  initial,
  minDate,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  today: DayKey;
  lanes: string[];
  initial?: Goal;
  minDate: DayKey;
  submitLabel: string;
  onSubmit: (f: GoalFields) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [target, setTarget] = useState(initial?.target ?? '');
  const [lane, setLane] = useState(initial?.lane ?? '');
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError('Give the goal a name.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) return setError('Pick the date you want to reach it by.');
    if (target < minDate) return setError(initial ? 'The date must be after the day you set the goal.' : 'Pick a day after today.');
    setError(null);
    onSubmit({ title: t, target, lane: lane.trim().replace(/^#/, '').toLowerCase() || null });
  }

  const listId = `lanes-${initial?.id ?? 'new'}`;

  return (
    <form className="goalform" onSubmit={submit} autoComplete="off">
      <div className="gfield">
        <label htmlFor={`gt-${initial?.id ?? 'new'}`}>Goal</label>
        <input
          id={`gt-${initial?.id ?? 'new'}`}
          className="hq"
          value={title}
          maxLength={120}
          autoFocus
          placeholder="What do you want to reach?"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="grow2">
        <div className="gfield">
          <label htmlFor={`gd-${initial?.id ?? 'new'}`}>Date</label>
          <input
            id={`gd-${initial?.id ?? 'new'}`}
            className="hq"
            type="date"
            value={target}
            min={minDate}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div className="gfield">
          <label htmlFor={`gl-${initial?.id ?? 'new'}`}>Lane (optional)</label>
          <input
            id={`gl-${initial?.id ?? 'new'}`}
            className="hq"
            list={listId}
            value={lane}
            maxLength={40}
            placeholder="#lane"
            onChange={(e) => setLane(e.target.value)}
          />
          <datalist id={listId}>
            {lanes.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>
      </div>
      <p className="hintp" style={{ margin: 0 }}>
        {initial
          ? `The line starts on ${longDate(initial.start)}.`
          : `The line starts today, ${longDate(today)}, and ends on the date you pick.`}
      </p>
      {error && <p className="gerr">{error}</p>}
      <div className="erow">
        <button type="submit" className="btn solid">
          {submitLabel}
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

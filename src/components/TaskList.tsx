import { useMemo, useState } from 'react';
import type { DayKey, Task } from '../types';
import type { TaskPatch } from '../store/reducer';
import { fromKey } from '../lib/dates';
import { sortActive } from '../lib/stats';
import { useSettledDone } from '../hooks/useSettledDone';
import { TaskRow } from './TaskRow';
import { ChevronIcon } from './icons';

interface Props {
  day: DayKey;
  tasks: Task[];
  now: number;
  newId: string | null;
  onToggle: (task: Task, row: HTMLElement, button: HTMLElement) => void;
  onSave: (id: string, patch: TaskPatch) => void;
  onDelete: (task: Task) => void;
  onFocus: (task: Task) => void;
}

export function TaskList({ day, tasks, now, newId, onToggle, onSave, onDelete, onFocus }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const settled = useSettledDone(tasks);

  const active = useMemo(() => sortActive(tasks.filter((t) => !settled[t.id])), [tasks, settled]);
  const done = useMemo(
    () => tasks.filter((t) => settled[t.id]).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
    [tasks, settled],
  );

  const row = (t: Task) => (
    <TaskRow
      key={t.id}
      task={t}
      now={now}
      isNew={t.id === newId}
      onToggle={onToggle}
      onSave={onSave}
      onDelete={onDelete}
      onFocus={onFocus}
    />
  );

  if (tasks.length === 0) {
    return (
      <div id="list">
        <div className="empty">
          <div className="etitle">Nothing planned for {fromKey(day).toLocaleDateString(undefined, { weekday: 'long' })}</div>
          <p>Type a task above. Add a time like 14:30, a #lane, or ! to mark it high priority.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="list">
      {active.length > 0 ? (
        <>
          <h2 className="sec">
            To do <span className="cnt">{active.length}</span>
          </h2>
          <ul className="rows">{active.map(row)}</ul>
        </>
      ) : (
        <div className="clear">All clear. Nothing left for this day.</div>
      )}
      {done.length > 0 && (
        <>
          <button
            type="button"
            className="sec secbtn"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((c) => !c)}
          >
            Done <span className="cnt">{done.length}</span>
            <span className="chev">
              <ChevronIcon />
            </span>
          </button>
          {!collapsed && <ul className="rows">{done.map(row)}</ul>}
        </>
      )}
    </div>
  );
}

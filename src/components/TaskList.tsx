import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { DayKey, Task } from '../types';
import type { TaskPatch } from '../store/reducer';
import { fromKey } from '../lib/dates';
import { positionAt, sortManual } from '../lib/order';
import { reducedMotion } from '../lib/motion';
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
  onMove: (id: string, position: number) => void;
}

interface Drag {
  id: string;
  from: number;
  to: number;
  dy: number;
  phase: 'drag' | 'settle';
}

const SETTLE_MS = 200;

export function TaskList({ day, tasks, now, newId, onToggle, onSave, onDelete, onFocus, onMove }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [still, setStill] = useState(false);
  const settled = useSettledDone(tasks);
  const listRef = useRef<HTMLUListElement>(null);
  const gesture = useRef<{ startY: number; heights: number[]; mids: number[]; timer?: number } | null>(null);

  const active = useMemo(() => sortManual(tasks.filter((t) => !settled[t.id])), [tasks, settled]);
  const done = useMemo(
    () => tasks.filter((t) => settled[t.id]).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
    [tasks, settled],
  );

  useEffect(() => () => window.clearTimeout(gesture.current?.timer), []);

  /** Moves task `from` to slot `to`, with no animation (used by the keyboard and at the end of a drag). */
  const commit = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const moved = active[from];
      const others = active.filter((_, i) => i !== from);
      onMove(moved.id, positionAt(others, to));
    },
    [active, onMove],
  );

  function grab(e: ReactPointerEvent<HTMLButtonElement>, from: number) {
    if (e.button !== 0 || !listRef.current) return;
    const items = Array.from(listRef.current.children) as HTMLElement[];
    if (items.length !== active.length) return;
    const rects = items.map((li) => li.getBoundingClientRect());
    gesture.current = {
      startY: e.clientY,
      heights: rects.map((r) => r.height),
      mids: rects.map((r) => r.top + r.height / 2),
    };
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    setDrag({ id: active[from].id, from, to: from, dy: 0, phase: 'drag' });

    const g = gesture.current;
    const slotOffset = (to: number) => {
      let y = 0;
      if (to > from) for (let i = from + 1; i <= to; i++) y += g.heights[i];
      else for (let i = to; i < from; i++) y -= g.heights[i];
      return y;
    };

    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - g.startY;
      const center = g.mids[from] + dy;
      let to = 0;
      g.mids.forEach((m, i) => {
        if (i !== from && m < center) to++;
      });
      setDrag({ id: active[from].id, from, to, dy, phase: 'drag' });
    };

    const finish = (ev: PointerEvent, cancelled: boolean) => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', cancel);
      const center = g.mids[from] + (ev.clientY - g.startY);
      let to = 0;
      g.mids.forEach((m, i) => {
        if (i !== from && m < center) to++;
      });
      if (cancelled) to = from;
      const land = () => {
        setStill(true);
        commit(from, to);
        setDrag(null);
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => setStill(false)));
      };
      if (reducedMotion) return land();
      // glide into the slot, then save the new order
      setDrag({ id: active[from].id, from, to, dy: slotOffset(to), phase: 'settle' });
      g.timer = window.setTimeout(land, SETTLE_MS);
    };
    const up = (ev: PointerEvent) => finish(ev, false);
    const cancel = (ev: PointerEvent) => finish(ev, true);
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', cancel);
  }

  function dragFor(i: number): { kind: 'lift' | 'settle' | 'shift'; y: number } | undefined {
    if (!drag) return undefined;
    if (i === drag.from) return { kind: drag.phase === 'drag' ? 'lift' : 'settle', y: drag.dy };
    const h = gesture.current?.heights[drag.from] ?? 0;
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return { kind: 'shift', y: -h };
    if (drag.from > drag.to && i >= drag.to && i < drag.from) return { kind: 'shift', y: h };
    return { kind: 'shift', y: 0 };
  }

  const row = (t: Task, i?: number) => (
    <TaskRow
      key={t.id}
      task={t}
      now={now}
      isNew={t.id === newId}
      from={t.day !== day ? t.day : null}
      onToggle={onToggle}
      onSave={onSave}
      onDelete={onDelete}
      onFocus={onFocus}
      {...(i !== undefined && !t.done && active.length > 1
        ? {
            drag: dragFor(i),
            onGrab: (e: ReactPointerEvent<HTMLButtonElement>) => grab(e, i),
            onNudge: (dir: -1 | 1) => {
              const to = i + dir;
              if (to >= 0 && to < active.length) commit(i, to);
            },
          }
        : {})}
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
          <ul ref={listRef} className={'rows' + (drag ? ' dragging' : '') + (still ? ' still' : '')}>
            {active.map((t, i) => row(t, i))}
          </ul>
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
          {!collapsed && <ul className="rows">{done.map((t) => row(t))}</ul>}
        </>
      )}
    </div>
  );
}

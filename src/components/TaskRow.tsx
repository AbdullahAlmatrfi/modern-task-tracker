import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { Task } from '../types';
import type { TaskPatch } from '../store/reducer';
import { parseQuickAdd } from '../lib/parse';
import { laneColor } from '../lib/lanes';
import { timeInfo } from '../lib/stats';
import { reducedMotion } from '../lib/motion';
import { fromKey } from '../lib/dates';
import { CheckIcon, GripIcon, PlayIcon, TrashIcon } from './icons';

interface Props {
  task: Task;
  now: number;
  isNew: boolean;
  onToggle: (task: Task, row: HTMLElement, button: HTMLElement) => void;
  onSave: (id: string, patch: TaskPatch) => void;
  onDelete: (task: Task) => void;
  onFocus: (task: Task) => void;
  /** Day this task was planned for, when it is showing on a later day. */
  from?: string | null;
  /** Dragging: how this row is moving right now. */
  drag?: { kind: 'lift' | 'settle' | 'shift'; y: number };
  onGrab?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onNudge?: (dir: -1 | 1) => void;
}

export function TaskRow({ task, now, isNew, onToggle, onSave, onDelete, onFocus, from, drag, onGrab, onNudge }: Props) {
  const [editing, setEditing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description);
  const rowRef = useRef<HTMLLIElement>(null);
  const info = timeInfo(task, now);

  function startEdit() {
    setTitle(task.title);
    setDesc(task.description);
    setEditing(true);
  }

  function save() {
    const p = parseQuickAdd(title);
    if (!p.title) return;
    const patch: TaskPatch = { title: p.title, description: desc.trim() };
    if (p.time) patch.time = p.time;
    if (p.lane) patch.lane = p.lane;
    if (p.priority) patch.priority = true;
    onSave(task.id, patch);
    setEditing(false);
  }

  function remove() {
    if (reducedMotion) return onDelete(task);
    setLeaving(true);
    window.setTimeout(() => onDelete(task), 220);
  }

  const cls = ['row', task.done ? 'done' : '', isNew ? 'new' : '', leaving ? 'leaving' : '', drag ? drag.kind : '']
    .filter(Boolean)
    .join(' ');
  const style = {
    '--c': laneColor(task.lane),
    ...(drag ? { transform: `translateY(${drag.y}px)` } : {}),
  } as CSSProperties;

  return (
    <li ref={rowRef} className={cls} style={style}>
      {onGrab && !editing && (
        <button
          type="button"
          className="grip"
          aria-label={`Move: ${task.title}. Use the up and down arrow keys.`}
          title="Drag to reorder"
          onPointerDown={onGrab}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              onNudge?.(e.key === 'ArrowUp' ? -1 : 1);
            }
          }}
        >
          <GripIcon />
        </button>
      )}
      <button
        type="button"
        className="chk"
        role="checkbox"
        aria-checked={task.done}
        aria-label={`Done: ${task.title}`}
        onClick={(e) => rowRef.current && onToggle(task, rowRef.current, e.currentTarget)}
      >
        <span>
          <CheckIcon />
        </span>
      </button>

      <div className="main">
        {editing ? (
          <div className="eform">
            <input
              className="edit"
              value={title}
              maxLength={200}
              aria-label="Task title"
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') setEditing(false);
              }}
              onFocus={(e) => e.currentTarget.select()}
            />
            <textarea
              className="edit"
              rows={3}
              maxLength={2000}
              value={desc}
              aria-label="Description"
              placeholder="Description (optional)"
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
                if (e.key === 'Escape') setEditing(false);
              }}
            />
            <div className="erow">
              <button type="button" className="btn solid" onClick={save}>
                Save
              </button>
              <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="title"
              tabIndex={0}
              title="Click to edit"
              onClick={startEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') startEdit();
              }}
            >
              <span>{task.title}</span>
            </div>
            {task.description && (
              <div
                className={'desc' + (expanded ? ' open' : '')}
                title="Click to expand"
                onClick={() => setExpanded((x) => !x)}
              >
                {task.description}
              </div>
            )}
            <div className="meta">
              {task.time && <span className="tm">{task.time}</span>}
              {info && <span className={'tinfo ' + info.tone}>{info.label}</span>}
              {task.lane && (
                <span className="tg">
                  <i className="dot" />#{task.lane}
                </span>
              )}
              {task.priority && <span className="pri">high</span>}
              {from && !task.done && (
                <span className="from">from {fromKey(from).toLocaleDateString(undefined, { weekday: 'short' })} {fromKey(from).getDate()}</span>
              )}
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="acts">
          {!task.done && (
            <button type="button" className="ib" aria-label="Start focus session" title="Focus" onClick={() => onFocus(task)}>
              <PlayIcon />
            </button>
          )}
          <button type="button" className="ib" aria-label="Delete task" title="Delete" onClick={remove}>
            <TrashIcon />
          </button>
        </div>
      )}
    </li>
  );
}

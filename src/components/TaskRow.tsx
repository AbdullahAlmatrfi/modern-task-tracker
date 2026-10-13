import { useRef, useState, type CSSProperties } from 'react';
import type { Task } from '../types';
import type { TaskPatch } from '../store/reducer';
import { parseQuickAdd } from '../lib/parse';
import { laneColor } from '../lib/lanes';
import { timeInfo } from '../lib/stats';
import { reducedMotion } from '../lib/motion';
import { CheckIcon, PlayIcon, TrashIcon } from './icons';

interface Props {
  task: Task;
  now: number;
  isNew: boolean;
  onToggle: (task: Task, row: HTMLElement, button: HTMLElement) => void;
  onSave: (id: string, patch: TaskPatch) => void;
  onDelete: (task: Task) => void;
  onFocus: (task: Task) => void;
}

export function TaskRow({ task, now, isNew, onToggle, onSave, onDelete, onFocus }: Props) {
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

  const cls = ['row', task.done ? 'done' : '', isNew ? 'new' : '', leaving ? 'leaving' : ''].filter(Boolean).join(' ');

  return (
    <li ref={rowRef} className={cls} style={{ '--c': laneColor(task.lane) } as CSSProperties}>
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

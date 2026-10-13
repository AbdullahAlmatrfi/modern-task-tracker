import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type RefObject } from 'react';
import { parseQuickAdd, type QuickAdd } from '../lib/parse';
import { laneColor } from '../lib/lanes';
import { SendIcon } from './icons';

export interface AddFields extends QuickAdd {
  description: string;
}

interface Props {
  inputRef: RefObject<HTMLInputElement>;
  lanes: string[];
  onAdd: (fields: AddFields) => void;
}

export function Composer({ inputRef, lanes, onAdd }: Props) {
  const [text, setText] = useState('');
  const [desc, setDesc] = useState('');
  const [open, setOpen] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const parsed = parseQuickAdd(text);

  useEffect(() => {
    if (open) descRef.current?.focus();
  }, [open]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!parsed.title) return;
    onAdd({ ...parsed, description: desc.trim() });
    setText('');
    setDesc('');
    setOpen(false);
    inputRef.current?.focus();
  }

  function pickLane(lane: string) {
    const rest = text
      .replace(/(^|\s)#[\p{L}\p{N}_-]+/u, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    setText((rest ? rest + ' ' : '') + '#' + lane);
    inputRef.current?.focus();
  }

  return (
    <form className="composer" onSubmit={submit} autoComplete="off">
      <label className="sr" htmlFor="add">
        Add a task
      </label>
      <div className="cinput">
        <input
          id="add"
          ref={inputRef}
          value={text}
          maxLength={200}
          placeholder="Add a task"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
        />
        <button className="send" type="submit" aria-label="Add task">
          <SendIcon />
        </button>
      </div>
      {open && (
        <>
          <label className="sr" htmlFor="desc">
            Description
          </label>
          <textarea
            id="desc"
            ref={descRef}
            rows={2}
            maxLength={2000}
            value={desc}
            placeholder="Description: details, links, steps (optional)"
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit();
            }}
          />
        </>
      )}
      <div className="cfoot">
        <div className="chips">
          {!text.trim() ? (
            <span className="hint">14:30 sets a time, #lane sets a lane, ! marks it high.</span>
          ) : (
            <>
              {parsed.time && <span className="chip mono">{parsed.time}</span>}
              {parsed.lane && (
                <span className="chip" style={{ '--c': laneColor(parsed.lane) } as CSSProperties}>
                  <i className="dot" />#{parsed.lane}
                </span>
              )}
              {parsed.priority && <span className="chip hi">high</span>}
            </>
          )}
        </div>
        <div className="sugg">
          <button type="button" className="tagbtn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? '− Description' : '+ Description'}
          </button>
          {lanes.map((l) => (
            <button
              key={l}
              type="button"
              className="tagbtn"
              style={{ '--c': laneColor(l) } as CSSProperties}
              onClick={() => pickLane(l)}
            >
              <i className="dot" />
              {l}
            </button>
          ))}
          <kbd>N</kbd>
        </div>
      </div>
    </form>
  );
}

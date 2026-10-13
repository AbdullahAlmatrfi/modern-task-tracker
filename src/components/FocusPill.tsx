import type { CSSProperties } from 'react';
import { pad } from '../lib/dates';
import { useNow } from '../hooks/useNow';

export interface FocusSession {
  taskId: string;
  title: string;
  end: number;
  total: number;
}

interface Props {
  session: FocusSession;
  onExtend: () => void;
  onStop: () => void;
  onDone: () => void;
}

export function FocusPill({ session, onExtend, onStop, onDone }: Props) {
  const now = useNow(1000);
  const left = session.end - now;
  const finished = left <= 0;
  const secs = Math.max(0, Math.ceil(left / 1000));
  const progress = finished ? 100 : Math.min(100, (1 - left / session.total) * 100);

  return (
    <div className="fpill" style={{ '--p': `${progress}%` } as CSSProperties} role="timer" aria-live="off">
      {finished ? (
        <>
          <span className="ft">Session finished: {session.title}</span>
          <button type="button" className="fb pri" onClick={onDone}>
            Mark done
          </button>
          <button type="button" className="fb" onClick={onStop}>
            Dismiss
          </button>
        </>
      ) : (
        <>
          <span className="fdot" />
          <span className="ft">{session.title}</span>
          <span className="fclock">
            {pad(Math.floor(secs / 60))}:{pad(secs % 60)}
          </span>
          <button type="button" className="fb" onClick={onExtend}>
            +5m
          </button>
          <button type="button" className="fb" onClick={onStop}>
            Stop
          </button>
        </>
      )}
    </div>
  );
}

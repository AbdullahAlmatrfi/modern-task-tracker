import type { DayKey } from '../types';
import { fromKey, relativeLabel } from '../lib/dates';

interface Props {
  day: DayKey;
  today: DayKey;
  streak: number;
  onBackToToday: () => void;
}

export function Header({ day, today, streak, onBackToToday }: Props) {
  const d = fromKey(day);
  return (
    <header>
      <div className="eyebrow">
        <span>{relativeLabel(day, today)}</span>
        {day !== today && (
          <button className="linkbtn" type="button" onClick={onBackToToday}>
            Back to today
          </button>
        )}
      </div>
      <h1>{d.toLocaleDateString(undefined, { weekday: 'long' })}</h1>
      <p className="dmy">
        <span>{d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        {streak >= 1 && (
          <span className="streak">
            <b>{streak}</b> day streak
          </span>
        )}
      </p>
    </header>
  );
}

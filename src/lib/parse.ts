import { pad } from './dates';

export interface QuickAdd {
  title: string;
  time: string | null;
  lane: string | null;
  priority: boolean;
}

/**
 * Reads the shorthand typed into the add box:
 *   "Grade quiz 16:30 #teach !"  ->  time 16:30, lane "teach", high priority.
 * Also understands "4pm", "at 9:15", "@18:00", "!!" and "!high".
 */
export function parseQuickAdd(raw: string): QuickAdd {
  let t = raw;
  let time: string | null = null;
  let lane: string | null = null;
  let priority = false;

  t = t.replace(/(^|\s)#([\p{L}\p{N}_-]+)/u, (_m, a: string, b: string) => {
    lane = b.toLowerCase();
    return a;
  });
  t = t.replace(/(^|\s)!{1,2}(?:high)?(?=\s|$)/i, (_m, a: string) => {
    priority = true;
    return a;
  });
  t = t.replace(/(^|\s)(?:@|at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?=\s|$)/i, (_m, a: string, hh: string, mm: string) => {
    time = `${pad(Number(hh))}:${mm}`;
    return a;
  });
  if (!time) {
    t = t.replace(/(^|\s)(?:@|at\s+)?(1[0-2]|0?[1-9])\s?(am|pm)(?=\s|$)/i, (_m, a: string, hh: string, ap: string) => {
      let x = Number(hh) % 12;
      if (ap.toLowerCase() === 'pm') x += 12;
      time = `${pad(x)}:00`;
      return a;
    });
  }
  return { title: t.replace(/\s+/g, ' ').trim(), time, lane, priority };
}

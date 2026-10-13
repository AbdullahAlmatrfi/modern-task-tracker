import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Auth } from '../hooks/useAuth';
import type { Goal, Task } from '../types';
import { reducer, type TaskPatch } from '../store/reducer';
import { clearData, loadData, saveData } from '../store/storage';
import { exportJson, parseImport } from '../store/portable';
import { addDays, todayKey, weekStartOf } from '../lib/dates';
import { createTask } from '../lib/task';
import { topLanes } from '../lib/lanes';
import { burst } from '../lib/confetti';
import { carryOver, groupByDay, sortActive, streak } from '../lib/stats';
import { createGoal } from '../lib/goals';
import { useNow } from '../hooks/useNow';
import { usePrefs } from '../hooks/usePrefs';
import { useSync } from '../hooks/useSync';
import { useToast } from '../hooks/useToast';
import { Header } from './Header';
import { Ring } from './Ring';
import { Week } from './Week';
import { Lanes } from './Lanes';
import { Composer, type AddFields } from './Composer';
import { Goals, type GoalFields } from './Goals';
import { CarryBanner } from './CarryBanner';
import { TaskList } from './TaskList';
import { History } from './History';
import { FocusPill, type FocusSession } from './FocusPill';
import { Toast } from './Toast';
import { Account } from './Account';
import { ConfettiCanvas } from './ConfettiCanvas';

type View = 'plan' | 'history';

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Workspace({ auth }: { auth: Auth }) {
  const userId = auth.user?.id ?? null;
  const [data, dispatch] = useReducer(reducer, userId, loadData);
  const [prefs, setPrefs] = usePrefs();
  const now = useNow(30_000);
  const today = todayKey(now);
  const sync = useSync(userId, data, dispatch);
  const { toast, show, hide } = useToast();

  const [sel, setSel] = useState(today);
  const [anchor, setAnchor] = useState(today);
  const [view, setView] = useState<View>('plan');
  const [newId, setNewId] = useState<string | null>(null);
  const [session, setSession] = useState<FocusSession | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // save on every change
  useEffect(() => {
    saveData(userId, data);
  }, [userId, data]);

  // tasks made before signing in move into the account
  useEffect(() => {
    if (!userId) return;
    const guest = loadData(null);
    const guestTasks = Object.values(guest.tasks);
    const guestGoals = Object.values(guest.goals);
    if (guestTasks.length || guestGoals.length) {
      dispatch({ type: 'import', tasks: guestTasks, goals: guestGoals });
      clearData(null);
    }
  }, [userId]);

  // a new day (and so a new week) rolls over by itself
  const lastToday = useRef(today);
  useEffect(() => {
    const prev = lastToday.current;
    if (prev === today) return;
    lastToday.current = today;
    setSel((s) => (s === prev ? today : s));
    setAnchor((a) => (weekStartOf(a, prefs.weekStart) === weekStartOf(prev, prefs.weekStart) ? today : a));
  }, [today, prefs.weekStart]);

  // N or / jumps to the add box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N' || e.key === '/') {
        e.preventDefault();
        setView('plan');
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const tasks = useMemo(() => Object.values(data.tasks), [data.tasks]);
  const goals = useMemo(() => Object.values(data.goals), [data.goals]);
  const byDay = useMemo(() => groupByDay(tasks), [tasks]);
  const dayTasks = byDay[sel] ?? [];
  const lanes = useMemo(() => topLanes(tasks), [tasks]);
  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const streakNow = streak(byDay, today);
  const carry = useMemo(() => carryOver(tasks, today), [tasks, today]);

  const add = useCallback(
    (f: AddFields) => {
      const task = createTask(sel, f);
      dispatch({ type: 'add', task });
      setNewId(task.id);
    },
    [sel],
  );

  const toggle = useCallback(
    (task: Task, row: HTMLElement, button: HTMLElement) => {
      dispatch({ type: 'toggle', id: task.id, at: Date.now() });
      if (!task.done) {
        const r = button.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, getComputedStyle(row).getPropertyValue('--c').trim() || '#888');
        setSession((s) => (s?.taskId === task.id ? null : s));
      }
    },
    [],
  );

  const save = useCallback((id: string, patch: TaskPatch) => {
    dispatch({ type: 'update', id, patch, at: Date.now() });
  }, []);

  const remove = useCallback(
    (task: Task) => {
      dispatch({ type: 'remove', id: task.id });
      setSession((s) => (s?.taskId === task.id ? null : s));
      show('Task deleted', { label: 'Undo', run: () => dispatch({ type: 'restore', task, at: Date.now() }) });
    },
    [show],
  );

  const undoDone = useCallback(
    (task: Task) => {
      dispatch({ type: 'toggle', id: task.id, at: Date.now() });
      show('Moved back to to-do');
    },
    [show],
  );

  const startFocus = useCallback(
    (task: Task) => {
      const total = prefs.focusMinutes * 60_000;
      setSession({ taskId: task.id, title: task.title, end: Date.now() + total, total });
    },
    [prefs.focusMinutes],
  );

  const finishFocus = useCallback(() => {
    if (session) {
      const t = data.tasks[session.taskId];
      if (t && !t.done) dispatch({ type: 'toggle', id: t.id, at: Date.now() });
    }
    setSession(null);
  }, [session, data.tasks]);

  const bringCarry = useCallback(() => {
    dispatch({ type: 'carry', ids: carry.map((t) => t.id), day: today, at: Date.now() });
  }, [carry, today]);

  const addGoal = useCallback(
    (f: GoalFields) => {
      dispatch({ type: 'goal/add', goal: createGoal(today, f) });
    },
    [today],
  );

  const updateGoal = useCallback((id: string, f: GoalFields) => {
    dispatch({ type: 'goal/update', id, patch: f, at: Date.now() });
  }, []);

  const reachGoal = useCallback((goal: Goal, card: HTMLElement) => {
    dispatch({ type: 'goal/reach', id: goal.id, at: Date.now() });
    if (goal.reachedAt === null) {
      const r = card.getBoundingClientRect();
      const color = getComputedStyle(card).getPropertyValue('--c').trim() || '#888';
      for (const f of [0.2, 0.5, 0.8]) burst(r.left + r.width * f, r.top + r.height / 2, color);
    }
  }, []);

  const removeGoal = useCallback(
    (goal: Goal) => {
      dispatch({ type: 'goal/remove', id: goal.id });
      show('Goal deleted', { label: 'Undo', run: () => dispatch({ type: 'goal/restore', goal, at: Date.now() }) });
    },
    [show],
  );

  const importText = useCallback(
    (text: string): string | null => {
      try {
        const { tasks: list, goals: goalList } = parseImport(text);
        if (!list.length && !goalList.length) return 'No tasks or goals found in that file.';
        dispatch({ type: 'import', tasks: list, goals: goalList });
        show(`Imported ${list.length} ${list.length === 1 ? 'task' : 'tasks'} and ${goalList.length} ${goalList.length === 1 ? 'goal' : 'goals'}`);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Could not read that file.';
      }
    },
    [show],
  );

  const active = dayTasks.filter((t) => !t.done);
  const next = sortActive(active).find((t) => t.time);
  const sub = !dayTasks.length
    ? 'A clean slate.'
    : !active.length
      ? 'Everything is done.'
      : `${active.length} left${next && sel === today ? ` · next at ${next.time}` : ''}`;

  return (
    <>
      <ConfettiCanvas />
      <div className="app">
        <aside className="rail">
          <Header
            day={sel}
            today={today}
            streak={streakNow}
            onBackToToday={() => {
              setSel(today);
              setAnchor(today);
            }}
          />
          <Ring tasks={dayTasks} />
          <p className="sub">{sub}</p>
          <Week
            anchor={anchor}
            selected={view === 'plan' ? sel : null}
            today={today}
            weekStart={prefs.weekStart}
            byDay={byDay}
            onSelect={(k) => {
              setSel(k);
              setView('plan');
            }}
            onShift={(n) => setAnchor((a) => addDays(a, n))}
          />
          <Lanes tasks={dayTasks} />
          <section>
            <h2 className="sec">Focus timer</h2>
            <div className="seg" role="group" aria-label="Focus length in minutes">
              {([15, 25, 50] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={prefs.focusMinutes === m}
                  onClick={() => setPrefs({ focusMinutes: m })}
                >
                  {m} min
                </button>
              ))}
            </div>
            <p className="hintp">Press the play icon on a task to start a session.</p>
          </section>
          <Account
            auth={auth}
            sync={sync}
            prefs={prefs}
            onPrefs={setPrefs}
            onExport={() => download(`dayflow-${today}.json`, exportJson(data))}
            onImport={importText}
          />
        </aside>

        <main className="col">
          <div className="tabs" role="tablist" aria-label="View">
            <button type="button" className="tab" role="tab" aria-selected={view === 'plan'} onClick={() => setView('plan')}>
              Plan
            </button>
            <button
              type="button"
              className="tab"
              role="tab"
              aria-selected={view === 'history'}
              onClick={() => setView('history')}
            >
              History <span className="tc">{doneCount}</span>
            </button>
          </div>

          {view === 'plan' ? (
            <div className="view">
              <Composer inputRef={inputRef} lanes={lanes} onAdd={add} />
              {sel === today && <CarryBanner count={carry.length} onBring={bringCarry} />}
              <TaskList
                day={sel}
                tasks={dayTasks}
                now={now}
                newId={newId}
                onToggle={toggle}
                onSave={save}
                onDelete={remove}
                onFocus={startFocus}
              />
              <Goals
                goals={goals}
                tasks={tasks}
                today={today}
                lanes={lanes}
                onAdd={addGoal}
                onUpdate={updateGoal}
                onReach={reachGoal}
                onDelete={removeGoal}
              />
            </div>
          ) : (
            <History
              tasks={tasks}
              today={today}
              weekStart={prefs.weekStart}
              onUndo={undoDone}
              onDelete={remove}
            />
          )}
        </main>
      </div>

      {session && (
        <FocusPill
          session={session}
          onExtend={() => setSession((s) => (s ? { ...s, end: s.end + 300_000, total: s.total + 300_000 } : s))}
          onStop={() => setSession(null)}
          onDone={finishFocus}
        />
      )}
      {toast && <Toast toast={toast} onClose={hide} />}
    </>
  );
}

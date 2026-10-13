import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import type { Data } from '../types';
import type { Action } from '../store/reducer';
import { supabase } from '../lib/supabase';
import { pullAll, pushPending } from '../store/remote';

export type SyncState = 'off' | 'idle' | 'syncing' | 'error';

const outbox = (d: Data) => Object.keys(d.pending).length + Object.keys(d.goalPending).length;

/**
 * Keeps local data and Supabase in step: push the outbox, then pull and merge.
 * Runs on load, shortly after a local change, when the tab regains focus,
 * when the network comes back, and once a minute.
 */
export function useSync(userId: string | null, data: Data, dispatch: Dispatch<Action>): SyncState {
  const enabled = supabase !== null && userId !== null;
  const [state, setState] = useState<SyncState>(enabled ? 'idle' : 'off');
  const latest = useRef(data);
  latest.current = data;
  const busy = useRef(false);

  const run = useCallback(async () => {
    if (!supabase || !userId || busy.current) return;
    busy.current = true;
    setState('syncing');
    try {
      const pushed = await pushPending(supabase, userId, latest.current);
      if (pushed.tasks.length) dispatch({ type: 'synced', items: pushed.tasks });
      if (pushed.goals.length) dispatch({ type: 'goal/synced', items: pushed.goals });
      const pulled = await pullAll(supabase);
      dispatch({ type: 'merge', rows: pulled.tasks, deleted: pulled.deletedTasks });
      dispatch({ type: 'goal/merge', rows: pulled.goals, deleted: pulled.deletedGoals });
      setState('idle');
      // changes made while we were syncing get their own pass
      window.setTimeout(() => {
        if (outbox(latest.current) > 0) void run();
      }, 1000);
    } catch {
      setState('error');
    } finally {
      busy.current = false;
    }
  }, [userId, dispatch]);

  useEffect(() => {
    if (!enabled) return;
    void run();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    const onOnline = () => void run();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    const id = window.setInterval(() => void run(), 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.clearInterval(id);
    };
  }, [enabled, run]);

  const pendingCount = outbox(data);
  useEffect(() => {
    if (!enabled || pendingCount === 0) return;
    const id = window.setTimeout(() => void run(), 800);
    return () => window.clearTimeout(id);
  }, [enabled, pendingCount, data.pending, data.goalPending, run]);

  return enabled ? state : 'off';
}

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Auth {
  /** True until we know whether someone is signed in. */
  loading: boolean;
  /** False when no Supabase keys are configured. */
  enabled: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export function useAuth(): Auth {
  const [state, setState] = useState<{ loading: boolean; user: User | null }>({
    loading: supabase !== null,
    user: null,
  });

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) setState({ loading: false, user: data.session?.user ?? null });
      })
      .catch(() => {
        if (alive) setState({ loading: false, user: null });
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => {
        const next = session?.user ?? null;
        return s.loading === false && s.user?.id === next?.id ? s : { loading: false, user: next };
      });
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  /** Signs in with email and password. Returns an error message, or null on success. */
  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Sign-in is not set up.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  /** Creates an account. Returns an error message, or null on success. */
  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Sign-in is not set up.';
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    // No session means the project still asks people to confirm their email first.
    if (!data.session) return 'Account created. Confirm your email, then sign in.';
    return null;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  return { loading: state.loading, enabled: supabase !== null, user: state.user, signIn, signUp, signOut };
}

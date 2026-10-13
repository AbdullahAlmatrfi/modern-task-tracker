import { useCallback, useState } from 'react';
import type { Prefs } from '../types';
import { loadPrefs, savePrefs } from '../store/storage';

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);
  return [prefs, update];
}

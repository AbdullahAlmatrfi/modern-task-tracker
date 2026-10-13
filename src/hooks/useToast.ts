import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastData {
  message: string;
  action?: { label: string; run: () => void };
}

export function useToast(ms = 5000) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef(0);

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback(
    (message: string, action?: ToastData['action']) => {
      window.clearTimeout(timer.current);
      setToast({ message, action });
      timer.current = window.setTimeout(() => setToast(null), ms);
    },
    [ms],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast, show, hide };
}

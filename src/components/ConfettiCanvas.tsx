import { useEffect, useRef } from 'react';
import { registerConfetti, resizeConfetti } from '../lib/confetti';

export function ConfettiCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    registerConfetti(ref.current);
    window.addEventListener('resize', resizeConfetti);
    return () => {
      window.removeEventListener('resize', resizeConfetti);
      registerConfetti(null);
    };
  }, []);
  return <canvas id="fx" ref={ref} aria-hidden="true" />;
}

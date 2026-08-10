import { useEffect, useCallback } from 'react';

export function useKeyPress(key: string, handler: () => void, enabled = true) {
  const memoHandler = useCallback(handler, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: KeyboardEvent) => {
      if (event.key === key) {
        memoHandler();
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [key, memoHandler, enabled]);
}

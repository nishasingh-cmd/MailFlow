import { useEffect, useCallback } from 'react';

/**
 * useKeyPress — fires a callback when a specific keyboard key is pressed.
 * @param key - KeyboardEvent.key value (e.g. 'Escape', 'Enter')
 * @param handler - callback to invoke
 * @param enabled - whether the listener is active
 */
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

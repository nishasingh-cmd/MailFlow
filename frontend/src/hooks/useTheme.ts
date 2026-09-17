import { useEffect } from 'react';

// Dark theme removed. Light mode is permanent.
export function useTheme() {
  useEffect(() => {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('mailflow-theme');
  }, []);

  return {
    theme: 'light' as const,
    isDark: false,
    toggleTheme: () => {},
    setDark: () => {},
    setLight: () => {},
  };
}

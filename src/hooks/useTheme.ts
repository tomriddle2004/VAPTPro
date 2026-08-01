import { useState, useCallback } from 'react';
import { Theme, getCurrentTheme, toggleTheme as libToggle } from '@/lib/theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getCurrentTheme);

  const toggle = useCallback(() => {
    const next = libToggle();
    setTheme(next);
  }, []);

  return { theme, toggle, isDark: theme === 'dark' };
}

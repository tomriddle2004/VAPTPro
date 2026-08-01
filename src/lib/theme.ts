/**
 * Theme management — persists to localStorage, applies on load before React hydration.
 * Call initTheme() in main.tsx before rendering.
 */
export type Theme = 'dark' | 'light';

const THEME_KEY = 'vapt_theme';

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'dark';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

export function initTheme(): void {
  applyTheme(getStoredTheme());
}

export function toggleTheme(): Theme {
  const current = (document.documentElement.getAttribute('data-theme') as Theme) ?? 'dark';
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

export function getCurrentTheme(): Theme {
  return (document.documentElement.getAttribute('data-theme') as Theme) ?? 'dark';
}

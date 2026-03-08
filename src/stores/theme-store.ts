import { create } from 'zustand';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  initialize: () => void;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'habitville-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  if (resolved === 'dark') {
    el.classList.add('dark');
  } else {
    el.classList.remove('dark');
  }
}

function resolveMode(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',
  resolved: 'light',

  initialize: () => {
    const saved = (typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null) as ThemeMode | null;
    const mode = saved ?? 'light';
    const resolved = resolveMode(mode);
    applyTheme(resolved);
    set({ mode, resolved });

    if (mode === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', () => {
        const state = get();
        if (state.mode === 'system') {
          const r = getSystemTheme();
          applyTheme(r);
          set({ resolved: r });
        }
      });
    }
  },

  setMode: (mode) => {
    const resolved = resolveMode(mode);
    applyTheme(resolved);
    set({ mode, resolved });
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  },
}));

'use client';

import { X, Sun, Moon, Monitor } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';
import { useThemeStore } from '@/stores/theme-store';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsScreen() {
  const activeScreen = useGameStore((s) => s.activeScreen);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  if (activeScreen !== 'settings') return null;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 150,
        background: 'var(--bg-page)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <button
          onClick={() => useGameStore.getState().openScreen('city')}
          className="p-1"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close"
        >
          <X size={22} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4">
        {/* Theme section */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Appearance
          </label>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = mode === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className="flex-1 flex flex-col items-center gap-1.5 rounded-xl py-3 transition-colors"
                  style={{
                    background: selected ? 'rgba(124, 58, 237, 0.12)' : 'var(--bg-subtle)',
                    border: selected ? '2px solid #7C3AED' : '2px solid transparent',
                  }}
                >
                  <Icon size={20} color={selected ? '#7C3AED' : 'var(--text-icon)'} />
                  <span
                    className="text-xs font-medium"
                    style={{ color: selected ? '#7C3AED' : 'var(--text-icon)' }}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { X, Settings2 } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';

export default function SettingsScreen() {
  const activeScreen = useGameStore((s) => s.activeScreen);

  if (activeScreen !== 'settings') return null;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 150,
        background: 'rgba(10, 12, 20, 0.97)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h1 className="text-lg font-semibold text-white">Settings</h1>
        <button
          onClick={() => useGameStore.getState().openScreen('city')}
          className="p-1 text-gray-400 active:text-white"
          aria-label="Close"
        >
          <X size={22} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
        <Settings2 size={48} className="text-gray-500/40" />
        <p className="text-gray-400 text-sm">Settings coming soon.</p>
      </div>
    </div>
  );
}

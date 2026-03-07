'use client';

import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';
import HabitList from './HabitList';

export default function HabitFab() {
  const [open, setOpen] = useState(false);
  const currentMode = useGameStore((s) => s.currentMode);
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const initialized = useGameStore((s) => s.initialized);

  if (!initialized || currentMode === 'build' || showOnboarding) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-4 w-14 h-14 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{ zIndex: 90 }}
        aria-label="Manage habits"
      >
        <ClipboardList size={24} />
      </button>

      {open && <HabitList onClose={() => setOpen(false)} />}
    </>
  );
}

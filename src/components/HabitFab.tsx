'use client';

import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';
import { useHabitStore } from '@/stores/habit-store';
import { isScheduledForDate, formatDateString } from '@/lib/schedule-utils';

export default function HabitFab() {
  const currentMode = useGameStore((s) => s.currentMode);
  const activeScreen = useGameStore((s) => s.activeScreen);
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const initialized = useGameStore((s) => s.initialized);
  const openScreen = useGameStore((s) => s.openScreen);

  const habits = useHabitStore((s) => s.habits);
  const todayCheckIns = useHabitStore((s) => s.todayCheckIns);

  const pendingCount = useMemo(() => {
    const today = formatDateString(new Date());
    const scheduled = habits.filter((h) => isScheduledForDate(h, today));
    const doneIds = new Set(
      todayCheckIns.filter((c) => c.completed || c.skipped).map((c) => c.habitId),
    );
    return scheduled.filter((h) => !doneIds.has(h.id)).length;
  }, [habits, todayCheckIns]);

  if (!initialized || currentMode === 'build' || showOnboarding || activeScreen !== 'city') return null;

  return (
    <button
      onClick={() => openScreen('check-in')}
      className="fixed bottom-6 right-4 flex items-center justify-center shadow-lg active:scale-95 transition-transform bg-emerald-500 text-white"
      style={{
        width: 52,
        height: 52,
        borderRadius: 12,
        zIndex: 90,
        position: 'fixed',
      }}
      aria-label="Check in habits"
    >
      <Check size={24} strokeWidth={3} />

      {/* Pending badge */}
      {pendingCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            background: '#ef4444',
            color: 'white',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 5px',
            lineHeight: 1,
          }}
        >
          {pendingCount}
        </span>
      )}
    </button>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Flame } from 'lucide-react';
import { GAME_CONFIG } from '@/config/game-config';
import { CATEGORY_META } from '@/config/habit-categories';
import { useHabitStore } from '@/stores/habit-store';
import { db } from '@/db/db';
import { calculateStreak } from '@/lib/streak-utils';
import type { Habit } from '@/types/habit';
import type { CheckIn } from '@/types/check-in';
import HabitForm from './HabitForm';

interface HabitListProps {
  onClose: () => void;
}

type FormState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; habit: Habit };

function frequencyLabel(habit: Habit): string {
  const f = habit.frequency;
  switch (f.type) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'times_per_week': return `${f.timesPerWeek}x/week`;
    case 'specific_days': {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return (f.specificDays ?? []).map((d) => days[d]).join('/');
    }
  }
}

export default function HabitList({ onClose }: HabitListProps) {
  const habits = useHabitStore((s) => s.habits);
  const [formState, setFormState] = useState<FormState>({ kind: 'closed' });
  const [streaks, setStreaks] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadStreaks() {
      if (habits.length === 0) return;
      const allCheckIns = await db.checkIns.toArray();
      const byHabit: Record<string, CheckIn[]> = {};
      for (const ci of allCheckIns) {
        (byHabit[ci.habitId] ??= []).push(ci);
      }
      const result: Record<string, number> = {};
      for (const h of habits) {
        result[h.id] = calculateStreak(h, byHabit[h.id] ?? []);
      }
      setStreaks(result);
    }
    loadStreaks();
  }, [habits]);

  const showWarning = habits.length > GAME_CONFIG.habits.soft_warning_threshold;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60"
        style={{ zIndex: 299 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 bg-gray-900 flex flex-col"
        style={{
          zIndex: 300,
          top: 'env(safe-area-inset-top)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-lg font-semibold text-white">My Habits</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormState({ kind: 'create' })}
              className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center active:bg-violet-700"
            >
              <Plus size={18} />
            </button>
            <button onClick={onClose} className="p-1 text-gray-400 active:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Warning banner */}
        {showWarning && (
          <div className="mx-4 mb-2 px-3 py-2 bg-amber-900/40 border border-amber-700/50 rounded-lg text-xs text-amber-300">
            You have a lot of habits! Research shows {GAME_CONFIG.habits.recommended_min}-{GAME_CONFIG.habits.recommended_max} is the sweet spot for consistency.
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4">
          {habits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-gray-400 text-sm mb-4">
                No habits yet. Create your first one to start building your city!
              </p>
              <button
                onClick={() => setFormState({ kind: 'create' })}
                className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium active:bg-violet-700"
              >
                Create Habit
              </button>
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              {habits.map((habit) => {
                const meta = CATEGORY_META[habit.category];
                const Icon = meta.icon;
                const streak = streaks[habit.id] ?? 0;
                return (
                  <button
                    key={habit.id}
                    onClick={() => setFormState({ kind: 'edit', habit })}
                    className="w-full flex items-center gap-3 rounded-xl bg-gray-800 px-3.5 py-3 text-left active:bg-gray-750"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: meta.color + '22' }}
                    >
                      <Icon size={18} color={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">
                          {habit.name}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{
                            background: meta.color + '22',
                            color: meta.color,
                          }}
                        >
                          {habit.difficulty.charAt(0).toUpperCase() + habit.difficulty.slice(1)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{frequencyLabel(habit)}</span>
                    </div>
                    {streak > 0 && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Flame size={14} className="text-orange-400" />
                        <span className="text-xs font-semibold text-orange-400">{streak}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Form overlay */}
      {formState.kind === 'create' && (
        <HabitForm
          mode="create"
          onClose={() => setFormState({ kind: 'closed' })}
        />
      )}
      {formState.kind === 'edit' && (
        <HabitForm
          mode="edit"
          habit={formState.habit}
          onClose={() => setFormState({ kind: 'closed' })}
        />
      )}
    </>
  );
}

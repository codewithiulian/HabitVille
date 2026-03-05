'use client';

import { useEffect, useState } from 'react';
import { useHabitStore, isScheduledDay } from '@/stores/habit-store';
import HabitItem from './HabitItem';
import type { HabitViewMode } from './HabitItem';
import HabitForm from './HabitForm';
import type { Habit } from '@/types/habits';

function isScheduledThisWeek(habit: Habit): boolean {
  const now = new Date();
  // Monday-based week: Mon=0 offset, Tue=1, ..., Sun=6
  const dayOfWeek = (now.getDay() + 6) % 7;
  for (let offset = -dayOfWeek; offset < 7 - dayOfWeek; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    if (isScheduledDay(d, habit.frequency, habit.customDays)) return true;
  }
  return false;
}

const VIEW_MODES: { value: HabitViewMode; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'all', label: 'All' },
];

export default function HabitList() {
  const habitListOpen = useHabitStore((s) => s.habitListOpen);
  const habits = useHabitStore((s) => s.habits);
  const todayCheckins = useHabitStore((s) => s.todayCheckins);
  const streaks = useHabitStore((s) => s.streaks);
  const loadHabits = useHabitStore((s) => s.loadHabits);
  const toggleCheckin = useHabitStore((s) => s.toggleCheckin);
  const closeHabitList = useHabitStore((s) => s.closeHabitList);
  const openHabitForm = useHabitStore((s) => s.openHabitForm);

  const [closing, setClosing] = useState(false);
  const [viewMode, setViewMode] = useState<HabitViewMode>('today');

  useEffect(() => {
    if (habitListOpen) {
      loadHabits();
      setClosing(false);
    }
  }, [habitListOpen, loadHabits]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      closeHabitList();
    }, 250);
  };

  if (!habitListOpen) return null;

  const today = new Date();

  // Filter habits based on view mode
  const filtered = viewMode === 'today'
    ? habits.filter((h) => isScheduledDay(today, h.frequency, h.customDays))
    : viewMode === 'week'
      ? habits.filter((h) => isScheduledThisWeek(h))
      : habits;

  const isCompletionMode = viewMode !== 'all';

  // Progress counts only for completion modes, based on filtered habits
  const total = filtered.length;
  const done = filtered.filter((h) => todayCheckins.has(h.id)).length;

  // Sort: in completion mode, unchecked first; in all mode, keep sortOrder
  const sorted = isCompletionMode
    ? [...filtered].sort((a, b) => {
        const aChecked = todayCheckins.has(a.id) ? 1 : 0;
        const bChecked = todayCheckins.has(b.id) ? 1 : 0;
        return aChecked - bChecked;
      })
    : filtered;

  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const headerTitle = viewMode === 'today'
    ? "Today's Habits"
    : viewMode === 'week'
      ? 'This Week'
      : 'All Habits';

  return (
    <>
      <div className="fixed inset-0" style={{ zIndex: 299 }}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

        {/* Sheet */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white"
          style={{
            maxHeight: '85vh',
            zIndex: 300,
            animation: closing ? 'slideDown 0.25s ease-in forwards' : 'slideUp 0.3s ease-out',
            paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          }}
        >
          {/* Grab bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{headerTitle}</h2>
              <p className="text-xs text-gray-400">{dateStr}</p>
            </div>
            <button
              onClick={() => openHabitForm()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-600 text-white shadow"
              aria-label="Add habit"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* View mode toggle */}
          <div className="mx-5 mb-3 flex rounded-lg bg-gray-100 p-0.5">
            {VIEW_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setViewMode(m.value)}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  viewMode === m.value
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Progress bar (completion modes only) */}
          {isCompletionMode && total > 0 && (
            <div className="px-5 pb-3">
              <p className="mb-1 text-xs text-gray-500">
                {done} of {total} completed
              </p>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Habit list */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 200px)' }}>
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <p className="text-2xl mb-2">&#127793;</p>
                <p className="text-sm font-medium text-gray-500">
                  {viewMode === 'today'
                    ? 'No habits scheduled for today'
                    : viewMode === 'week'
                      ? 'No habits scheduled this week'
                      : 'No habits yet'}
                </p>
                <p className="text-xs text-gray-400">Tap + to create your first habit</p>
              </div>
            ) : (
              sorted.map((habit) => (
                <HabitItem
                  key={habit.id}
                  habit={habit}
                  checkin={todayCheckins.get(habit.id)}
                  streak={streaks.get(habit.id) ?? { current: 0, longest: 0 }}
                  mode={viewMode}
                  onToggle={() => toggleCheckin(habit.id)}
                  onEdit={() => openHabitForm(habit)}
                />
              ))
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          @keyframes slideDown {
            from { transform: translateY(0); }
            to { transform: translateY(100%); }
          }
        `}</style>
      </div>

      <HabitForm />
    </>
  );
}

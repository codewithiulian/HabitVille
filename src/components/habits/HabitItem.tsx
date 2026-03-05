'use client';

import React from 'react';
import type { Habit, Checkin, StreakInfo } from '@/types/habits';
import StreakBadge from './StreakBadge';

export type HabitViewMode = 'today' | 'week' | 'all';

interface HabitItemProps {
  habit: Habit;
  checkin: Checkin | undefined;
  streak: StreakInfo;
  mode: HabitViewMode;
  onToggle: () => void;
  onEdit: () => void;
}

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  custom: 'Custom',
};

function HabitItem({ habit, checkin, streak, mode, onToggle, onEdit }: HabitItemProps) {
  const checked = !!checkin;
  const isCompletionMode = mode !== 'all';

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {/* Checkbox (completion modes only) */}
      {isCompletionMode && (
        <button
          onClick={onToggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center"
          aria-label={checked ? `Uncheck ${habit.name}` : `Check ${habit.name}`}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] transition-all duration-200"
            style={{
              borderColor: habit.color,
              backgroundColor: checked ? habit.color : 'transparent',
              transform: checked ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {checked && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 7L6 10L11 4"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </button>
      )}

      {/* Color dot (all/edit mode only) */}
      {!isCompletionMode && (
        <div
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: habit.color }}
        />
      )}

      {/* Icon + Name */}
      <div
        className={`flex min-w-0 flex-1 items-center gap-2 transition-opacity duration-200 ${
          isCompletionMode && checked ? 'opacity-50' : ''
        }`}
      >
        <span className="text-xl">{habit.icon}</span>
        <div className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-medium ${
              isCompletionMode && checked ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
          >
            {habit.name}
          </span>
          {!isCompletionMode && (
            <span className="text-xs text-gray-400">{FREQ_LABELS[habit.frequency] || habit.frequency}</span>
          )}
        </div>
      </div>

      {/* Streak (completion modes only) */}
      {isCompletionMode && <StreakBadge streak={streak} />}

      {/* Edit (all mode only) */}
      {!isCompletionMode && (
        <button
          onClick={onEdit}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-400"
          aria-label={`Edit ${habit.name}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default React.memo(HabitItem);

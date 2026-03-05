'use client';

import { useHabitStore, isScheduledDay } from '@/stores/habit-store';
import { useBuildStore } from '@/stores/build-store';

export default function HabitFAB() {
  const habits = useHabitStore((s) => s.habits);
  const todayCheckins = useHabitStore((s) => s.todayCheckins);
  const openHabitList = useHabitStore((s) => s.openHabitList);
  const buildMode = useBuildStore((s) => s.buildMode);

  if (buildMode) return null;

  const today = new Date();
  const scheduled = habits.filter((h) => isScheduledDay(today, h.frequency, h.customDays));
  const total = scheduled.length;
  const done = scheduled.filter((h) => todayCheckins.has(h.id)).length;
  const pct = total > 0 ? done / total : 0;

  // SVG ring params
  const size = 56;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <button
      onClick={openHabitList}
      className="fixed flex items-center justify-center rounded-full shadow-lg"
      style={{
        bottom: 80,
        right: 16,
        width: size,
        height: size,
        backgroundColor: '#7C3AED',
        zIndex: 90,
      }}
      aria-label="Open habits"
    >
      {/* Progress ring */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="white"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      {/* Text */}
      <span className="relative text-xs font-bold text-white">
        {done}/{total}
      </span>
    </button>
  );
}

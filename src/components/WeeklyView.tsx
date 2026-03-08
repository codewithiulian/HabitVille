'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Check, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHabitStore } from '@/stores/habit-store';
import { isScheduledForDate, formatDateString } from '@/lib/schedule-utils';
import { getWeeklyBonusMultiplier } from '@/lib/weekly-engine';
import type { Habit } from '@/types/habit';
import type { CheckIn } from '@/types/check-in';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getWeekDatesFromMonday(mondayStr: string): string[] {
  const monday = new Date(mondayStr + 'T00:00:00');
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    dates.push(formatDateString(day));
  }
  return dates;
}

function shiftWeek(mondayStr: string, offset: number): string {
  const d = new Date(mondayStr + 'T00:00:00');
  d.setDate(d.getDate() + offset * 7);
  return formatDateString(d);
}

function formatWeekRange(dates: string[]): string {
  const start = new Date(dates[0] + 'T00:00:00');
  const end = new Date(dates[6] + 'T00:00:00');
  const sMonth = MONTH_NAMES[start.getMonth()];
  const eMonth = MONTH_NAMES[end.getMonth()];
  if (sMonth === eMonth) {
    return `${sMonth} ${start.getDate()}–${end.getDate()}`;
  }
  return `${sMonth} ${start.getDate()} – ${eMonth} ${end.getDate()}`;
}

interface WeeklyViewProps {
  weekDates: string[];
  todayStr: string;
  onSelectDay: (date: string) => void;
}

export default function WeeklyView({ weekDates, todayStr, onSelectDay }: WeeklyViewProps) {
  const habits = useHabitStore((s) => s.habits);
  const getCheckInsForWeek = useHabitStore((s) => s.getCheckInsForWeek);

  const currentMonday = weekDates[0];
  const [viewingMonday, setViewingMonday] = useState(currentMonday);
  const isPastWeek = viewingMonday < currentMonday;
  const displayDates = useMemo(
    () => (isPastWeek ? getWeekDatesFromMonday(viewingMonday) : weekDates),
    [viewingMonday, isPastWeek, weekDates],
  );

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch check-ins for the displayed week
  useEffect(() => {
    async function load() {
      const data = await getCheckInsForWeek(displayDates[0]);
      setCheckIns(data);
    }
    load();
  }, [displayDates, getCheckInsForWeek, habits]);

  // Completion lookup: "YYYY-MM-DD:habitId"
  const completedSet = useMemo(() => {
    const set = new Set<string>();
    for (const ci of checkIns) {
      if (ci.completed) {
        set.add(`${ci.date}:${ci.habitId}`);
      }
    }
    return set;
  }, [checkIns]);

  // Scheduled habits per day
  const scheduledByDay = useMemo(() => {
    const map = new Map<string, Habit[]>();
    for (const date of displayDates) {
      map.set(date, habits.filter((h) => isScheduledForDate(h, date)));
    }
    return map;
  }, [displayDates, habits]);

  // The effective "last countable day" for stats — for past weeks, count all 7 days
  const lastCountableDay = isPastWeek ? displayDates[6] : todayStr;

  // Weekly stats for footer
  const weeklyStats = useMemo(() => {
    let totalScheduled = 0;
    let totalCompleted = 0;

    for (const date of displayDates) {
      if (date > lastCountableDay) continue;
      const dayHabits = scheduledByDay.get(date) ?? [];
      totalScheduled += dayHabits.length;
      for (const h of dayHabits) {
        if (completedSet.has(`${date}:${h.id}`)) {
          totalCompleted++;
        }
      }
    }

    const percentage = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
    const multiplier = getWeeklyBonusMultiplier(percentage);

    return { totalScheduled, totalCompleted, percentage, multiplier };
  }, [displayDates, lastCountableDay, scheduledByDay, completedSet]);

  // Auto-scroll today's column into center view (current week only)
  useEffect(() => {
    if (isPastWeek || !scrollRef.current) return;
    const todayIndex = displayDates.indexOf(todayStr);
    if (todayIndex === -1) return;

    const container = scrollRef.current;
    const columns = container.querySelectorAll('[data-day-col]');
    if (columns[todayIndex]) {
      const col = columns[todayIndex] as HTMLElement;
      const scrollLeft = col.offsetLeft - container.offsetWidth / 2 + col.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }
  }, [displayDates, todayStr, isPastWeek]);

  const goToPreviousWeek = useCallback(() => {
    setViewingMonday((m) => shiftWeek(m, -1));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setViewingMonday(currentMonday);
  }, [currentMonday]);

  // Column color coding
  function getColumnClasses(date: string): string {
    if (!isPastWeek && date > todayStr) return 'opacity-40';

    const dayHabits = scheduledByDay.get(date) ?? [];
    if (dayHabits.length === 0) return '';

    const completedCount = dayHabits.filter((h) => completedSet.has(`${date}:${h.id}`)).length;
    if (completedCount === dayHabits.length) return 'bg-emerald-500/10';
    if (completedCount > 0) return 'bg-amber-500/10';
    return '';
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Week header with navigation */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={goToPreviousWeek}
          className="flex items-center gap-1 text-sm text-gray-400 active:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Prev</span>
        </button>
        <span className="text-sm font-medium text-gray-300">
          {formatWeekRange(displayDates)}
        </span>
        {isPastWeek ? (
          <button
            onClick={goToCurrentWeek}
            className="flex items-center gap-1 text-sm text-violet-400 active:text-violet-300 transition-colors"
          >
            <span>Current</span>
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Past week indicator */}
      {isPastWeek && (
        <div className="mx-4 mb-2 py-1.5 px-3 rounded-lg bg-gray-800/60 text-center">
          <span className="text-xs text-gray-500">Past week — read only</span>
        </div>
      )}

      {/* Scrollable 7-column grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-auto px-2 pb-2"
      >
        <div className="flex gap-1.5 min-h-full" style={{ minWidth: 'min(100%, 980px)' }}>
          {displayDates.map((date, i) => {
            const isFuture = !isPastWeek && date > todayStr;
            const isToday = date === todayStr;
            const dayHabits = scheduledByDay.get(date) ?? [];
            const dayNum = date.split('-')[2];

            const tappable = !isFuture && !isPastWeek;

            return (
              <button
                key={date}
                data-day-col
                onClick={() => tappable && onSelectDay(date)}
                disabled={!tappable}
                className={`flex flex-col rounded-xl flex-1 min-w-[170px] text-left ${getColumnClasses(date)} ${
                  isToday ? 'ring-2 ring-violet-500/50' : ''
                } ${tappable ? 'active:bg-gray-700/30 cursor-pointer' : 'cursor-default'}`}
              >
                {/* Day header */}
                <div
                  className={`flex flex-col items-center py-2.5 rounded-t-xl ${
                    isToday ? 'bg-violet-600/20' : ''
                  }`}
                >
                  <span className={`text-xs font-medium ${isToday ? 'text-violet-300' : 'text-gray-400'}`}>
                    {DAY_LABELS[i]}
                  </span>
                  <span className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-300'}`}>
                    {parseInt(dayNum)}
                  </span>
                </div>

                {/* Habits list */}
                <div className="flex-1 px-1.5 pb-2 space-y-1">
                  {dayHabits.map((habit) => {
                    const isCompleted = completedSet.has(`${date}:${habit.id}`);

                    return (
                      <div
                        key={habit.id}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                      >
                        {isCompleted ? (
                          <Check size={14} className="text-emerald-400 shrink-0" />
                        ) : (
                          <Circle size={14} className="text-gray-500 shrink-0" />
                        )}
                        <span
                          className={`text-xs truncate ${
                            isCompleted ? 'text-gray-500 line-through' : 'text-gray-300'
                          }`}
                        >
                          {habit.name}
                        </span>
                      </div>
                    );
                  })}
                  {dayHabits.length === 0 && (
                    <p className="text-[10px] text-gray-600 text-center py-2">No habits</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer — progress bar + stats */}
      <div className="shrink-0 px-4 pt-3 pb-4 border-t border-gray-800">
        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-gray-800 mb-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${weeklyStats.percentage}%`,
              background: weeklyStats.percentage >= 80
                ? 'linear-gradient(90deg, #10B981, #34D399)'
                : weeklyStats.percentage >= 50
                  ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                  : 'linear-gradient(90deg, #6B7280, #9CA3AF)',
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-white">
              {weeklyStats.totalCompleted}/{weeklyStats.totalScheduled}
            </span>
            <span className="text-sm text-gray-400 ml-1.5">
              completed ({weeklyStats.percentage}%)
            </span>
          </div>
          <div className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
            weeklyStats.multiplier >= 2
              ? 'bg-emerald-500/20 text-emerald-400'
              : weeklyStats.multiplier >= 1
                ? 'bg-amber-500/20 text-amber-400'
                : weeklyStats.multiplier > 0
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-800 text-gray-500'
          }`}>
            {weeklyStats.multiplier > 0
              ? `${weeklyStats.multiplier}x bonus`
              : 'No bonus yet'}
          </div>
        </div>
      </div>
    </div>
  );
}

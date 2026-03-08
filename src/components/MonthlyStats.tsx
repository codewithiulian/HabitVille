'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Zap, Coins } from 'lucide-react';
import { db } from '@/db/db';
import { useHabitStore } from '@/stores/habit-store';
import { isScheduledForDate, formatDateString } from '@/lib/schedule-utils';
import type { CheckIn } from '@/types/check-in';
import type { Habit } from '@/types/habit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DayData {
  date: string;
  inMonth: boolean;
  scheduled: number;
  completed: number;
  rate: number; // 0-100
  habitDetails: { name: string; completed: boolean }[];
}

interface HabitRate {
  name: string;
  completed: number;
  scheduled: number;
  rate: number;
}

interface MonthData {
  days: DayData[];
  habitRates: HabitRate[];
  totalXP: number;
  totalCoins: number;
  overallRate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonthGrid(year: number, month: number): { date: string; inMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-based week: 0=Mon, 6=Sun
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: { date: string; inMonth: boolean }[] = [];

  // Fill leading days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ date: formatDateString(d), inMonth: false });
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ date: formatDateString(new Date(year, month, d)), inMonth: true });
  }

  // Fill trailing to complete last row
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, cells.length - startDow - lastDay.getDate() + 1);
    cells.push({ date: formatDateString(d), inMonth: false });
  }

  return cells;
}

function computeMonthData(
  year: number,
  month: number,
  habits: Habit[],
  checkIns: CheckIn[],
): MonthData {
  const grid = getMonthGrid(year, month);
  const today = formatDateString(new Date());

  const checkInMap = new Map<string, Set<string>>();
  let totalXP = 0;
  let totalCoins = 0;

  for (const ci of checkIns) {
    if (ci.completed) {
      const key = ci.date;
      if (!checkInMap.has(key)) checkInMap.set(key, new Set());
      checkInMap.get(key)!.add(ci.habitId);
      totalXP += ci.xpEarned;
      totalCoins += ci.coinsEarned;
    }
  }

  let monthScheduled = 0;
  let monthCompleted = 0;

  // Per-habit tracking for month
  const habitStats = new Map<string, { name: string; completed: number; scheduled: number }>();
  for (const h of habits) {
    habitStats.set(h.id, { name: h.name, completed: 0, scheduled: 0 });
  }

  const days: DayData[] = grid.map((cell) => {
    if (!cell.inMonth || cell.date > today) {
      return { ...cell, scheduled: 0, completed: 0, rate: -1, habitDetails: [] };
    }

    const scheduled = habits.filter((h) => isScheduledForDate(h, cell.date));
    const completedIds = checkInMap.get(cell.date) ?? new Set();
    const completedCount = scheduled.filter((h) => completedIds.has(h.id)).length;

    monthScheduled += scheduled.length;
    monthCompleted += completedCount;

    for (const h of scheduled) {
      const stats = habitStats.get(h.id);
      if (stats) {
        stats.scheduled++;
        if (completedIds.has(h.id)) stats.completed++;
      }
    }

    const rate = scheduled.length > 0 ? Math.round((completedCount / scheduled.length) * 100) : -1;

    return {
      ...cell,
      scheduled: scheduled.length,
      completed: completedCount,
      rate,
      habitDetails: scheduled.map((h) => ({
        name: h.name,
        completed: completedIds.has(h.id),
      })),
    };
  });

  const habitRates: HabitRate[] = [];
  for (const stats of habitStats.values()) {
    if (stats.scheduled > 0) {
      habitRates.push({
        ...stats,
        rate: Math.round((stats.completed / stats.scheduled) * 100),
      });
    }
  }
  habitRates.sort((a, b) => b.rate - a.rate);

  const overallRate = monthScheduled > 0 ? Math.round((monthCompleted / monthScheduled) * 100) : 0;

  return { days, habitRates, totalXP, totalCoins, overallRate };
}

function getDayCellColor(rate: number, inMonth: boolean): string {
  if (!inMonth || rate < 0) return 'transparent';
  if (rate === 100) return 'rgba(16, 185, 129, 0.5)';   // dark green
  if (rate >= 70) return 'rgba(16, 185, 129, 0.3)';     // medium green
  if (rate >= 50) return 'rgba(16, 185, 129, 0.15)';    // light green
  if (rate > 0) return 'rgba(0, 0, 0, 0.04)';             // light grey
  return 'rgba(0, 0, 0, 0.02)';                           // empty
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MonthlyStats() {
  const habits = useHabitStore((s) => s.habits);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [data, setData] = useState<MonthData | null>(null);
  const [prevRate, setPrevRate] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<DayData | null>(null);

  // Load data for selected month
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const firstDate = formatDateString(new Date(year, month, 1));
      const lastDate = formatDateString(new Date(year, month + 1, 0));

      const checkIns = await db.checkIns
        .where('date')
        .between(firstDate, lastDate, true, true)
        .toArray();

      if (cancelled) return;
      setData(computeMonthData(year, month, habits, checkIns));

      // Load previous month for trend
      const prevYear = month === 0 ? year - 1 : year;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevFirst = formatDateString(new Date(prevYear, prevMonth, 1));
      const prevLast = formatDateString(new Date(prevYear, prevMonth + 1, 0));
      const prevCheckIns = await db.checkIns
        .where('date')
        .between(prevFirst, prevLast, true, true)
        .toArray();

      if (cancelled) return;
      const prevData = computeMonthData(prevYear, prevMonth, habits, prevCheckIns);
      setPrevRate(prevData.overallRate);
    }
    load();
    return () => { cancelled = true; };
  }, [year, month, habits]);

  const goPrev = useCallback(() => {
    setTooltip(null);
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  }, [year, month]);

  const goNext = useCallback(() => {
    setTooltip(null);
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth()) return;
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  }, [year, month]);

  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (!data) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'rgba(0,0,0,0.25)' }}>
        Loading...
      </div>
    );
  }

  const trendDiff = prevRate !== null ? data.overallRate - prevRate : null;

  return (
    <div style={{ padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={goPrev}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <ChevronLeft size={20} color="rgba(0,0,0,0.45)" />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{monthLabel}</span>
        <button
          onClick={goNext}
          style={{
            background: 'none',
            border: 'none',
            cursor: isCurrentMonth ? 'default' : 'pointer',
            padding: 4,
            opacity: isCurrentMonth ? 0.3 : 1,
          }}
          disabled={isCurrentMonth}
        >
          <ChevronRight size={20} color="rgba(0,0,0,0.45)" />
        </button>
      </div>

      {/* Calendar heatmap */}
      <div>
        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'rgba(0,0,0,0.3)', fontWeight: 500 }}>
              {d}
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {data.days.map((day) => {
            const dayNum = parseInt(day.date.slice(8), 10);
            return (
              <button
                key={day.date}
                onClick={() => day.inMonth && day.rate >= 0 ? setTooltip(tooltip?.date === day.date ? null : day) : null}
                style={{
                  aspectRatio: '1',
                  borderRadius: 6,
                  border: 'none',
                  background: getDayCellColor(day.rate, day.inMonth),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: day.inMonth && day.rate >= 0 ? 'pointer' : 'default',
                  fontSize: 11,
                  fontWeight: 500,
                  color: day.inMonth ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.15)',
                  outline: tooltip?.date === day.date ? '2px solid rgba(59,130,246,0.5)' : 'none',
                }}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day tooltip */}
      {tooltip && (
        <div
          style={{
            background: 'rgba(0,0,0,0.03)',
            borderRadius: 10,
            padding: '10px 14px',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>
            {new Date(tooltip.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' — '}
            {tooltip.completed}/{tooltip.scheduled} ({tooltip.rate}%)
          </div>
          {tooltip.habitDetails.map((h) => (
            <div key={h.name} style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginLeft: 4, marginBottom: 2 }}>
              {h.completed ? '\u2705' : '\u2B1C'} {h.name}
            </div>
          ))}
        </div>
      )}

      {/* Per-habit completion rates */}
      {data.habitRates.length > 0 && (
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,0.55)', margin: '0 0 12px' }}>
            Per-Habit Rates
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.habitRates.map((h) => (
              <div key={h.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: '#1a1a1a' }}>{h.name}</span>
                  <span style={{ color: 'rgba(0,0,0,0.45)' }}>
                    {h.completed}/{h.scheduled} ({h.rate}%)
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${h.rate}%`,
                      borderRadius: 3,
                      background: h.rate >= 80 ? '#10B981' : h.rate >= 60 ? '#F59E0B' : '#EF4444',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trend vs last month */}
      {trendDiff !== null && (
        <section
          style={{
            background: 'rgba(0,0,0,0.03)',
            borderRadius: 14,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {trendDiff > 1 ? (
            <TrendingUp size={20} color="#10B981" />
          ) : trendDiff < -1 ? (
            <TrendingDown size={20} color="#EF4444" />
          ) : (
            <Minus size={20} color="#F59E0B" />
          )}
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>
            <span style={{ color: '#1a1a1a', fontWeight: 600 }}>{data.overallRate}%</span> this month
            {' vs '}
            <span style={{ color: '#1a1a1a', fontWeight: 600 }}>{prevRate}%</span> last month
            {trendDiff !== 0 && (
              <span style={{ color: trendDiff > 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                {' '}({trendDiff > 0 ? '+' : ''}{trendDiff}%)
              </span>
            )}
          </div>
        </section>
      )}

      {/* Monthly XP + Coins */}
      <section
        style={{
          display: 'flex',
          gap: 12,
        }}
      >
        <div
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.03)',
            borderRadius: 14,
            padding: '14px 16px',
            textAlign: 'center',
          }}
        >
          <Zap size={18} color="#3b82f6" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
            {data.totalXP.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>XP earned</div>
        </div>
        <div
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.03)',
            borderRadius: 14,
            padding: '14px 16px',
            textAlign: 'center',
          }}
        >
          <Coins size={18} color="#facc15" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: '#ca8a04' }}>
            {data.totalCoins.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>Coins earned</div>
        </div>
      </section>
    </div>
  );
}

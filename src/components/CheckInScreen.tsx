'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings, X } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';
import { rollDoubleXPEvent } from '@/lib/economy-engine';
import { formatDateString } from '@/lib/schedule-utils';
import DailyView from './DailyView';
import WeeklyView from './WeeklyView';
import HabitList from './HabitList';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekDates(today: Date): string[] {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  const jsDay = d.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    dates.push(formatDateString(day));
  }
  return dates;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CheckInScreen() {
  const activeScreen = useGameStore((s) => s.activeScreen);
  const openScreen = useGameStore((s) => s.openScreen);
  const setDeferLevelUps = useGameStore((s) => s.setDeferLevelUps);
  const setDoubleXPEvent = useGameStore((s) => s.setDoubleXPEvent);

  const todayStr = useMemo(() => formatDateString(new Date()), []);
  const weekDates = useMemo(() => getWeekDates(new Date()), []);

  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showHabitList, setShowHabitList] = useState(false);

  // Session lifecycle: defer level-ups, roll 2x XP event
  useEffect(() => {
    setDeferLevelUps(true);
    if (rollDoubleXPEvent()) {
      setDoubleXPEvent(true);
    }
    return () => {
      setDeferLevelUps(false);
      setDoubleXPEvent(false);
    };
  }, [setDeferLevelUps, setDoubleXPEvent]);

  const handleClose = useCallback(() => {
    openScreen('city');
  }, [openScreen]);

  // Weekly view: tap day header → switch to daily tab with that date
  const handleSelectDay = useCallback((date: string) => {
    setSelectedDate(date);
    setActiveTab('daily');
  }, []);

  if (activeScreen !== 'check-in') return null;

  return (
    <>
      <div
        className="fixed inset-0 flex flex-col"
        style={{ zIndex: 250, background: 'var(--bg-page)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-1" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Check-In</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHabitList(true)}
              className="p-2" style={{ color: 'var(--text-muted)' }}
              aria-label="Manage habits"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={handleClose}
              className="p-2" style={{ color: 'var(--text-muted)' }}
              aria-label="Close check-in"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex mx-4 mb-1 rounded-lg p-1" style={{ background: 'var(--bg-muted)' }}>
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'daily'
                ? 'bg-violet-600 text-white'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'weekly'
                ? 'bg-violet-600 text-white'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Weekly
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'daily' ? (
          <DailyView
            weekDates={weekDates}
            todayStr={todayStr}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onClose={handleClose}
          />
        ) : (
          <WeeklyView
            weekDates={weekDates}
            todayStr={todayStr}
            onSelectDay={handleSelectDay}
          />
        )}
      </div>

      {/* HabitList overlay (from settings gear) */}
      {showHabitList && <HabitList onClose={() => setShowHabitList(false)} />}
    </>
  );
}

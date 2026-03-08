'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { Settings, Flame, ChevronRight, ChevronLeft, Check, Trophy, Sparkles, X } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence, type PanInfo, type MotionValue } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';
import { useHabitStore } from '@/stores/habit-store';
import { usePlayerStore } from '@/stores/player-store';
import { CATEGORY_META } from '@/config/habit-categories';
import { isScheduledForDate, formatDateString } from '@/lib/schedule-utils';
import { calculateCheckInReward, rollSurpriseBonus } from '@/lib/economy-engine';
import { calculateStreak } from '@/lib/streak-utils';
import { GAME_CONFIG } from '@/config/game-config';
import { db } from '@/db/db';
import type { Habit } from '@/types/habit';
import type { CheckIn } from '@/types/check-in';
import HabitList from './HabitList';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CardItem {
  habit: Habit;
  streak: number;
  monthProgress: { done: number; total: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIME_PRIORITY: Record<string, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
  anytime: 3,
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

function getMonthProgress(
  habit: Habit,
  selectedDate: string,
  allCheckIns: CheckIn[],
): { done: number; total: number } {
  const [year, month] = selectedDate.split('-').map(Number);
  const today = formatDateString(new Date());
  const lastDay = selectedDate <= today ? selectedDate : today;

  const completedSet = new Set(
    allCheckIns.filter((c) => c.habitId === habit.id && c.completed).map((c) => c.date),
  );

  let total = 0;
  let done = 0;
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const ds = formatDateString(d);
    if (ds > lastDay) break;
    if (isScheduledForDate(habit, ds)) {
      total++;
      if (completedSet.has(ds)) done++;
    }
    d.setDate(d.getDate() + 1);
  }
  return { done, total };
}

// ---------------------------------------------------------------------------
// Celebration particles
// ---------------------------------------------------------------------------

function CelebrationBurst({ onDone }: { onDone: () => void }) {
  const particles = useMemo(() => {
    const colors = ['#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6', '#EF4444'];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 300,
      y: -(Math.random() * 250 + 80),
      rotate: Math.random() * 720 - 360,
      scale: Math.random() * 0.6 + 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  useEffect(() => {
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 260 }}>
      <div className="absolute left-1/2 top-1/2">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: p.x,
              y: p.y,
              scale: p.scale,
              opacity: 0,
              rotate: p.rotate,
            }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: p.color }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DateStrip({
  weekDates,
  selectedDate,
  todayStr,
  onSelect,
}: {
  weekDates: string[];
  selectedDate: string;
  todayStr: string;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="flex gap-1.5 px-4 py-2">
      {weekDates.map((date, i) => {
        const isToday = date === todayStr;
        const isFuture = date > todayStr;
        const isSelected = date === selectedDate;
        const dayNum = date.split('-')[2];

        return (
          <button
            key={date}
            onClick={() => onSelect(date)}
            disabled={isFuture}
            className={`flex-1 flex flex-col items-center py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isSelected
                ? 'bg-violet-600 text-white'
                : isToday
                  ? 'bg-violet-600/20 text-violet-300'
                  : isFuture
                    ? 'opacity-30 pointer-events-none text-gray-500'
                    : 'text-gray-400 active:bg-gray-700'
            }`}
          >
            <span className="text-[10px]">{DAY_LABELS[i]}</span>
            <span className="text-sm">{parseInt(dayNum)}</span>
          </button>
        );
      })}
    </div>
  );
}

function SwipeCard({
  card,
  x,
  onSwipeRight,
  onSwipeLeft,
  onExitStart,
  disabled,
}: {
  card: CardItem;
  x: MotionValue<number>;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onExitStart?: () => void;
  disabled?: boolean;
}) {
  const [exiting, setExiting] = useState(false);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const doneOpacity = useTransform(x, [0, 60], [0, 1]);
  const skipOpacity = useTransform(x, [-60, 0], [1, 0]);

  const meta = CATEGORY_META[card.habit.category];
  const Icon = meta.icon;

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (exiting || disabled) return;

    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absVel = Math.abs(velocity.x);

    // Multi-tier swipe detection for natural mobile feel:
    // 1. Dragged past 50px in either direction
    // 2. Quick flick (>250px/s) regardless of distance
    // 3. Short deliberate swipe (>25px AND >100px/s)
    const triggered =
      absX > 50 || absVel > 250 || (absX > 25 && absVel > 100);

    if (!triggered) {
      animate(x, 0, { type: 'spring', stiffness: 600, damping: 30 });
      return;
    }

    setExiting(true);
    onExitStart?.();

    const direction = offset.x > 0 ? 1 : -1;
    // Faster flick → faster exit animation (min 0.1s, max 0.25s)
    const duration = Math.max(0.1, Math.min(0.25, 150 / Math.max(absVel, 200)));

    animate(x, direction * (window.innerWidth + 200), {
      type: 'tween',
      duration,
      ease: 'easeOut',
    }).then(() => {
      if (direction === 1) onSwipeRight();
      else onSwipeLeft();
    });
  }

  return (
    <motion.div
      style={{ x, rotate, willChange: 'transform' }}
      drag={!exiting && !disabled ? 'x' : false}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 touch-none"
    >
      <div className="h-full rounded-2xl bg-gray-800 border border-gray-700 px-6 py-8 flex flex-col items-center justify-center relative overflow-hidden select-none">
        {/* Swipe indicators */}
        <motion.div
          style={{ opacity: doneOpacity }}
          className="absolute top-4 left-4 px-3 py-1 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 text-sm font-bold"
        >
          DONE
        </motion.div>
        <motion.div
          style={{ opacity: skipOpacity }}
          className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gray-500/20 border-2 border-gray-500 text-gray-400 text-sm font-bold"
        >
          SKIP
        </motion.div>

        {/* Category icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: meta.color + '22' }}
        >
          <Icon size={32} color={meta.color} />
        </div>

        {/* Difficulty badge */}
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full mb-3"
          style={{ background: meta.color + '22', color: meta.color }}
        >
          {card.habit.difficulty.charAt(0).toUpperCase() + card.habit.difficulty.slice(1)}
        </span>

        {/* Habit name */}
        <h3 className="text-xl font-bold text-white text-center mb-4">{card.habit.name}</h3>

        {/* Monthly progress */}
        <p className="text-sm text-gray-400 mb-2">
          {card.monthProgress.done}/{card.monthProgress.total} this month
        </p>

        {/* Streak */}
        {card.streak > 0 && (
          <div className="flex items-center gap-1 text-orange-400">
            <Flame size={16} />
            <span className="text-sm font-semibold">{card.streak} day streak</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SessionSummary({
  completed,
  total,
  xp,
  coins,
  perfectDay,
  onReturn,
}: {
  completed: number;
  total: number;
  xp: number;
  coins: number;
  perfectDay: boolean;
  onReturn: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      {perfectDay && (
        <div className="flex items-center gap-2 mb-4 text-yellow-400">
          <Trophy size={24} />
          <span className="text-lg font-bold">Perfect check-in!</span>
          <Trophy size={24} />
        </div>
      )}

      <h2 className="text-2xl font-bold text-white mb-6">Session Complete</h2>

      <div className="space-y-3 mb-8 w-full max-w-[240px]">
        <div className="flex justify-between items-center bg-gray-800 rounded-xl px-4 py-3">
          <span className="text-gray-400 text-sm">Habits completed</span>
          <span className="text-white font-bold">{completed}/{total}</span>
        </div>
        <div className="flex justify-between items-center bg-gray-800 rounded-xl px-4 py-3">
          <span className="text-gray-400 text-sm">XP earned</span>
          <span className="text-emerald-400 font-bold">+{xp}</span>
        </div>
        <div className="flex justify-between items-center bg-gray-800 rounded-xl px-4 py-3">
          <span className="text-gray-400 text-sm">Coins earned</span>
          <span className="text-yellow-400 font-bold">+{coins}</span>
        </div>
      </div>

      <button
        onClick={onReturn}
        className="px-8 py-3 rounded-xl bg-violet-600 text-white font-semibold active:bg-violet-700 transition-colors"
      >
        Return to City
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CheckInScreen() {
  const activeScreen = useGameStore((s) => s.activeScreen);
  const firstWeekBoostActive = useGameStore((s) => s.firstWeekBoostActive);
  const doubleXPEventActive = useGameStore((s) => s.doubleXPEventActive);
  const openScreen = useGameStore((s) => s.openScreen);
  const queueReward = useGameStore((s) => s.queueReward);

  const habits = useHabitStore((s) => s.habits);
  const habitCheckIn = useHabitStore((s) => s.checkIn);
  const getScheduledForDate = useHabitStore((s) => s.getScheduledForDate);

  const addXP = usePlayerStore((s) => s.addXP);
  const addCoins = usePlayerStore((s) => s.addCoins);
  const dontShowCheckInToday = usePlayerStore((s) => s.dontShowCheckInToday);
  const setDontShowCheckInToday = usePlayerStore((s) => s.setDontShowCheckInToday);

  const todayStr = useMemo(() => formatDateString(new Date()), []);
  const weekDates = useMemo(() => getWeekDates(new Date()), []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showHabitList, setShowHabitList] = useState(false);
  const [sessionCompletedIds, setSessionCompletedIds] = useState<Set<string>>(new Set());
  const [initialCompletedIds, setInitialCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [perfectDay, setPerfectDay] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Shared motion value for the front card (drives back-card responsive animation)
  const frontX = useMotionValue(0);
  const backScale = useTransform(frontX, (v) => 0.95 + Math.min(Math.abs(v) / 150, 1) * 0.05);
  const backOpacity = useTransform(frontX, (v) => 0.6 + Math.min(Math.abs(v) / 150, 1) * 0.4);

  // Reset shared motion value when the active card changes (before paint to avoid flash)
  useLayoutEffect(() => {
    frontX.set(0);
    setIsAnimating(false);
  }, [currentIndex, frontX]);

  // Load cards when date or habits change
  const loadCards = useCallback(
    async (date: string) => {
      setLoading(true);
      const scheduled = getScheduledForDate(date);
      const checkIns = await db.checkIns.where('date').equals(date).toArray();
      const allCheckIns = await db.checkIns.toArray();

      // Only filter out habits with completed check-ins (not skipped — skip is session-only)
      const completedIds = new Set(
        checkIns.filter((c) => c.completed).map((c) => c.habitId),
      );

      setInitialCompletedIds(completedIds);

      const pending = scheduled.filter((h) => !completedIds.has(h.id));

      // Build check-ins by habit for streak calculation
      const byHabit: Record<string, CheckIn[]> = {};
      for (const ci of allCheckIns) {
        (byHabit[ci.habitId] ??= []).push(ci);
      }

      const cardItems: CardItem[] = pending
        .map((habit) => ({
          habit,
          streak: calculateStreak(habit, byHabit[habit.id] ?? []),
          monthProgress: getMonthProgress(habit, date, allCheckIns),
        }))
        .sort((a, b) => {
          const timeDiff =
            (TIME_PRIORITY[a.habit.timeOfDay] ?? 3) - (TIME_PRIORITY[b.habit.timeOfDay] ?? 3);
          if (timeDiff !== 0) return timeDiff;
          return a.habit.sortOrder - b.habit.sortOrder;
        });

      setCards(cardItems);
      setCurrentIndex(0);
      setSessionXP(0);
      setSessionCoins(0);
      setSessionCompleted(0);
      setSessionTotal(scheduled.length);
      setSessionCompletedIds(new Set());
      setPerfectDay(false);
      setIsAnimating(false);
      frontX.set(0);

      if (cardItems.length === 0) {
        const alreadyCompleted = completedIds.size;
        setSessionCompleted(alreadyCompleted);
        setShowSummary(true);
      } else {
        setShowSummary(false);
      }

      setLoading(false);
    },
    [getScheduledForDate],
  );

  useEffect(() => {
    if (activeScreen === 'check-in') {
      loadCards(selectedDate);
    }
  }, [activeScreen, selectedDate, habits, loadCards]);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const finishSession = useCallback(
    (completedIds: Set<string>) => {
      const allCompletedIds = new Set([...initialCompletedIds, ...completedIds]);
      const scheduled = getScheduledForDate(selectedDate);
      const isPerfect =
        scheduled.length > 0 && scheduled.every((h) => allCompletedIds.has(h.id));

      if (isPerfect) {
        const perfectXP = GAME_CONFIG.bonuses.daily_perfect.xp;
        const perfectCoins = GAME_CONFIG.bonuses.daily_perfect.coins;
        addXP(perfectXP);
        addCoins(perfectCoins);
        setSessionXP((s) => s + perfectXP);
        setSessionCoins((s) => s + perfectCoins);
        setPerfectDay(true);
      }

      setShowSummary(true);
    },
    [initialCompletedIds, getScheduledForDate, selectedDate, addXP, addCoins],
  );

  const handleSwipeRight = useCallback(() => {
    const card = cards[currentIndex];
    if (!card) return;

    const surprise = rollSurpriseBonus();
    const reward = calculateCheckInReward(card.habit.difficulty, {
      surpriseBonus: surprise,
      firstWeekActive: firstWeekBoostActive,
      doubleXPActive: doubleXPEventActive,
    });

    habitCheckIn(card.habit.id, selectedDate, reward.xp, reward.coins);
    addXP(reward.xp);
    addCoins(reward.coins);

    if (surprise) {
      queueReward({
        type: 'surprise-bonus',
        payload: {
          xp: reward.breakdown.surpriseBonusXP,
          coins: reward.breakdown.surpriseBonusCoins,
          habitName: card.habit.name,
        },
      });
    }

    const newCompletedIds = new Set(sessionCompletedIds);
    newCompletedIds.add(card.habit.id);

    setSessionXP((s) => s + reward.xp);
    setSessionCoins((s) => s + reward.coins);
    setSessionCompleted((s) => s + 1);
    setSessionCompletedIds(newCompletedIds);

    // Celebration burst
    setShowCelebration(true);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= cards.length) {
      finishSession(newCompletedIds);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [
    cards,
    currentIndex,
    selectedDate,
    firstWeekBoostActive,
    doubleXPEventActive,
    habitCheckIn,
    addXP,
    addCoins,
    queueReward,
    sessionCompletedIds,
    finishSession,
  ]);

  const handleSwipeLeft = useCallback(() => {
    // Skip = dismiss from this session only, no DB record
    const nextIndex = currentIndex + 1;
    if (nextIndex >= cards.length) {
      finishSession(sessionCompletedIds);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, cards.length, sessionCompletedIds, finishSession]);

  const handleTapDone = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    animate(frontX, window.innerWidth + 200, {
      type: 'tween',
      duration: 0.25,
      ease: 'easeOut',
    }).then(handleSwipeRight);
  }, [isAnimating, frontX, handleSwipeRight]);

  const handleTapSkip = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    animate(frontX, -(window.innerWidth + 200), {
      type: 'tween',
      duration: 0.25,
      ease: 'easeOut',
    }).then(handleSwipeLeft);
  }, [isAnimating, frontX, handleSwipeLeft]);

  const handleClose = useCallback(() => {
    openScreen('city');
  }, [openScreen]);

  const handleDontShowToggle = useCallback(() => {
    if (dontShowCheckInToday === todayStr) {
      setDontShowCheckInToday(null);
    } else {
      setDontShowCheckInToday(todayStr);
    }
  }, [dontShowCheckInToday, todayStr, setDontShowCheckInToday]);

  if (activeScreen !== 'check-in') return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-gray-950 flex flex-col"
        style={{ zIndex: 250 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <h1 className="text-lg font-bold text-white">Check-In</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHabitList(true)}
              className="p-2 text-gray-400 active:text-white"
              aria-label="Manage habits"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 active:text-white"
              aria-label="Close check-in"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Date strip */}
        <DateStrip
          weekDates={weekDates}
          selectedDate={selectedDate}
          todayStr={todayStr}
          onSelect={handleDateSelect}
        />

        {/* Card area */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        ) : showSummary ? (
          <SessionSummary
            completed={sessionCompleted}
            total={sessionTotal}
            xp={sessionXP}
            coins={sessionCoins}
            perfectDay={perfectDay}
            onReturn={handleClose}
          />
        ) : (
          <div className="flex-1 flex flex-col px-4 pt-2 pb-2 min-h-0">
            {/* Counter */}
            <p className="text-xs text-gray-500 mb-2 text-center shrink-0">
              {currentIndex + 1} / {cards.length}
            </p>

            {/* Card stack — fills remaining space */}
            <div className="relative flex-1 min-h-0 touch-none">
              {/* Next card (behind, responds to front card drag) */}
              {currentIndex + 1 < cards.length && (
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-gray-800 border border-gray-700 pointer-events-none overflow-hidden"
                  style={{ scale: backScale, opacity: backOpacity }}
                >
                  {(() => {
                    const next = cards[currentIndex + 1];
                    const nextMeta = CATEGORY_META[next.habit.category];
                    const NextIcon = nextMeta.icon;
                    return (
                      <div className="h-full flex flex-col items-center justify-center px-6 select-none">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center mb-3"
                          style={{ background: nextMeta.color + '22' }}
                        >
                          <NextIcon size={28} color={nextMeta.color} />
                        </div>
                        <h3 className="text-lg font-bold text-white text-center opacity-60">
                          {next.habit.name}
                        </h3>
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {/* Active card */}
              {cards[currentIndex] && (
                <SwipeCard
                  key={cards[currentIndex].habit.id}
                  card={cards[currentIndex]}
                  x={frontX}
                  onSwipeRight={handleSwipeRight}
                  onSwipeLeft={handleSwipeLeft}
                  onExitStart={() => setIsAnimating(true)}
                  disabled={isAnimating}
                />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-3 shrink-0">
              <button
                onClick={handleTapSkip}
                disabled={isAnimating}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-600 text-gray-400 font-medium active:bg-gray-800 transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={18} />
                <span>Skip</span>
              </button>
              <button
                onClick={handleTapDone}
                disabled={isAnimating}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-medium active:bg-emerald-700 transition-colors disabled:opacity-40"
              >
                <span>Done</span>
                <Check size={18} />
              </button>
            </div>

            {/* Accumulated rewards */}
            <div className="shrink-0 h-8 flex items-center justify-center gap-4 text-sm">
              {sessionXP > 0 && (
                <div className="flex items-center gap-1">
                  <Sparkles size={14} className="text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">+{sessionXP} XP</span>
                </div>
              )}
              {sessionCoins > 0 && (
                <span className="text-yellow-400 font-semibold">+{sessionCoins} coins</span>
              )}
            </div>
          </div>
        )}

        {/* Don't show today checkbox */}
        {selectedDate === todayStr && (
          <div className="px-4 pb-4 pt-1 shrink-0">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowCheckInToday === todayStr}
                onChange={handleDontShowToggle}
                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-violet-600 focus:ring-0 focus:ring-offset-0"
              />
              Don&apos;t auto-open today
            </label>
          </div>
        )}
      </div>

      {/* Celebration burst */}
      <AnimatePresence>
        {showCelebration && (
          <CelebrationBurst onDone={() => setShowCelebration(false)} />
        )}
      </AnimatePresence>

      {/* HabitList overlay */}
      {showHabitList && <HabitList onClose={() => setShowHabitList(false)} />}
    </>
  );
}

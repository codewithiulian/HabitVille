import { GAME_CONFIG } from '@/config/game-config';
import type { HabitDifficulty, Habit } from '@/types/habit';
import type { CheckIn } from '@/types/check-in';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Reward {
  xp: number;
  coins: number;
}

export interface CheckInRewardBreakdown {
  baseXP: number;
  baseCoins: number;
  firstWeekBonusXP: number;
  doubleXPBonusXP: number;
  surpriseBonusXP: number;
  surpriseBonusCoins: number;
}

export interface CheckInRewardResult {
  xp: number;
  coins: number;
  breakdown: CheckInRewardBreakdown;
}

export interface PerfectDayResult {
  earned: boolean;
  xp: number;
  coins: number;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export function calculateBaseReward(difficulty: HabitDifficulty): Reward {
  return {
    xp: GAME_CONFIG.xp.per_task[difficulty] ?? 0,
    coins: GAME_CONFIG.coins.per_task[difficulty] ?? 0,
  };
}

export function rollSurpriseBonus(): boolean {
  return Math.random() < GAME_CONFIG.bonuses.random_surprise.chance;
}

export function calculateSurpriseBonus(baseReward: Reward): Reward {
  const m = GAME_CONFIG.bonuses.random_surprise.multiplier;
  return {
    xp: Math.round(baseReward.xp * m),
    coins: Math.round(baseReward.coins * m),
  };
}

export function isFirstWeekBoostActive(firstUseDate: string, currentDate: Date): boolean {
  if (!GAME_CONFIG.bonuses.first_week_boost.enabled) return false;
  const start = new Date(firstUseDate);
  start.setHours(0, 0, 0, 0);
  const diffMs = currentDate.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays < GAME_CONFIG.bonuses.first_week_boost.duration_days;
}

export function applyFirstWeekBoost(xp: number): number {
  return Math.round(xp * GAME_CONFIG.bonuses.first_week_boost.xp_multiplier);
}

export function rollDoubleXPEvent(): boolean {
  if (!GAME_CONFIG.bonuses.random_xp_events.enabled) return false;
  return Math.random() < GAME_CONFIG.bonuses.random_xp_events.average_per_week / 7;
}

export function applyDoubleXPEvent(xp: number): number {
  return Math.round(xp * GAME_CONFIG.bonuses.random_xp_events.xp_multiplier);
}

export function calculateCheckInReward(
  difficulty: HabitDifficulty,
  options: { surpriseBonus: boolean; firstWeekActive: boolean; doubleXPActive: boolean },
): CheckInRewardResult {
  const base = calculateBaseReward(difficulty);

  let taskXP = base.xp;
  let firstWeekBonusXP = 0;
  let doubleXPBonusXP = 0;

  if (options.firstWeekActive) {
    const boosted = applyFirstWeekBoost(taskXP);
    firstWeekBonusXP = boosted - taskXP;
    taskXP = boosted;
  }

  if (options.doubleXPActive) {
    const boosted = applyDoubleXPEvent(taskXP);
    doubleXPBonusXP = boosted - taskXP;
    taskXP = boosted;
  }

  let totalXP = taskXP;
  let totalCoins = base.coins;
  let surpriseBonusXP = 0;
  let surpriseBonusCoins = 0;

  if (options.surpriseBonus) {
    const surprise = calculateSurpriseBonus(base);
    surpriseBonusXP = surprise.xp;
    surpriseBonusCoins = surprise.coins;
    totalXP += surpriseBonusXP;
    totalCoins += surpriseBonusCoins;
  }

  return {
    xp: totalXP,
    coins: totalCoins,
    breakdown: {
      baseXP: base.xp,
      baseCoins: base.coins,
      firstWeekBonusXP,
      doubleXPBonusXP,
      surpriseBonusXP,
      surpriseBonusCoins,
    },
  };
}

export function checkDailyPerfectDay(
  date: string,
  scheduledHabits: Habit[],
  checkIns: CheckIn[],
): PerfectDayResult {
  if (scheduledHabits.length === 0) {
    return { earned: false, xp: 0, coins: 0 };
  }

  const completedSet = new Set(
    checkIns
      .filter((c) => c.date === date && c.completed)
      .map((c) => c.habitId),
  );

  const allCompleted = scheduledHabits.every((h) => completedSet.has(h.id));

  if (allCompleted) {
    return {
      earned: true,
      xp: GAME_CONFIG.bonuses.daily_perfect.xp,
      coins: GAME_CONFIG.bonuses.daily_perfect.coins,
    };
  }

  return { earned: false, xp: 0, coins: 0 };
}

import { create } from 'zustand';
import { db } from '@/db/db';
import { isScheduledForDate } from '@/lib/schedule-utils';
import type { Habit } from '@/types/habit';
import type { CheckIn } from '@/types/check-in';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface HabitState {
  habits: Habit[];
  todayCheckIns: CheckIn[];
  initialized: boolean;

  initialize: () => Promise<void>;
  createHabit: (data: Omit<Habit, 'id' | 'sortOrder' | 'archived' | 'createdAt' | 'updatedAt'>) => string;
  updateHabit: (id: string, data: Partial<Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  archiveHabit: (id: string) => void;
  checkIn: (habitId: string, date: string) => CheckIn;
  skipHabit: (habitId: string, date: string) => CheckIn;
  getScheduledForDate: (date: string) => Habit[];
  getCheckInsForDate: (date: string) => Promise<CheckIn[]>;
  getCheckInsForWeek: (weekStart: string) => Promise<CheckIn[]>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayCheckIns: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    const allHabits = await db.habits.where('archived').equals(0).toArray();
    const today = todayDateString();
    const todayChecks = await db.checkIns.where('date').equals(today).toArray();

    set({
      habits: allHabits,
      todayCheckIns: todayChecks,
      initialized: true,
    });
  },

  createHabit: (data) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const habit: Habit = {
      ...data,
      id,
      sortOrder: get().habits.length,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    set((s) => ({ habits: [...s.habits, habit] }));
    db.habits.put({ ...habit, archived: 0 as unknown as boolean }).catch(() => {});
    return id;
  },

  updateHabit: (id, data) => {
    const now = new Date().toISOString();
    set((s) => ({
      habits: s.habits.map((h) =>
        h.id === id ? { ...h, ...data, updatedAt: now } : h
      ),
    }));
    db.habits.update(id, { ...data, updatedAt: now }).catch(() => {});
  },

  archiveHabit: (id) => {
    const now = new Date().toISOString();
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
    db.habits.update(id, { archived: 1 as unknown as boolean, updatedAt: now }).catch(() => {});
  },

  checkIn: (habitId, date) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const checkIn: CheckIn = {
      id,
      habitId,
      date,
      completed: true,
      skipped: false,
      xpEarned: 0,
      coinsEarned: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (date === todayDateString()) {
      set((s) => ({ todayCheckIns: [...s.todayCheckIns, checkIn] }));
    }

    db.checkIns.put(checkIn).catch(() => {});
    return checkIn;
  },

  skipHabit: (habitId, date) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const checkIn: CheckIn = {
      id,
      habitId,
      date,
      completed: false,
      skipped: true,
      xpEarned: 0,
      coinsEarned: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (date === todayDateString()) {
      set((s) => ({ todayCheckIns: [...s.todayCheckIns, checkIn] }));
    }

    db.checkIns.put(checkIn).catch(() => {});
    return checkIn;
  },

  getScheduledForDate: (date) => {
    return get().habits.filter((h) => isScheduledForDate(h, date));
  },

  getCheckInsForDate: async (date) => {
    return db.checkIns.where('date').equals(date).toArray();
  },

  getCheckInsForWeek: async (weekStart) => {
    const start = new Date(weekStart + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().slice(0, 10);

    return db.checkIns
      .where('date')
      .between(weekStart, endStr, true, true)
      .toArray();
  },
}));

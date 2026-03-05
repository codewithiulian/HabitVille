import { create } from 'zustand';
import { db } from '@/db/db';
import type { Habit, Checkin, StreakInfo, HabitFrequency } from '@/types/habits';

function getTodayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function isScheduledDay(date: Date, frequency: HabitFrequency, customDays: number[]): boolean {
  const day = date.getDay();
  switch (frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return day >= 1 && day <= 5;
    case 'weekends':
      return day === 0 || day === 6;
    case 'custom':
      return customDays.includes(day);
  }
}

function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function calcStreak(checkinDates: Set<string>, frequency: HabitFrequency, customDays: number[]): StreakInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = dateToString(today);

  // Current streak: walk backward from today
  let current = 0;
  let cursor = today;

  // If today is scheduled but unchecked, start from yesterday
  if (isScheduledDay(today, frequency, customDays) && !checkinDates.has(todayStr)) {
    cursor = addDays(today, -1);
  }

  // Walk backward counting consecutive scheduled days with checkins
  for (let i = 0; i < 3650; i++) {
    if (isScheduledDay(cursor, frequency, customDays)) {
      if (checkinDates.has(dateToString(cursor))) {
        current++;
      } else {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }

  // Longest streak: scan all dates forward
  let longest = 0;
  if (checkinDates.size > 0) {
    const sorted = Array.from(checkinDates).sort();
    const firstDate = parseDateString(sorted[0]);
    const lastDate = parseDateString(sorted[sorted.length - 1]);

    let run = 0;
    let d = firstDate;
    while (d <= lastDate) {
      if (isScheduledDay(d, frequency, customDays)) {
        if (checkinDates.has(dateToString(d))) {
          run++;
          if (run > longest) longest = run;
        } else {
          run = 0;
        }
      }
      d = addDays(d, 1);
    }
  }

  // Current might be the longest
  if (current > longest) longest = current;

  return { current, longest };
}

interface HabitState {
  habits: Habit[];
  todayCheckins: Map<string, Checkin>;
  streaks: Map<string, StreakInfo>;

  habitListOpen: boolean;
  habitFormOpen: boolean;
  editingHabit: Habit | null;

  loadHabits: () => Promise<void>;
  addHabit: (data: Omit<Habit, 'id' | 'createdAt' | 'archivedAt' | 'sortOrder'>) => Promise<void>;
  updateHabit: (id: string, changes: Partial<Pick<Habit, 'name' | 'icon' | 'color' | 'frequency' | 'customDays'>>) => Promise<void>;
  archiveHabit: (id: string) => Promise<void>;
  toggleCheckin: (habitId: string) => Promise<void>;
  openHabitList: () => void;
  closeHabitList: () => void;
  openHabitForm: (habit?: Habit) => void;
  closeHabitForm: () => void;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayCheckins: new Map(),
  streaks: new Map(),

  habitListOpen: false,
  habitFormOpen: false,
  editingHabit: null,

  async loadHabits() {
    const allHabits = await db.habits.toArray();
    const active = allHabits
      .filter((h) => h.archivedAt === null)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const today = getTodayString();
    const todayCheckins = new Map<string, Checkin>();
    const streaks = new Map<string, StreakInfo>();

    for (const habit of active) {
      // Today's checkin via compound index
      const checkin = await db.checkins
        .where('[habitId+date]')
        .equals([habit.id, today])
        .first();
      if (checkin) todayCheckins.set(habit.id, checkin);

      // All checkins for streak calculation
      const allCheckins = await db.checkins
        .where('habitId')
        .equals(habit.id)
        .toArray();
      const dateSet = new Set(allCheckins.map((c) => c.date));
      streaks.set(habit.id, calcStreak(dateSet, habit.frequency, habit.customDays));
    }

    set({ habits: active, todayCheckins, streaks });
  },

  async addHabit(data) {
    const habit: Habit = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      archivedAt: null,
      sortOrder: get().habits.length,
    };

    set((s) => ({
      habits: [...s.habits, habit],
      streaks: new Map(s.streaks).set(habit.id, { current: 0, longest: 0 }),
    }));

    db.habits.add(habit).catch(() => {});
  },

  async updateHabit(id, changes) {
    set((s) => ({
      habits: s.habits.map((h) => (h.id === id ? { ...h, ...changes } : h)),
    }));

    db.habits.update(id, changes).catch(() => {});
  },

  async archiveHabit(id) {
    set((s) => {
      const newCheckins = new Map(s.todayCheckins);
      newCheckins.delete(id);
      const newStreaks = new Map(s.streaks);
      newStreaks.delete(id);
      return {
        habits: s.habits.filter((h) => h.id !== id),
        todayCheckins: newCheckins,
        streaks: newStreaks,
      };
    });

    db.habits.update(id, { archivedAt: new Date() }).catch(() => {});
  },

  async toggleCheckin(habitId) {
    const { todayCheckins, streaks, habits } = get();
    const today = getTodayString();
    const existing = todayCheckins.get(habitId);
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    if (existing) {
      // Uncheck
      const newCheckins = new Map(todayCheckins);
      newCheckins.delete(habitId);
      set({ todayCheckins: newCheckins });

      db.checkins.delete(existing.id).catch(() => {});
    } else {
      // Check
      const checkin: Checkin = {
        id: crypto.randomUUID(),
        habitId,
        date: today,
        completedAt: new Date(),
      };
      const newCheckins = new Map(todayCheckins);
      newCheckins.set(habitId, checkin);
      set({ todayCheckins: newCheckins });

      db.checkins.add(checkin).catch(() => {});
    }

    // Recalc streak for this habit
    const allCheckins = await db.checkins
      .where('habitId')
      .equals(habitId)
      .toArray();
    const dateSet = new Set(allCheckins.map((c) => c.date));
    const newStreaks = new Map(get().streaks);
    newStreaks.set(habitId, calcStreak(dateSet, habit.frequency, habit.customDays));
    set({ streaks: newStreaks });
  },

  openHabitList: () => set({ habitListOpen: true }),
  closeHabitList: () => set({ habitListOpen: false, habitFormOpen: false, editingHabit: null }),
  openHabitForm: (habit) => set({ habitFormOpen: true, editingHabit: habit ?? null }),
  closeHabitForm: () => set({ habitFormOpen: false, editingHabit: null }),
}));

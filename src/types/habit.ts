export type HabitCategory =
  | 'Health'
  | 'Fitness'
  | 'Learning'
  | 'Productivity'
  | 'Mindfulness'
  | 'Social'
  | 'Other';

export type HabitDifficulty = 'easy' | 'medium' | 'hard';

export type HabitTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export type HabitFrequencyType =
  | 'daily'
  | 'times_per_week'
  | 'specific_days'
  | 'weekly'
  | 'monthly';

export interface HabitFrequency {
  type: HabitFrequencyType;
  timesPerWeek?: number;       // for 'times_per_week'
  specificDays?: number[];     // 0=Mon..6=Sun, for 'specific_days'
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  category: HabitCategory;
  difficulty: HabitDifficulty;
  timeOfDay: HabitTimeOfDay;
  frequency: HabitFrequency;
  sortOrder: number;
  archived: boolean;
  startDate?: string;          // ISO string — habit active from this date
  endDate?: string;            // ISO string — habit active until this date
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}

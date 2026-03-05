export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  customDays: number[];
  createdAt: Date;
  archivedAt: Date | null;
  sortOrder: number;
}

export interface Checkin {
  id: string;
  habitId: string;
  date: string;
  completedAt: Date;
}

export interface StreakInfo {
  current: number;
  longest: number;
}

export interface CheckIn {
  id: string;
  habitId: string;
  date: string;                // YYYY-MM-DD
  completed: boolean;
  skipped: boolean;
  xpEarned: number;
  coinsEarned: number;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}

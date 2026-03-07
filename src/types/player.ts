export interface PlayerProfile {
  id: string;
  totalXP: number;
  currentCoins: number;
  totalCoins: number;
  spentCoins: number;
  level: number;
  totalPoints: number;
  population: number;
  firstUseDate: string;        // ISO string
  dontShowCheckInToday?: string | null; // ISO date string (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}

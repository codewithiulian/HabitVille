export type GameMode = 'view' | 'build' | 'check-in';

export type ActiveScreen = 'city' | 'check-in' | 'stats' | 'shop' | 'settings';

export interface PendingReward {
  type: 'level-up' | 'asset-unlock' | 'surprise-bonus' | 'weekly-bonus' | 'streak-milestone' | 'daily-perfect';
  payload: Record<string, unknown>;
}

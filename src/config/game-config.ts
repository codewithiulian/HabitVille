import rawConfig from './game-config.gen.json';

// ---------------------------------------------------------------------------
// Config Types
// ---------------------------------------------------------------------------

export interface DifficultyTier {
  id: string;
  label: string;
  description: string;
}

export interface LevelTier {
  from: number;
  to: number;
  xp_required: number;
}

export interface WeeklyConsistencyTier {
  min_percentage: number;
  max_percentage: number;
  multiplier: number;
}

export interface AssetCategoryConfig {
  id: string;
  label: string;
  total_types: number;
  color_variants_per_type?: number;
  price_range?: { min: number; max: number };
  price?: number;
  unlock_levels?: { start: number; end: number };
  unlock_level?: number;
}

export interface GameConfig {
  habits: {
    recommended_min: number;
    recommended_max: number;
    soft_warning_threshold: number;
    difficulty_tiers: DifficultyTier[];
    frequency_options: string[];
    time_of_day_options: string[];
    categories: string[];
  };
  xp: {
    per_task: Record<string, number>;
  };
  coins: {
    per_task: Record<string, number>;
  };
  levels: {
    max_unlock_level: number;
    uncapped_leveling: boolean;
    tiers: LevelTier[];
  };
  bonuses: {
    random_surprise: {
      chance: number;
      multiplier: number;
    };
    daily_perfect: {
      xp: number;
      coins: number;
    };
    weekly_consistency: {
      tiers: WeeklyConsistencyTier[];
    };
    first_week_boost: {
      enabled: boolean;
      duration_days: number;
      xp_multiplier: number;
    };
    random_xp_events: {
      enabled: boolean;
      average_per_week: number;
      xp_multiplier: number;
      applies_to: string;
    };
  };
  assets: {
    categories: AssetCategoryConfig[];
    unlock_distribution: Record<string, string>;
  };
  population: {
    people_sprite_pool: number;
    max_visible_npcs: number;
    per_housing_type: Record<string, number>;
    apartment_size_threshold: string;
  };
  city: {
    placement_mode: string;
    initial_map_size: { width: number; height: number };
    expansion: {
      unlock_level: number;
      expanded_map_size: { width: number; height: number };
    };
  };
  check_in: {
    ui_mode: string;
    card_sort_order: string;
    allow_backfill: boolean;
    backfill_max_days: number;
    target_duration_seconds: number;
  };
  analytics: Record<string, unknown>;
  streaks: {
    enabled: boolean;
    display_in_stats: boolean;
    milestone_celebrations: boolean;
    milestone_thresholds: number[];
    counts_only_scheduled_days: boolean;
  };
  celebrations: Record<string, unknown>;
  shop: {
    purchase_confirm_threshold: number;
    house_colors: string[];
  };
}

export const GAME_CONFIG = rawConfig as GameConfig;

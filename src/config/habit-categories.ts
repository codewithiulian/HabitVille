import type { HabitCategory } from '@/types/habit';
import {
  Heart,
  Dumbbell,
  BookOpen,
  Target,
  Brain,
  Users,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CategoryMeta {
  icon: LucideIcon;
  color: string;
}

export const CATEGORY_META: Record<HabitCategory, CategoryMeta> = {
  Health:       { icon: Heart,    color: '#EF4444' },
  Fitness:      { icon: Dumbbell, color: '#F97316' },
  Learning:     { icon: BookOpen, color: '#3B82F6' },
  Productivity: { icon: Target,   color: '#8B5CF6' },
  Mindfulness:  { icon: Brain,    color: '#06B6D4' },
  Social:       { icon: Users,    color: '#EC4899' },
  Other:        { icon: Star,     color: '#6B7280' },
};

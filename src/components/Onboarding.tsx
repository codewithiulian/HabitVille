'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { GAME_CONFIG } from '@/config/game-config';
import { CATEGORY_META } from '@/config/habit-categories';
import { useHabitStore } from '@/stores/habit-store';
import { useGameStore } from '@/stores/game-store';
import type { HabitCategory, HabitDifficulty, HabitFrequencyType } from '@/types/habit';
import HabitForm from './HabitForm';

interface Suggestion {
  name: string;
  category: HabitCategory;
  difficulty: HabitDifficulty;
  frequency: { type: HabitFrequencyType; timesPerWeek?: number };
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  enabled: boolean;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    name: 'Drink water',
    category: 'Health',
    difficulty: 'easy',
    frequency: { type: 'daily' },
    timeOfDay: 'morning',
    enabled: true,
  },
  {
    name: 'Read for 20 minutes',
    category: 'Learning',
    difficulty: 'medium',
    frequency: { type: 'daily' },
    timeOfDay: 'evening',
    enabled: true,
  },
  {
    name: 'Gym session',
    category: 'Fitness',
    difficulty: 'hard',
    frequency: { type: 'times_per_week', timesPerWeek: 3 },
    timeOfDay: 'afternoon',
    enabled: true,
  },
];

export default function Onboarding() {
  // All hooks MUST be before any early return
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const setShowOnboarding = useGameStore((s) => s.setShowOnboarding);
  const setTutorialStep = useGameStore((s) => s.setTutorialStep);
  const createHabit = useHabitStore((s) => s.createHabit);
  const customHabits = useHabitStore((s) => s.habits);

  const [step, setStep] = useState(0);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [fadeClass, setFadeClass] = useState('animate-fade-in');

  if (!showOnboarding) return null;

  const goNext = () => {
    setFadeClass('animate-fade-out');
    setTimeout(() => {
      setStep((s) => s + 1);
      setFadeClass('animate-fade-in');
    }, 250);
  };

  const toggleSuggestion = (index: number) => {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  const finish = () => {
    for (const s of suggestions) {
      if (s.enabled) {
        createHabit({
          name: s.name,
          category: s.category,
          difficulty: s.difficulty,
          frequency: s.frequency,
          timeOfDay: s.timeOfDay,
        });
      }
    }
    setShowOnboarding(false);
    setTutorialStep(0);
  };

  const enabledCount = suggestions.filter((s) => s.enabled).length;
  const totalCount = enabledCount + customHabits.length;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 9000, background: 'var(--bg-page)' }}
    >
      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className={`flex-1 flex flex-col items-center justify-center px-8 ${fadeClass}`}>
          <div className="text-6xl mb-6">🏘️</div>
          <h1 className="text-3xl font-bold mb-3 text-center" style={{ color: 'var(--text-primary)' }}>
            Welcome to HabitVille
          </h1>
          <p className="text-center text-base mb-10 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
            Your habits build your city. Complete daily goals to earn XP and coins, then build the city of your dreams.
          </p>
          <button
            onClick={goNext}
            className="px-8 py-3.5 rounded-xl bg-violet-600 text-white font-semibold text-base active:bg-violet-700"
          >
            Get Started
          </button>
        </div>
      )}

      {/* Step 1: Create habits */}
      {step === 1 && !showCustomForm && (
        <div className={`flex-1 flex flex-col ${fadeClass}`}>
          <div className="px-6 pt-[max(env(safe-area-inset-top),24px)] pb-4">
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Create your first habits
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              We suggest starting with {GAME_CONFIG.habits.recommended_min}-{GAME_CONFIG.habits.recommended_max} habits. You can always add more later.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 space-y-3">
            {/* Select all / Deselect all */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const allEnabled = suggestions.every((s) => s.enabled);
                  setSuggestions((prev) => prev.map((s) => ({ ...s, enabled: !allEnabled })));
                }}
                className="text-xs text-violet-400 active:text-violet-300"
              >
                {suggestions.every((s) => s.enabled) ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {/* Pre-suggested habits (toggleable) */}
            {suggestions.map((s, i) => {
              const meta = CATEGORY_META[s.category];
              const Icon = meta.icon;
              return (
                <button
                  key={`suggestion-${i}`}
                  onClick={() => toggleSuggestion(i)}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors"
                  style={{
                    background: s.enabled ? meta.color + '15' : 'var(--bg-card)',
                    border: s.enabled ? `2px solid ${meta.color}50` : '2px solid transparent',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: meta.color + '22' }}
                  >
                    <Icon size={20} color={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: meta.color + '22', color: meta.color }}
                      >
                        {s.difficulty.charAt(0).toUpperCase() + s.difficulty.slice(1)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.category}</span>
                    </div>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: s.enabled ? meta.color : 'var(--border)',
                    }}
                  >
                    {s.enabled && <Check size={14} color="white" />}
                  </div>
                </button>
              );
            })}

            {/* Custom habits already created via the form */}
            {customHabits.map((h) => {
              const meta = CATEGORY_META[h.category];
              const Icon = meta.icon;
              return (
                <div
                  key={h.id}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left"
                  style={{
                    background: meta.color + '15',
                    border: `2px solid ${meta.color}50`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: meta.color + '22' }}
                  >
                    <Icon size={20} color={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{h.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: meta.color + '22', color: meta.color }}
                      >
                        {h.difficulty.charAt(0).toUpperCase() + h.difficulty.slice(1)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{h.category}</span>
                      <span className="text-[10px] text-green-600 dark:text-green-400">Custom</span>
                    </div>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: meta.color }}
                  >
                    <Check size={14} color="white" />
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setShowCustomForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3.5 text-sm" style={{ borderColor: 'var(--border-handle)', color: 'var(--text-secondary)' }}
            >
              <Plus size={16} />
              Add custom habit
            </button>
          </div>

          <div className="px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 flex flex-col items-center gap-2">
            {totalCount > 0 && (
              <button
                onClick={finish}
                className="w-full py-3.5 rounded-xl bg-violet-600 text-white font-semibold text-base active:bg-violet-700"
              >
                Start Building! ({totalCount} habit{totalCount !== 1 ? 's' : ''})
              </button>
            )}
            <button
              onClick={finish}
              className="text-sm py-1" style={{ color: 'var(--text-muted)' }}
            >
              {totalCount > 0 ? 'Skip suggestions' : 'Skip for now'}
            </button>
          </div>
        </div>
      )}

      {/* Custom form overlay during onboarding */}
      {step === 1 && showCustomForm && (
        <HabitForm
          mode="onboarding"
          onClose={() => setShowCustomForm(false)}
          onSaved={() => setShowCustomForm(false)}
        />
      )}
    </div>
  );
}

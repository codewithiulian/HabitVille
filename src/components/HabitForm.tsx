'use client';

import { useState } from 'react';
import { ChevronLeft, Flame } from 'lucide-react';
import { GAME_CONFIG } from '@/config/game-config';
import { CATEGORY_META } from '@/config/habit-categories';
import { useHabitStore } from '@/stores/habit-store';
import { useBuildStore } from '@/stores/build-store';
import type { Habit, HabitCategory, HabitDifficulty, HabitFrequencyType, HabitTimeOfDay } from '@/types/habit';

type FormMode = 'create' | 'edit' | 'onboarding';

interface HabitFormProps {
  mode: FormMode;
  habit?: Habit;
  onClose: () => void;
  onSaved?: () => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_OPTIONS: { value: HabitTimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'anytime', label: 'Anytime' },
];

const categories = GAME_CONFIG.habits.categories as HabitCategory[];
const difficulties = GAME_CONFIG.habits.difficulty_tiers;

export default function HabitForm({ mode, habit, onClose, onSaved }: HabitFormProps) {
  const createHabit = useHabitStore((s) => s.createHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const archiveHabit = useHabitStore((s) => s.archiveHabit);

  const [name, setName] = useState(habit?.name ?? '');
  const [category, setCategory] = useState<HabitCategory>(habit?.category ?? 'Health');
  const [difficulty, setDifficulty] = useState<HabitDifficulty>(habit?.difficulty ?? 'easy');
  const [freqType, setFreqType] = useState<HabitFrequencyType>(habit?.frequency.type ?? 'daily');
  const [timesPerWeek, setTimesPerWeek] = useState(habit?.frequency.timesPerWeek ?? 3);
  const [specificDays, setSpecificDays] = useState<number[]>(habit?.frequency.specificDays ?? []);
  const [timeOfDay, setTimeOfDay] = useState<HabitTimeOfDay>(habit?.timeOfDay ?? 'anytime');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [showDates, setShowDates] = useState(!!(habit?.startDate || habit?.endDate));
  const [startDate, setStartDate] = useState(habit?.startDate?.slice(0, 10) ?? todayStr);
  const [endDate, setEndDate] = useState(habit?.endDate?.slice(0, 10) ?? '');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const data = {
      name: trimmed,
      category,
      difficulty,
      frequency: {
        type: freqType,
        ...(freqType === 'times_per_week' && { timesPerWeek }),
        ...(freqType === 'specific_days' && { specificDays }),
      },
      timeOfDay,
      startDate: showDates && startDate ? startDate : undefined,
      endDate: showDates && endDate ? endDate : undefined,
    };

    if (mode === 'edit' && habit) {
      updateHabit(habit.id, data);
      useBuildStore.getState().showToast('Habit updated');
    } else {
      createHabit(data);
      if (mode !== 'onboarding') {
        useBuildStore.getState().showToast('Habit created');
      }
    }

    onSaved?.();
    onClose();
  };

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const handleArchive = () => {
    if (habit) {
      archiveHabit(habit.id);
      useBuildStore.getState().showToast('Habit archived');
      onClose();
    }
  };

  const toggleDay = (day: number) => {
    setSpecificDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const freqLabel = (type: HabitFrequencyType) => {
    switch (type) {
      case 'daily': return 'Daily';
      case 'times_per_week': return 'X/week';
      case 'specific_days': return 'Specific days';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
    }
  };

  const selectedColor = CATEGORY_META[category].color;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 310, background: 'rgba(245, 245, 250, 0.97)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <button onClick={onClose} className="p-1 -ml-1" style={{ color: 'rgba(0,0,0,0.35)' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>
          {mode === 'edit' ? 'Edit Habit' : mode === 'onboarding' ? 'New Habit' : 'Create Habit'}
        </h2>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm mb-1.5" style={{ color: '#666' }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Go to the gym"
            className="w-full rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-violet-500"
            style={{ background: 'rgba(255,255,255,0.6)', color: '#1a1a1a', border: '1px solid rgba(0,0,0,0.08)' }}
            autoFocus={mode !== 'edit'}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm mb-1.5" style={{ color: '#666' }}>Category</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const selected = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 transition-colors"
                  style={{
                    background: selected ? meta.color + '22' : 'rgba(255,255,255,0.6)',
                    border: selected ? `2px solid ${meta.color}` : '2px solid transparent',
                  }}
                >
                  <Icon size={20} color={selected ? meta.color : 'rgba(0,0,0,0.45)'} />
                  <span className="text-xs" style={{ color: selected ? meta.color : 'rgba(0,0,0,0.45)' }}>
                    {cat}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm mb-1.5" style={{ color: '#666' }}>Frequency</label>
          <div className="flex flex-wrap gap-2">
            {(GAME_CONFIG.habits.frequency_options as HabitFrequencyType[]).map((ft) => (
              <button
                key={ft}
                onClick={() => setFreqType(ft)}
                className="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
                style={{
                  background: freqType === ft ? selectedColor + '22' : 'rgba(255,255,255,0.6)',
                  color: freqType === ft ? selectedColor : 'rgba(0,0,0,0.45)',
                  border: freqType === ft ? `1.5px solid ${selectedColor}` : '1.5px solid transparent',
                }}
              >
                {freqLabel(ft)}
              </button>
            ))}
          </div>

          {/* Times per week stepper */}
          {freqType === 'times_per_week' && (
            <div className="flex items-center gap-4 mt-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <span className="text-sm" style={{ color: '#1a1a1a' }}>Times per week</span>
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={() => setTimesPerWeek(Math.max(1, timesPerWeek - 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(0,0,0,0.06)', color: '#1a1a1a' }}
                >
                  -
                </button>
                <span className="font-semibold w-4 text-center" style={{ color: '#1a1a1a' }}>{timesPerWeek}</span>
                <button
                  onClick={() => setTimesPerWeek(Math.min(7, timesPerWeek + 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(0,0,0,0.06)', color: '#1a1a1a' }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Specific days checkboxes */}
          {freqType === 'specific_days' && (
            <div className="flex gap-1.5 mt-3">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  onClick={() => toggleDay(i)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: specificDays.includes(i) ? selectedColor + '22' : 'rgba(255,255,255,0.6)',
                    color: specificDays.includes(i) ? selectedColor : 'rgba(0,0,0,0.45)',
                    border: specificDays.includes(i) ? `1.5px solid ${selectedColor}` : '1.5px solid transparent',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm mb-1.5" style={{ color: '#666' }}>Difficulty</label>
          <div className="space-y-2">
            {difficulties.map((tier) => {
              const selected = difficulty === tier.id;
              const xp = GAME_CONFIG.xp.per_task[tier.id] ?? 0;
              const coins = GAME_CONFIG.coins.per_task[tier.id] ?? 0;
              return (
                <button
                  key={tier.id}
                  onClick={() => setDifficulty(tier.id as HabitDifficulty)}
                  className="w-full text-left rounded-xl px-4 py-3 transition-colors"
                  style={{
                    background: selected ? selectedColor + '15' : 'rgba(255,255,255,0.6)',
                    border: selected ? `2px solid ${selectedColor}` : '2px solid transparent',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold" style={{ color: '#1a1a1a' }}>{tier.label}</span>
                    <span className="text-xs" style={{ color: '#666' }}>
                      +{xp} XP &middot; +{coins} coins
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#666' }}>{tier.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time of Day */}
        <div>
          <label className="block text-sm mb-1.5" style={{ color: '#666' }}>Time of Day</label>
          <div className="flex gap-2">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeOfDay(opt.value)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: timeOfDay === opt.value ? selectedColor + '22' : 'rgba(255,255,255,0.6)',
                  color: timeOfDay === opt.value ? selectedColor : 'rgba(0,0,0,0.45)',
                  border: timeOfDay === opt.value ? `1.5px solid ${selectedColor}` : '1.5px solid transparent',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start/End Dates */}
        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#666' }}>
            <input
              type="checkbox"
              checked={showDates}
              onChange={(e) => setShowDates(e.target.checked)}
              className="accent-violet-500"
            />
            Set start/end date
          </label>
          {showDates && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <span className="text-xs" style={{ color: 'rgba(0,0,0,0.35)' }}>Start</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none mt-1"
                  style={{ background: 'rgba(255,255,255,0.6)', color: '#1a1a1a', border: '1px solid rgba(0,0,0,0.08)' }}
                />
              </div>
              <div>
                <span className="text-xs" style={{ color: 'rgba(0,0,0,0.35)' }}>End (optional)</span>
                <div className="relative mt-1">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.6)', color: '#1a1a1a', border: '1px solid rgba(0,0,0,0.08)' }}
                  />
                  {endDate && (
                    <button
                      type="button"
                      onClick={() => setEndDate('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-lg leading-none"
                      style={{ color: 'rgba(0,0,0,0.35)' }}
                      aria-label="Clear end date"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Archive (edit mode only) */}
        {mode === 'edit' && (
          <button
            onClick={() => setShowArchiveConfirm(true)}
            className="text-sm text-red-600 underline underline-offset-2"
          >
            Archive this habit
          </button>
        )}
      </div>

      {/* Save button */}
      <div className="px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-3.5 rounded-xl text-base font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: selectedColor }}
        >
          {mode === 'onboarding' ? 'Add Habit' : 'Save'}
        </button>
      </div>

      {/* Archive confirmation modal */}
      {showArchiveConfirm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center px-8"
          style={{ zIndex: 320 }}
          onClick={() => setShowArchiveConfirm(false)}
        >
          <div
            className="rounded-2xl p-5 w-full max-w-xs"
            style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-base mb-2" style={{ color: '#1a1a1a' }}>Archive habit?</h3>
            <p className="text-sm mb-4" style={{ color: '#666' }}>
              <strong style={{ color: '#1a1a1a' }}>{habit?.name}</strong> won&apos;t appear in check-ins anymore. Historical data is kept.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: '#666' }}
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm text-white font-medium active:bg-red-700"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

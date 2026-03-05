'use client';

import { useState, useEffect, useRef } from 'react';
import { useHabitStore } from '@/stores/habit-store';
import type { HabitFrequency } from '@/types/habits';

const PRESET_ICONS = [
  '\u{1F4AA}', '\u{1F3C3}', '\u{1F4D6}', '\u{1F9D8}', '\u{1F4A7}', '\u{1F34E}',
  '\u{1F6CC}', '\u{270D}\uFE0F', '\u{1F3B5}', '\u{1F9F9}', '\u{1F4B0}', '\u{1F331}',
  '\u{2615}', '\u{1F6B6}', '\u{1F3CB}\uFE0F', '\u{1F9E0}', '\u{1F4DD}', '\u{1F525}',
  '\u{2764}\uFE0F', '\u{1F60A}', '\u{1F30E}', '\u{1F3AF}', '\u{23F0}', '\u{2B50}',
];

const COLOR_SWATCHES = [
  '#7C3AED', '#DC2626', '#2563EB', '#059669',
  '#D97706', '#EC4899', '#0891B2', '#4B5563',
];

const FREQUENCY_OPTIONS: { value: HabitFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'custom', label: 'Custom' },
];

// Monday-first: index into JS getDay() values (1=Mon..0=Sun)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function HabitForm() {
  const habitFormOpen = useHabitStore((s) => s.habitFormOpen);
  const editingHabit = useHabitStore((s) => s.editingHabit);
  const addHabit = useHabitStore((s) => s.addHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const archiveHabit = useHabitStore((s) => s.archiveHabit);
  const closeHabitForm = useHabitStore((s) => s.closeHabitForm);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(PRESET_ICONS[0]);
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (habitFormOpen) {
      if (editingHabit) {
        setName(editingHabit.name);
        setIcon(editingHabit.icon);
        setColor(editingHabit.color);
        setFrequency(editingHabit.frequency);
        setCustomDays(editingHabit.customDays);
      } else {
        setName('');
        setIcon(PRESET_ICONS[0]);
        setColor(COLOR_SWATCHES[0]);
        setFrequency('daily');
        setCustomDays([]);
      }
      setConfirmArchive(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [habitFormOpen, editingHabit]);

  if (!habitFormOpen) return null;

  const isEdit = !!editingHabit;
  const canSave = name.trim().length > 0 && (frequency !== 'custom' || customDays.length > 0);

  const handleSave = () => {
    if (!canSave) return;
    const data = { name: name.trim(), icon, color, frequency, customDays: frequency === 'custom' ? customDays : [] };
    if (isEdit) {
      updateHabit(editingHabit.id, data);
    } else {
      addHabit(data);
    }
    closeHabitForm();
  };

  const handleArchive = () => {
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    if (editingHabit) {
      archiveHabit(editingHabit.id);
      closeHabitForm();
    }
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  return (
    <div className="fixed inset-0" style={{ zIndex: 310 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={closeHabitForm} />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white px-5 pb-8 pt-3"
        style={{ maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Grab bar */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />

        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {isEdit ? 'Edit Habit' : 'New Habit'}
        </h2>

        {/* Name */}
        <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 50))}
          placeholder="e.g. Morning run"
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
        />

        {/* Icon */}
        <label className="mb-1 block text-xs font-medium text-gray-500">Icon</label>
        <div className="mb-4 grid grid-cols-6 gap-2">
          {PRESET_ICONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setIcon(emoji)}
              className={`flex h-10 w-full items-center justify-center rounded-lg text-xl ${
                icon === emoji ? 'border-2 border-purple-500 bg-purple-50' : 'border border-gray-100'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Color */}
        <label className="mb-1 block text-xs font-medium text-gray-500">Color</label>
        <div className="mb-4 flex gap-2">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="flex h-11 w-11 items-center justify-center"
            >
              <div
                className={`h-8 w-8 rounded-full ${
                  color === c ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties}
              />
            </button>
          ))}
        </div>

        {/* Frequency */}
        <label className="mb-1 block text-xs font-medium text-gray-500">Frequency</label>
        <div className="mb-4 flex gap-2">
          {FREQUENCY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFrequency(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                frequency === opt.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom day picker */}
        {frequency === 'custom' && (
          <div className="mb-4 flex justify-between gap-1">
            {DAY_ORDER.map((dayNum, i) => (
              <button
                key={dayNum}
                onClick={() => toggleCustomDay(dayNum)}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  customDays.includes(dayNum)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {DAY_LABELS[i]}
              </button>
            ))}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="mb-2 w-full rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {isEdit ? 'Save Changes' : 'Create Habit'}
        </button>

        {/* Cancel */}
        <button
          onClick={closeHabitForm}
          className="mb-2 w-full py-2 text-sm text-gray-500"
        >
          Cancel
        </button>

        {/* Archive (edit mode) */}
        {isEdit && (
          <button
            onClick={handleArchive}
            className="w-full py-2 text-sm font-medium text-red-500"
          >
            {confirmArchive ? 'Tap again to confirm archive' : 'Archive Habit'}
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

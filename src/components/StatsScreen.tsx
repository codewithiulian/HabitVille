'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';
import MonthlyStats from './MonthlyStats';
import AllTimeStats from './AllTimeStats';

type StatsTab = 'monthly' | 'all-time';

const TABS: { key: StatsTab; label: string }[] = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'all-time', label: 'All Time' },
];

export default function StatsScreen() {
  const activeScreen = useGameStore((s) => s.activeScreen);
  const [tab, setTab] = useState<StatsTab>('monthly');

  if (activeScreen !== 'stats') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        background: 'rgba(245, 245, 250, 0.97)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'max(env(safe-area-inset-top), 12px) 16px 10px',
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Stats</h1>
        <button
          onClick={() => useGameStore.getState().openScreen('city')}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label="Close"
        >
          <X size={20} color="rgba(0, 0, 0, 0.35)" />
        </button>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '0 16px 12px',
          background: 'transparent',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              background: tab === t.key ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
              color: tab === t.key ? '#1a1a1a' : 'rgba(0, 0, 0, 0.35)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'monthly' ? <MonthlyStats /> : <AllTimeStats />}
      </div>
    </div>
  );
}

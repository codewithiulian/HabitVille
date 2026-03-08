'use client';

import { useState, useEffect } from 'react';
import { Flame, Trophy, Zap, Coins, Building2 } from 'lucide-react';
import { db } from '@/db/db';
import { usePlayerStore } from '@/stores/player-store';
import { useInventoryStore } from '@/stores/inventory-store';
import { getXPProgressInCurrentLevel } from '@/lib/leveling-engine';
import { calculateLongestStreak } from '@/lib/streak-engine';
import { getCatalogAsset } from '@/lib/catalog-helpers';
import type { Habit } from '@/types/habit';
import type { CheckIn } from '@/types/check-in';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AllTimeData {
  totalCoins: number;
  spentCoins: number;
  longestStreaks: { name: string; streak: number }[];
  totalCompleted: number;
  cityValue: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AllTimeStats() {
  const xp = usePlayerStore((s) => s.xp);
  const coins = usePlayerStore((s) => s.coins);
  const level = usePlayerStore((s) => s.level);
  const totalPoints = usePlayerStore((s) => s.totalPoints);
  const placedAssets = useInventoryStore((s) => s.placedAssets);

  const [data, setData] = useState<AllTimeData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Load player profile for totalCoins/spentCoins
      const profiles = await db.playerProfile.toArray();
      const profile = profiles[0];

      // Load all habits (including archived) and all check-ins
      const allHabits = await db.habits.toArray() as (Habit & { archived: number | boolean })[];
      const allCheckIns = await db.checkIns.toArray();

      if (cancelled) return;

      // Calculate longest streak per habit
      const activeHabits = allHabits.filter((h) => !h.archived);
      const longestStreaks: { name: string; streak: number }[] = [];
      for (const habit of activeHabits) {
        const longest = calculateLongestStreak(habit.id, allCheckIns, habit);
        if (longest > 0) {
          longestStreaks.push({ name: habit.name, streak: longest });
        }
      }
      longestStreaks.sort((a, b) => b.streak - a.streak);

      // Total completed check-ins
      const totalCompleted = allCheckIns.filter((c: CheckIn) => c.completed).length;

      // City value
      let cityValue = 0;
      for (const placed of placedAssets) {
        const asset = getCatalogAsset(placed.assetId);
        if (asset) cityValue += asset.price;
      }

      setData({
        totalCoins: profile?.totalCoins ?? 0,
        spentCoins: profile?.spentCoins ?? 0,
        longestStreaks,
        totalCompleted,
        cityValue,
      });
    }
    load();
    return () => { cancelled = true; };
  }, [placedAssets]);

  const progress = getXPProgressInCurrentLevel(xp);

  if (!data) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Level + XP bar */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--level-section), rgba(91,33,182,0.08))',
          border: '1px solid rgba(124,58,237,0.15)',
          borderRadius: 14,
          padding: '20px 16px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--level-from), var(--level-to))',
            border: '2px solid rgba(124,58,237,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1 }}>LVL</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'white', lineHeight: 1.1 }}>{level}</span>
        </div>

        {/* XP bar */}
        <div style={{ width: '100%', maxWidth: 280, margin: '0 auto' }}>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: 'var(--bg-track)',
              overflow: 'hidden',
              marginBottom: 6,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress.percentage}%`,
                borderRadius: 4,
                background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {progress.current.toLocaleString()} / {progress.required.toLocaleString()} XP to Level {level + 1}
          </div>
        </div>
      </section>

      {/* Total Lifetime Points */}
      <StatCard
        icon={<Trophy size={20} color="#f59e0b" />}
        label="Total Lifetime Points"
        value={totalPoints.toLocaleString()}
        color="#f59e0b"
      />

      {/* Coins */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
        }}
      >
        <MiniCard label="Earned" value={data.totalCoins.toLocaleString()} color="#10B981" />
        <MiniCard label="Spent" value={data.spentCoins.toLocaleString()} color="#EF4444" />
        <MiniCard label="Balance" value={coins.toLocaleString()} color="#facc15" />
      </section>

      {/* Longest streaks */}
      {data.longestStreaks.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Flame size={18} color="#f97316" />
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-label)', margin: 0 }}>
              Longest Streaks
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.longestStreaks.map((s) => (
              <div
                key={s.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-subtle)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.name}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f97316' }}>
                  {s.streak} days
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Total habits completed */}
      <StatCard
        icon={<Zap size={20} color="#3b82f6" />}
        label="Total Habits Completed"
        value={data.totalCompleted.toLocaleString()}
        color="#3b82f6"
      />

      {/* City value */}
      <StatCard
        icon={<Building2 size={20} color="#8b5cf6" />}
        label="City Value"
        value={`${data.cityValue.toLocaleString()} Coins`}
        color="#8b5cf6"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-subtle)',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {icon}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-subtle)',
        borderRadius: 10,
        padding: '10px 8px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

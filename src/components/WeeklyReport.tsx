'use client';

import { useCallback } from 'react';
import { X, TrendingUp, Zap, Coins } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';
import CircularProgress from './CircularProgress';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

// ---------------------------------------------------------------------------
// WeeklyReport
// ---------------------------------------------------------------------------

export default function WeeklyReport() {
  const activeScreen = useGameStore((s) => s.activeScreen);
  const snapshot = useGameStore((s) => s.weeklyReportSnapshot);

  const handleDismiss = useCallback(() => {
    const store = useGameStore.getState();
    // Queue the weekly bonus reward animation
    if (snapshot && (snapshot.bonusXPEarned > 0 || snapshot.bonusCoinEarned > 0)) {
      store.queueReward({
        type: 'weekly-bonus',
        payload: {
          xp: snapshot.bonusXPEarned,
          coins: snapshot.bonusCoinEarned,
          percentage: snapshot.completionPercentage,
        },
      });
    }
    store.setWeeklyReportSnapshot(null);
    store.openScreen('city');
  }, [snapshot]);

  if (activeScreen !== 'weekly-report' || !snapshot) return null;

  const sortedHabits = [...snapshot.perHabitBreakdown].sort((a, b) => {
    const rateA = a.scheduled > 0 ? a.completed / a.scheduled : 0;
    const rateB = b.scheduled > 0 ? b.completed / b.scheduled : 0;
    return rateB - rateA;
  });

  const totalXP = snapshot.baseXPEarned + snapshot.bonusXPEarned;
  const totalCoins = snapshot.baseCoinEarned + snapshot.bonusCoinEarned;

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
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            Weekly City Report
          </h1>
          <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.35)' }}>
            {formatDateRange(snapshot.weekStart)}
          </span>
        </div>
        <button
          onClick={handleDismiss}
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

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px max(env(safe-area-inset-bottom), 16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Completion ring */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <CircularProgress percentage={snapshot.completionPercentage} size={160} strokeWidth={12} />
        </div>

        {/* Summary line */}
        <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>
          {snapshot.totalCompleted} of {snapshot.totalScheduled} habits completed
        </div>

        {/* Per-habit breakdown */}
        {sortedHabits.length > 0 && (
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,0.55)', margin: '0 0 12px' }}>
              Habit Breakdown
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedHabits.map((h) => {
                const rate = h.scheduled > 0 ? Math.round((h.completed / h.scheduled) * 100) : 0;
                return (
                  <div key={h.habitId}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: '#1a1a1a' }}>{h.habitName}</span>
                      <span style={{ color: 'rgba(0,0,0,0.45)' }}>
                        {h.completed}/{h.scheduled} ({rate}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: 'rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${rate}%`,
                          borderRadius: 3,
                          background:
                            rate >= 80 ? '#10B981' : rate >= 60 ? '#F59E0B' : '#EF4444',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* XP Earned */}
        <section
          style={{
            background: 'rgba(0,0,0,0.03)',
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Zap size={18} color="#3b82f6" />
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
              XP Earned
            </h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>
            <span>Base tasks</span>
            <span>+{snapshot.baseXPEarned.toLocaleString()} XP</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>
            <span>Weekly bonus ({snapshot.consistencyTier})</span>
            <span>+{snapshot.bonusXPEarned.toLocaleString()} XP</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>
            <span>Total</span>
            <span>+{totalXP.toLocaleString()} XP</span>
          </div>
        </section>

        {/* Coins Earned */}
        <section
          style={{
            background: 'rgba(0,0,0,0.03)',
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Coins size={18} color="#ca8a04" />
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
              Coins Earned
            </h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>
            <span>Base tasks</span>
            <span>+{snapshot.baseCoinEarned.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>
            <span>Weekly bonus ({snapshot.consistencyTier})</span>
            <span>+{snapshot.bonusCoinEarned.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#ca8a04' }}>
            <span>Total</span>
            <span>+{totalCoins.toLocaleString()}</span>
          </div>
        </section>

        {/* Weekly Bonus Reveal */}
        <section
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(59,130,246,0.08))',
            border: '1px solid rgba(124,58,237,0.15)',
            borderRadius: 14,
            padding: '20px 16px',
            textAlign: 'center',
          }}
        >
          <TrendingUp size={28} color="#8b5cf6" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>
            Consistency Bonus
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#8b5cf6', lineHeight: 1.1 }}>
            {snapshot.consistencyTier} Bonus!
          </div>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginTop: 8 }}>
            +{snapshot.bonusXPEarned.toLocaleString()} XP &middot; +{snapshot.bonusCoinEarned.toLocaleString()} Coins
          </div>
        </section>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: 'white',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Back to City
        </button>
      </div>
    </div>
  );
}

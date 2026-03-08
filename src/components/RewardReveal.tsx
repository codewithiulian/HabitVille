'use client';

import { useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import type { PendingReward } from '@/types/game';
import type { CatalogAsset } from '@/types/catalog';

function LevelUpContent({ payload }: { payload: PendingReward['payload'] }) {
  const level = payload.level as number;
  const unlockedAssets = (payload.unlockedAssets as CatalogAsset[]) ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div className="reward-scale-in" style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
        LEVEL UP!
      </div>
      <div
        className="reward-scale-in"
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: 'white',
          textShadow: '0 0 40px rgba(124, 58, 237, 0.8)',
          lineHeight: 1,
        }}
      >
        {level}
      </div>
      {unlockedAssets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            New assets unlocked!
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 260 }}>
            {unlockedAssets.slice(0, 6).map((a) => (
              <div
                key={a.assetId}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                }}
              >
                <img
                  src={`/${a.spriteKey}`}
                  alt={a.name}
                  style={{ maxWidth: 44, maxHeight: 44, objectFit: 'contain' }}
                />
              </div>
            ))}
            {unlockedAssets.length > 6 && (
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
              }}>
                +{unlockedAssets.length - 6}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SurpriseBonusContent({ payload }: { payload: PendingReward['payload'] }) {
  const xp = payload.xp as number | undefined;
  const coins = payload.coins as number | undefined;

  return (
    <div className="reward-scale-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
        SURPRISE BONUS!
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {xp && (
          <div style={{ fontSize: 28, fontWeight: 700, color: '#A78BFA' }}>
            +{xp} XP
          </div>
        )}
        {coins && (
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FCD34D', display: 'flex', alignItems: 'center', gap: 4 }}>
            +{coins} <img src="/assets/coin/coin.svg" alt="coin" style={{ width: 28, height: 28 }} />
          </div>
        )}
      </div>
    </div>
  );
}

function WeeklyBonusContent({ payload }: { payload: PendingReward['payload'] }) {
  const xp = payload.xp as number | undefined;
  const coins = payload.coins as number | undefined;
  const percentage = payload.percentage as number | undefined;

  return (
    <div className="reward-scale-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
        WEEKLY BONUS
      </div>
      {percentage !== undefined && (
        <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
          {percentage}% consistency
        </div>
      )}
      <div style={{ display: 'flex', gap: 16 }}>
        {xp && <div style={{ fontSize: 28, fontWeight: 700, color: '#A78BFA' }}>+{xp} XP</div>}
        {coins && <div style={{ fontSize: 28, fontWeight: 700, color: '#FCD34D', display: 'flex', alignItems: 'center', gap: 4 }}>+{coins} <img src="/assets/coin/coin.svg" alt="coin" style={{ width: 28, height: 28 }} /></div>}
      </div>
    </div>
  );
}

function StreakMilestoneContent({ payload }: { payload: PendingReward['payload'] }) {
  const streak = payload.streak as number;
  const habitName = payload.habitName as string | undefined;

  return (
    <div className="reward-scale-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
        STREAK MILESTONE!
      </div>
      <div style={{ fontSize: 48, fontWeight: 800, color: '#FCD34D', lineHeight: 1 }}>
        {streak}
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
        {habitName ? `${habitName} - ` : ''}days in a row
      </div>
    </div>
  );
}

function DailyPerfectContent({ payload }: { payload: PendingReward['payload'] }) {
  const xp = payload.xp as number | undefined;
  const coins = payload.coins as number | undefined;

  return (
    <div className="reward-scale-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 48, lineHeight: 1 }}>🏆</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
        PERFECT DAY!
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {xp && (
          <div style={{ fontSize: 28, fontWeight: 700, color: '#A78BFA' }}>
            +{xp} XP
          </div>
        )}
        {coins && (
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FCD34D', display: 'flex', alignItems: 'center', gap: 4 }}>
            +{coins} <img src="/assets/coin/coin.svg" alt="coin" style={{ width: 28, height: 28 }} />
          </div>
        )}
      </div>
    </div>
  );
}

function AssetUnlockContent({ payload }: { payload: PendingReward['payload'] }) {
  const asset = payload.asset as CatalogAsset | undefined;

  return (
    <div className="reward-scale-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
        NEW ASSET UNLOCKED!
      </div>
      {asset && (
        <>
          <div style={{
            width: 100,
            height: 100,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
          }}>
            <img
              src={`/${asset.spriteKey}`}
              alt={asset.name}
              style={{ maxWidth: 84, maxHeight: 84, objectFit: 'contain' }}
            />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>
            {asset.name}
          </div>
        </>
      )}
    </div>
  );
}

function RewardContent({ reward }: { reward: PendingReward }) {
  switch (reward.type) {
    case 'level-up':
      return <LevelUpContent payload={reward.payload} />;
    case 'surprise-bonus':
      return <SurpriseBonusContent payload={reward.payload} />;
    case 'weekly-bonus':
      return <WeeklyBonusContent payload={reward.payload} />;
    case 'streak-milestone':
      return <StreakMilestoneContent payload={reward.payload} />;
    case 'daily-perfect':
      return <DailyPerfectContent payload={reward.payload} />;
    case 'asset-unlock':
      return <AssetUnlockContent payload={reward.payload} />;
    default:
      return null;
  }
}

export default function RewardReveal() {
  const pendingRewards = useGameStore((s) => s.pendingRewards);

  const handleDismiss = useCallback(() => {
    useGameStore.getState().dequeueReward();
  }, []);

  if (pendingRewards.length === 0) return null;

  const current = pendingRewards[0];

  return (
    <div
      onClick={handleDismiss}
      className="reward-backdrop-fade"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <RewardContent reward={current} />

      <div style={{
        marginTop: 32,
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.4)',
      }}>
        Tap to continue{pendingRewards.length > 1 ? ` (${pendingRewards.length - 1} more)` : ''}
      </div>

      <style>{`
        @keyframes reward-backdrop-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .reward-backdrop-fade {
          animation: reward-backdrop-fade 0.25s ease-out;
        }
        @keyframes reward-scale-in {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }
        .reward-scale-in {
          animation: reward-scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}

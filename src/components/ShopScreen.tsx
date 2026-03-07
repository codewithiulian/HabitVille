'use client';

import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';
import { useShopStore } from '@/stores/shop-store';
import { usePlayerStore } from '@/stores/player-store';
import { SHOP_CATEGORIES } from '@/config/shop-categories';
import { getCatalogAssetsByCategory } from '@/lib/catalog-helpers';
import { getXPProgressInCurrentLevel } from '@/lib/leveling-engine';
import ShopAssetCard from './ShopAssetCard';
import ShopDetailSheet from './ShopDetailSheet';

export default function ShopScreen() {
  const activeScreen = useGameStore((s) => s.activeScreen);
  const selectedCategory = useShopStore((s) => s.selectedCategory);
  const selectCategory = useShopStore((s) => s.selectCategory);
  const coins = usePlayerStore((s) => s.coins);
  const level = usePlayerStore((s) => s.level);
  const xp = usePlayerStore((s) => s.xp);

  const assets = useMemo(() => {
    const list = getCatalogAssetsByCategory(selectedCategory);
    return list.sort((a, b) => a.unlockLevel - b.unlockLevel || a.price - b.price);
  }, [selectedCategory]);

  if (activeScreen !== 'shop') return null;

  const progress = getXPProgressInCurrentLevel(xp);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        background: 'rgba(245, 245, 250, 0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
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
          gap: 12,
          padding: 'max(env(safe-area-inset-top), 12px) 16px 10px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
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
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} color="#333" />
        </button>

        <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', flex: 1 }}>Shop</span>

        {/* Coin & level display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {level}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
              &#x1FA99; {coins.toLocaleString()}
            </span>
            <div style={{
              width: 60,
              height: 3,
              borderRadius: 2,
              background: 'rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress.percentage}%`,
                borderRadius: 2,
                background: '#7C3AED',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: 0,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          background: 'rgba(255, 255, 255, 0.6)',
          flexShrink: 0,
        }}
      >
        {SHOP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => selectCategory(cat.id)}
            style={{
              flex: '0 0 auto',
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: selectedCategory === cat.id ? '2px solid #7C3AED' : '2px solid transparent',
              color: selectedCategory === cat.id ? '#6D28D9' : 'rgba(0, 0, 0, 0.45)',
              fontSize: 13,
              fontWeight: selectedCategory === cat.id ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Asset grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '12px 12px calc(12px + env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {assets.map((asset) => (
            <ShopAssetCard key={asset.assetId} asset={asset} />
          ))}
        </div>
      </div>

      {/* House detail bottom sheet */}
      <ShopDetailSheet />

      <style>{`
        @keyframes shop-new-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .shop-new-badge {
          animation: shop-new-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

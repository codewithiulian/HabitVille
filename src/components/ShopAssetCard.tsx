'use client';

import { useState, useCallback } from 'react';
import type { CatalogAsset } from '@/types/catalog';
import { usePlayerStore } from '@/stores/player-store';
import { useInventoryStore } from '@/stores/inventory-store';
import { useShopStore } from '@/stores/shop-store';
import { useBuildStore } from '@/stores/build-store';
import { useCarStore } from '@/stores/car-store';
import { isHouseAsset } from '@/lib/catalog-helpers';
import { GAME_CONFIG } from '@/config/game-config';
import { getAllRoadKeys } from '@/engine/road-system';
import { spawnSingleCar, removeCar } from '@/engine/car-system';
import PurchaseConfirmDialog from './PurchaseConfirmDialog';

interface Props {
  asset: CatalogAsset;
}

type CardState = 'locked' | 'affordable' | 'cant-afford' | 'owned-affordable' | 'owned-cant-afford';

function getCardState(asset: CatalogAsset, playerLevel: number, coins: number, ownedQty: number): CardState {
  if (asset.unlockLevel > playerLevel) return 'locked';
  if (ownedQty > 0) {
    return coins >= asset.price ? 'owned-affordable' : 'owned-cant-afford';
  }
  return coins >= asset.price ? 'affordable' : 'cant-afford';
}

export default function ShopAssetCard({ asset }: Props) {
  const playerLevel = usePlayerStore((s) => s.level);
  const coins = usePlayerStore((s) => s.coins);
  const ownedAssets = useInventoryStore((s) => s.ownedAssets);
  const newlyUnlockedIds = useShopStore((s) => s.newlyUnlockedIds);
  const carCount = useCarStore((s) => s.ownedCars.filter((c) => c.assetId === asset.assetId).length);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSellOption, setShowSellOption] = useState(false);

  const isVehicle = asset.category === 'vehicles';
  const ownedItem = ownedAssets.find((a) => a.assetId === asset.assetId);
  const totalOwned = isVehicle ? carCount : (ownedItem ? ownedItem.totalPurchased : 0);

  const state = getCardState(asset, playerLevel, coins, totalOwned);
  const isNew = newlyUnlockedIds.has(asset.assetId);
  const isHouse = isHouseAsset(asset);

  const executeVehiclePurchase = useCallback(() => {
    const success = usePlayerStore.getState().spendCoins(asset.price);
    if (!success) {
      useBuildStore.getState().showToast('Not enough coins!');
      return;
    }

    if (getAllRoadKeys().length === 0) {
      usePlayerStore.getState().addCoins(asset.price);
      useBuildStore.getState().showToast('Build some roads first!');
      return;
    }

    const recordId = useCarStore.getState().purchaseCar(asset.assetId);
    spawnSingleCar(asset.assetId, recordId);
    useBuildStore.getState().showToast(`${asset.name} deployed to roads!`);
    if (isNew) {
      useShopStore.getState().markSeen(asset.assetId);
    }
  }, [asset, isNew]);

  const handleSellVehicle = useCallback(() => {
    const ownedCars = useCarStore.getState().ownedCars
      .filter((c) => c.assetId === asset.assetId);
    if (ownedCars.length === 0) return;

    // Sell the oldest one
    const oldest = ownedCars[0];
    useCarStore.getState().sellCar(oldest.id);
    removeCar(oldest.id);
    usePlayerStore.getState().addCoins(asset.price);
    useBuildStore.getState().showToast(`Sold ${asset.name} for ${asset.price} coins!`);
    setShowSellOption(false);
  }, [asset]);

  const executePurchase = useCallback(() => {
    const success = usePlayerStore.getState().spendCoins(asset.price);
    if (!success) {
      useBuildStore.getState().showToast('Not enough coins!');
      return;
    }
    useInventoryStore.getState().purchaseAsset(asset.assetId);
    useBuildStore.getState().showToast(`Purchased ${asset.name}!`);
    if (isNew) {
      useShopStore.getState().markSeen(asset.assetId);
    }
  }, [asset, isNew]);

  const handleTap = useCallback(() => {
    if (state === 'locked') {
      useBuildStore.getState().showToast(`Unlocks at Level ${asset.unlockLevel}`);
      return;
    }

    if (isNew) {
      useShopStore.getState().markSeen(asset.assetId);
    }

    if (isHouse) {
      useShopStore.getState().openDetail(asset);
      return;
    }

    // Vehicles: special purchase flow
    if (isVehicle) {
      if (totalOwned > 0) {
        // Show sell option dialog
        setShowSellOption(true);
        return;
      }
      if (state === 'cant-afford') {
        useBuildStore.getState().showToast('Not enough coins!');
        return;
      }
      executeVehiclePurchase();
      return;
    }

    if (state === 'cant-afford' || state === 'owned-cant-afford') {
      useBuildStore.getState().showToast('Not enough coins!');
      return;
    }

    if (asset.price >= GAME_CONFIG.shop.purchase_confirm_threshold) {
      setShowConfirm(true);
    } else {
      executePurchase();
    }
  }, [asset, state, isHouse, isNew, isVehicle, totalOwned, executePurchase, executeVehiclePurchase]);

  const isLocked = state === 'locked';
  const isAffordable = state === 'affordable' || state === 'owned-affordable';

  return (
    <>
      <button
        onClick={handleTap}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: '10px 4px 8px',
          borderRadius: 12,
          border: '1px solid var(--border-subtle)',
          background: isLocked ? 'var(--bg-subtle)' : 'var(--bg-card)',
          cursor: isLocked ? 'default' : 'pointer',
          position: 'relative',
          opacity: (!isLocked && !isAffordable) ? 0.6 : 1,
          minHeight: 100,
        }}
      >
        {/* NEW badge */}
        {isNew && !isLocked && (
          <span
            className="shop-new-badge"
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              fontSize: 9,
              fontWeight: 700,
              color: '#B45309',
              background: 'linear-gradient(135deg, #FDE68A, #FCD34D)',
              padding: '1px 5px',
              borderRadius: 6,
            }}
          >
            NEW
          </span>
        )}

        {/* Owned badge */}
        {totalOwned > 0 && !isLocked && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              fontSize: 9,
              fontWeight: 600,
              color: '#6D28D9',
              background: 'rgba(124, 58, 237, 0.1)',
              padding: '1px 5px',
              borderRadius: 6,
            }}
          >
            x{totalOwned}
          </span>
        )}

        {/* Sprite */}
        <div style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={`/${asset.spriteKey}`}
            alt={asset.name}
            style={{
              maxWidth: 56,
              maxHeight: 56,
              objectFit: 'contain',
              filter: isLocked ? 'grayscale(1) brightness(0.7)' : 'none',
            }}
          />
          {isLocked && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          )}
        </div>

        {/* Name */}
        <span style={{
          fontSize: 10,
          lineHeight: '12px',
          color: isLocked ? 'var(--text-muted)' : 'var(--text-label)',
          width: '100%',
          textAlign: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          padding: '0 2px',
        }}>
          {asset.name}
        </span>

        {/* Price / Level tag */}
        {isLocked ? (
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
            Lvl {asset.unlockLevel}
          </span>
        ) : (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: isAffordable ? 'var(--text-primary)' : '#DC2626',
          }}>
            <img src="/assets/coin/coin.svg" alt="coin" style={{ width: 16, height: 16, display: 'inline', verticalAlign: 'middle' }} /> {asset.price}
          </span>
        )}
      </button>

      {showConfirm && (
        <PurchaseConfirmDialog
          asset={asset}
          onConfirm={() => {
            setShowConfirm(false);
            executePurchase();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {showSellOption && (
        <div
          onClick={() => setShowSellOption(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 160,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              borderRadius: 16,
              padding: '20px 24px',
              maxWidth: 280,
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <img
              src={`/${asset.spriteKey}`}
              alt={asset.name}
              style={{ maxWidth: 64, maxHeight: 64, objectFit: 'contain' }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {asset.name}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Owned: {totalOwned}
            </span>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              {coins >= asset.price && (
                <button
                  onClick={() => {
                    setShowSellOption(false);
                    executeVehiclePurchase();
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 10,
                    border: 'none',
                    background: '#2563EB',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Buy ({asset.price})
                </button>
              )}
              <button
                onClick={handleSellVehicle}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 10,
                  border: '1px solid #DC2626',
                  background: 'transparent',
                  color: '#DC2626',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sell (+{asset.price})
              </button>
            </div>
            <button
              onClick={() => setShowSellOption(false)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

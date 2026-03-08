'use client';

import { useState, useCallback } from 'react';
import { useShopStore } from '@/stores/shop-store';
import { usePlayerStore } from '@/stores/player-store';
import { useInventoryStore } from '@/stores/inventory-store';
import { useBuildStore } from '@/stores/build-store';
import { houseSpriteKey } from '@/lib/catalog-helpers';
import { GAME_CONFIG } from '@/config/game-config';
import PurchaseConfirmDialog from './PurchaseConfirmDialog';

const COLORS = GAME_CONFIG.shop.house_colors;

export default function ShopDetailSheet() {
  const detailAsset = useShopStore((s) => s.detailAsset);
  const previewColor = useShopStore((s) => s.previewColor);
  const coins = usePlayerStore((s) => s.coins);
  const ownedAssets = useInventoryStore((s) => s.ownedAssets);
  const [showConfirm, setShowConfirm] = useState(false);

  const closeDetail = useShopStore((s) => s.closeDetail);
  const setPreviewColor = useShopStore((s) => s.setPreviewColor);

  const executePurchase = useCallback(() => {
    if (!detailAsset) return;
    const success = usePlayerStore.getState().spendCoins(detailAsset.price);
    if (!success) {
      useBuildStore.getState().showToast('Not enough coins!');
      return;
    }
    useInventoryStore.getState().purchaseAsset(detailAsset.assetId, previewColor);
    useBuildStore.getState().showToast(`Purchased ${detailAsset.name}!`);
  }, [detailAsset, previewColor]);

  if (!detailAsset) return null;

  // Extract house type name from assetId: "houses_House_Type1" -> "House_Type1"
  const houseType = detailAsset.assetId.replace('houses_', '');
  const spritePath = houseSpriteKey(houseType, previewColor);
  const affordable = coins >= detailAsset.price;
  const totalOwned = ownedAssets
    .filter((a) => a.assetId === detailAsset.assetId)
    .reduce((sum, a) => sum + a.totalPurchased, 0);

  const handleBuy = () => {
    if (!affordable) {
      useBuildStore.getState().showToast('Not enough coins!');
      return;
    }
    if (detailAsset.price >= GAME_CONFIG.shop.purchase_confirm_threshold) {
      setShowConfirm(true);
    } else {
      executePurchase();
    }
  };

  const colorMap: Record<string, string> = {
    Blue: '#3B82F6',
    Brown: '#92400E',
    Green: '#16A34A',
    Grey: '#6B7280',
    Pink: '#EC4899',
    Red: '#DC2626',
    White: '#E5E7EB',
    Yellow: '#EAB308',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeDetail}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 159,
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 160,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '16px 20px calc(20px + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36,
          height: 4,
          borderRadius: 2,
          background: 'rgba(0, 0, 0, 0.15)',
        }} />

        {/* Preview */}
        <img
          src={`/${spritePath}`}
          alt={`${previewColor} ${detailAsset.name}`}
          style={{ width: 120, height: 120, objectFit: 'contain' }}
        />

        {/* Name & owned count */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a' }}>
            {detailAsset.name}
          </div>
          {totalOwned > 0 && (
            <div style={{ fontSize: 13, color: '#6D28D9', marginTop: 2 }}>
              Owned: {totalOwned}
            </div>
          )}
        </div>

        {/* Color swatches */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setPreviewColor(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: colorMap[c] ?? '#999',
                border: previewColor === c ? '3px solid #7C3AED' : '2px solid rgba(0,0,0,0.1)',
                cursor: 'pointer',
                boxShadow: previewColor === c ? '0 0 0 2px white, 0 0 0 4px #7C3AED' : 'none',
                transition: 'box-shadow 0.15s, border 0.15s',
              }}
              aria-label={c}
            />
          ))}
        </div>

        {/* Buy button */}
        <button
          onClick={handleBuy}
          disabled={!affordable}
          style={{
            width: '100%',
            maxWidth: 280,
            padding: '14px 0',
            borderRadius: 14,
            border: 'none',
            background: affordable
              ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
              : 'rgba(0, 0, 0, 0.1)',
            color: affordable ? 'white' : 'rgba(0, 0, 0, 0.35)',
            fontSize: 16,
            fontWeight: 600,
            cursor: affordable ? 'pointer' : 'default',
          }}
        >
          &#x1FA99; {detailAsset.price}
        </button>
      </div>

      {showConfirm && (
        <PurchaseConfirmDialog
          asset={detailAsset}
          onConfirm={() => {
            setShowConfirm(false);
            executePurchase();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

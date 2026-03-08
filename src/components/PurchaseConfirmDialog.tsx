'use client';

import type { CatalogAsset } from '@/types/catalog';

interface Props {
  asset: CatalogAsset;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PurchaseConfirmDialog({ asset, onConfirm, onCancel }: Props) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-sheet)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 20,
          padding: '24px 20px',
          maxWidth: 280,
          width: '85%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          border: '1px solid var(--border)',
        }}
      >
        <img
          src={`/${asset.spriteKey}`}
          alt={asset.name}
          style={{ width: 80, height: 80, objectFit: 'contain' }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{asset.name}</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Buy for <span style={{ fontWeight: 600 }}><img src="/assets/coin/coin.svg" alt="coin" style={{ width: 16, height: 16, display: 'inline', verticalAlign: 'middle' }} /> {asset.price}</span>?
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 12,
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}

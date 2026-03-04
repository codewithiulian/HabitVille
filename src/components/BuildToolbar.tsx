'use client';

import { useMemo, useState } from 'react';
import { useBuildStore, type BuildCategory } from '@/stores/build-store';
import { getAssetsByCategory } from '@/engine/asset-registry';
import type { AssetCategory, AssetEntry } from '@/types/assets';

// ---------------------------------------------------------------------------
// Category → Asset Registry mapping
// ---------------------------------------------------------------------------
const CATEGORY_MAP: Record<BuildCategory, AssetCategory[]> = {
  roads: ['road', 'sidewalk'],
  residential: ['building-residential'],
  commercial: ['building-commercial', 'restaurant'],
  public: ['building-public'],
  decorations: ['decor', 'plant', 'fence', 'vehicle'],
};

const CATEGORY_LABELS: Record<BuildCategory, string> = {
  roads: 'Roads',
  residential: 'Homes',
  commercial: 'Shops',
  public: 'Public',
  decorations: 'Decor',
};

// Representative road tiles (one per road type instead of all 9 variants)
const ROAD_REPRESENTATIVES = new Set([
  'Road_Tile5',
  'DirtRoad_Tile5',
  'GrassRoad_Tile5',
  'Sidewalk_Tile5',
  'StonePath_Tile1',
]);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AssetThumbnail({
  asset,
  selected,
  onSelect,
}: {
  asset: AssetEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) return null;

  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        width: 60,
        minWidth: 60,
        minHeight: 44,
        padding: 4,
        border: selected ? '2px solid #7C3AED' : '2px solid transparent',
        borderRadius: 8,
        background: selected ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <img
        src={`/${asset.textureKey}`}
        alt={asset.displayName}
        loading="lazy"
        draggable={false}
        onError={() => setHasError(true)}
        style={{
          width: 52,
          height: 52,
          objectFit: 'contain',
        }}
      />
      <span
        style={{
          fontSize: 9,
          lineHeight: '11px',
          color: 'rgba(0, 0, 0, 0.55)',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
        }}
      >
        {asset.displayName}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BuildToolbar() {
  const { selectedCategory, selectedAsset, selectCategory, selectAsset, exitBuildMode } =
    useBuildStore();

  // Build asset list for the selected category
  const assets = useMemo(() => {
    if (!selectedCategory) return [];

    const categories = CATEGORY_MAP[selectedCategory];
    let list: AssetEntry[] = [];
    for (const cat of categories) {
      list = list.concat(getAssetsByCategory(cat));
    }

    // For roads, show only representative tiles
    if (selectedCategory === 'roads') {
      list = list.filter((a) => ROAD_REPRESENTATIVES.has(a.key));
    }

    return list;
  }, [selectedCategory]);

  // Look up the selected asset's display name
  const selectedAssetName = useMemo(() => {
    if (!selectedAsset || !assets.length) return null;
    const found = assets.find((a) => a.key === selectedAsset);
    return found?.displayName ?? null;
  }, [selectedAsset, assets]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        maxHeight: '20vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Selected asset label */}
      {selectedAssetName && (
        <div
          style={{
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: '#6D28D9',
            textAlign: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          {selectedAssetName}
        </div>
      )}

      {/* Asset grid (scrollable row) */}
      {selectedCategory && assets.length > 0 && (
        <div
          className="hide-scrollbar"
          style={{
            display: 'flex',
            gap: 4,
            padding: '6px 8px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
        >
          {assets.map((asset) => (
            <AssetThumbnail
              key={asset.key}
              asset={asset}
              selected={selectedAsset === asset.key}
              onSelect={() => selectAsset(asset.key)}
            />
          ))}
        </div>
      )}

      {/* Category tabs */}
      <div
        style={{
          display: 'flex',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        {(Object.keys(CATEGORY_LABELS) as BuildCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => selectCategory(cat)}
            style={{
              flex: 1,
              minHeight: 44,
              minWidth: 44,
              padding: '8px 4px',
              border: 'none',
              background:
                selectedCategory === cat
                  ? 'rgba(124, 58, 237, 0.06)'
                  : 'transparent',
              borderBottom:
                selectedCategory === cat
                  ? '2px solid #7C3AED'
                  : '2px solid transparent',
              color:
                selectedCategory === cat
                  ? '#6D28D9'
                  : 'rgba(0, 0, 0, 0.45)',
              fontSize: 12,
              fontWeight: selectedCategory === cat ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}

        {/* X button — only when expanded */}
        {selectedCategory && (
          <button
            onClick={exitBuildMode}
            style={{
              minWidth: 44,
              minHeight: 44,
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(0, 0, 0, 0.4)',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

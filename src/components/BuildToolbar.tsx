'use client';

import { useMemo, useCallback, useRef } from 'react';
import { useBuildStore, type BuildCategory } from '@/stores/build-store';
import { getAssetsByCategory } from '@/engine/asset-registry';
import { startToolbarDrag } from '@/engine/build-system';
import type { AssetEntry } from '@/types/assets';

// ---------------------------------------------------------------------------
// Category → Asset Registry mapping
// ---------------------------------------------------------------------------
const CATEGORY_MAP: Record<BuildCategory, string[]> = {
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
}: {
  asset: AssetEntry;
  selected: boolean;
}) {
  const didDragRef = useRef(false);

  const isRoadAsset = /^(Road|DirtRoad|GrassRoad)_Tile\d$/.test(asset.key);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      didDragRef.current = false;
      if (selected && !isRoadAsset) {
        // Already selected non-road → start drag-to-place
        e.preventDefault();
        startToolbarDrag(asset.key, e.clientX, e.clientY);
        didDragRef.current = true;
      }
      // Road assets: tap-to-select only (placement happens on the grid)
      // Unselected: do nothing — onClick handles tap-to-select
    },
    [asset.key, selected, isRoadAsset],
  );

  const handleClick = useCallback(() => {
    if (didDragRef.current) return;
    useBuildStore.getState().selectAsset(asset.key);
  }, [asset.key]);

  return (
    <button
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        width: 76,
        minWidth: 76,
        minHeight: 44,
        padding: 4,
        border: selected ? '2px solid #7C3AED' : '2px solid transparent',
        borderRadius: 8,
        background: selected ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
        cursor: selected ? 'grab' : 'pointer',
        flexShrink: 0,
        touchAction: selected ? 'none' : 'pan-x',
      }}
    >
      <img
        className={selected ? 'asset-pulse' : undefined}
        src={`/${asset.textureKey}`}
        alt={asset.displayName}
        loading="lazy"
        draggable={false}
        style={{
          width: 52,
          height: 52,
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          fontSize: 9,
          lineHeight: '11px',
          color: 'rgba(0, 0, 0, 0.55)',
          width: '100%',
          pointerEvents: 'none',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: selected ? 'clip' : 'ellipsis',
        }}
      >
        {selected ? (
          <span
            className="marquee-text"
            style={{ display: 'inline-block' }}
          >
            {asset.displayName}
          </span>
        ) : (
          asset.displayName
        )}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function RoadDeleteButton({ active }: { active: boolean }) {
  const handleClick = useCallback(() => {
    const store = useBuildStore.getState();
    if (store.roadDeleteMode) {
      store.exitRoadDeleteMode();
    } else {
      store.enterRoadDeleteMode();
    }
  }, []);

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        width: 76,
        minWidth: 76,
        minHeight: 44,
        padding: 4,
        border: active ? '2px solid #DC2626' : '2px solid transparent',
        borderRadius: 8,
        background: active ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? '#DC2626' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="4" x2="20" y2="20" />
        <line x1="20" y1="4" x2="4" y2="20" />
        <rect x="1" y="1" width="22" height="22" rx="3" />
      </svg>
      <span style={{ fontSize: 9, lineHeight: '11px', color: active ? '#DC2626' : 'rgba(0,0,0,0.55)' }}>
        Delete
      </span>
    </button>
  );
}

export default function BuildToolbar() {
  const { selectedCategory, selectedAsset, selectCategory, exitBuildMode, categoryLoadState, loadCategory } =
    useBuildStore();
  const roadDeleteMode = useBuildStore((s) => s.roadDeleteMode);

  // Build asset list for the selected category
  const assets = useMemo(() => {
    if (!selectedCategory) return [];

    const categories = CATEGORY_MAP[selectedCategory];
    let list: AssetEntry[] = [];
    for (const cat of categories) {
      list = list.concat(getAssetsByCategory(cat as AssetEntry['category']));
    }

    // For roads, show only representative tiles
    if (selectedCategory === 'roads') {
      list = list.filter((a) => ROAD_REPRESENTATIVES.has(a.key));
    }

    return list;
  }, [selectedCategory]);

  return (
    <div
      data-build-toolbar
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

      <style>{`
        @keyframes marquee-scroll {
          0%, 25% { transform: translateX(0); }
          75%, 100% { transform: translateX(calc(-100% + 68px)); }
        }
        .marquee-text {
          animation: marquee-scroll 3s ease-in-out infinite alternate;
        }
        @keyframes asset-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        .asset-pulse {
          animation: asset-pulse 1.5s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>

      {/* Asset grid (scrollable row) */}
      {selectedCategory && categoryLoadState[selectedCategory] === 'loading' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px 8px',
          }}
        >
          <span className="category-spinner" />
          <span style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>Loading...</span>
        </div>
      )}
      {selectedCategory && categoryLoadState[selectedCategory] === 'loaded' && assets.length > 0 && (
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
          {selectedCategory === 'roads' && (
            <RoadDeleteButton active={roadDeleteMode} />
          )}
          {assets.map((asset) => (
            <AssetThumbnail
              key={asset.key}
              asset={asset}
              selected={selectedAsset === asset.key}
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
            onClick={() => {
              selectCategory(cat);
              loadCategory(cat);
            }}
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

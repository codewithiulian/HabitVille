'use client';

import { useMemo, useCallback, useRef } from 'react';
import { useBuildStore, type BuildCategory } from '@/stores/build-store';
import { useGameStore } from '@/stores/game-store';
import { useInventoryStore } from '@/stores/inventory-store';
import { getAssetsByCategory, getAsset } from '@/engine/asset-registry';
import { startToolbarDrag } from '@/engine/build-system';
import { catalogToRegistryKey, getCatalogAsset, isHouseAsset } from '@/lib/catalog-helpers';
import type { AssetEntry } from '@/types/assets';

// ---------------------------------------------------------------------------
// Category → Catalog category mapping (for inventory lookup)
// ---------------------------------------------------------------------------
const BUILD_CATEGORY_CATALOG_MAP: Record<BuildCategory, string[]> = {
  roads: [],
  residential: ['houses', 'apartments'],
  commercial: ['shopping', 'restaurants'],
  public: ['public_buildings'],
  decorations: ['decorations', 'plants', 'fences', 'vehicles'],
};

// Category → Asset Registry mapping (for roads only)
const ROAD_REGISTRY_CATEGORIES = ['road', 'sidewalk'] as const;

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

interface OwnedColorEntry {
  color: string;
  quantity: number;
}

interface InventoryAssetItem {
  registryKey: string;
  catalogAssetId: string;
  displayName: string;
  textureKey: string;
  quantity: number;
  isHouse: boolean;
  ownedColors?: OwnedColorEntry[];
}

// Standard swatch order for sorting owned colors
const COLOR_ORDER = ['Blue', 'Brown', 'Green', 'Grey', 'Pink', 'Red', 'White', 'Yellow'];

const COLOR_MAP: Record<string, string> = {
  Blue: '#3B82F6',
  Brown: '#92400E',
  Green: '#16A34A',
  Grey: '#6B7280',
  Pink: '#EC4899',
  Red: '#DC2626',
  White: '#E5E7EB',
  Yellow: '#EAB308',
};

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
        // Already selected non-road -> start drag-to-place
        e.preventDefault();
        startToolbarDrag(asset.key, e.clientX, e.clientY);
        didDragRef.current = true;
      }
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

function InventoryThumbnail({
  item,
  selected,
}: {
  item: InventoryAssetItem;
  selected: boolean;
}) {
  const didDragRef = useRef(false);
  const selectedColorVariant = useBuildStore((s) => s.selectedColorVariant);

  // For selected houses, resolve texture to current color
  const textureKey = useMemo(() => {
    if (!item.isHouse || !selected || !selectedColorVariant) return item.textureKey;
    const coloredKey = catalogToRegistryKey(item.catalogAssetId, selectedColorVariant);
    const entry = getAsset(coloredKey);
    return entry?.textureKey ?? item.textureKey;
  }, [item.isHouse, item.catalogAssetId, item.textureKey, selected, selectedColorVariant]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      didDragRef.current = false;
      if (selected) {
        e.preventDefault();
        // For houses, resolve the correct registry key with color variant
        let key = item.registryKey;
        if (item.isHouse) {
          const colorVariant = useBuildStore.getState().selectedColorVariant
            ?? (item.ownedColors?.[0]?.color ?? 'Blue');
          key = catalogToRegistryKey(item.catalogAssetId, colorVariant);
        }
        startToolbarDrag(key, e.clientX, e.clientY);
        didDragRef.current = true;
      }
    },
    [item.registryKey, item.catalogAssetId, item.isHouse, item.ownedColors, selected],
  );

  const handleClick = useCallback(() => {
    if (didDragRef.current) return;
    useBuildStore.getState().selectAsset(item.registryKey);
    // If house, set color to first owned color (or keep current if it's owned)
    if (item.isHouse && item.ownedColors?.length) {
      const store = useBuildStore.getState();
      const current = store.selectedColorVariant;
      const ownsCurrentColor = current && item.ownedColors.some((c) => c.color === current);
      if (!ownsCurrentColor) {
        store.selectColorVariant(item.ownedColors[0].color);
      }
    }
  }, [item.registryKey, item.isHouse, item.ownedColors]);

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
        position: 'relative',
      }}
    >
      {/* Quantity badge */}
      <span
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          fontSize: 9,
          fontWeight: 600,
          color: '#6D28D9',
          background: 'rgba(124, 58, 237, 0.1)',
          borderRadius: 4,
          padding: '0 3px',
          lineHeight: '14px',
        }}
      >
        x{item.quantity}
      </span>
      <img
        className={selected ? 'asset-pulse' : undefined}
        src={`/${textureKey}`}
        alt={item.displayName}
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
          <span className="marquee-text" style={{ display: 'inline-block' }}>
            {item.displayName}
          </span>
        ) : (
          item.displayName
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

function HouseColorStrip({ ownedColors }: { ownedColors: OwnedColorEntry[] }) {
  const selectedColorVariant = useBuildStore((s) => s.selectedColorVariant);

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '6px 12px',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
      }}
    >
      {ownedColors.map(({ color: c, quantity }) => (
        <button
          key={c}
          onClick={() => useBuildStore.getState().selectColorVariant(c)}
          style={{
            position: 'relative',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: COLOR_MAP[c] ?? '#999',
            border: selectedColorVariant === c ? '2px solid #7C3AED' : '2px solid rgba(0,0,0,0.1)',
            cursor: 'pointer',
            boxShadow: selectedColorVariant === c ? '0 0 0 1px white, 0 0 0 3px #7C3AED' : 'none',
            transition: 'box-shadow 0.15s',
            flexShrink: 0,
          }}
          aria-label={c}
        >
          <span
            style={{
              position: 'absolute',
              top: -6,
              right: -8,
              fontSize: 8,
              fontWeight: 700,
              background: '#6D28D9',
              color: 'white',
              borderRadius: 6,
              minWidth: 14,
              height: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              lineHeight: 1,
            }}
          >
            {quantity}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function BuildToolbar() {
  const { selectedCategory, selectedAsset, selectCategory, exitBuildMode, categoryLoadState, loadCategory } =
    useBuildStore();
  const roadDeleteMode = useBuildStore((s) => s.roadDeleteMode);
  const currentMode = useGameStore((s) => s.currentMode);
  const ownedAssets = useInventoryStore((s) => s.ownedAssets);

  // Build road assets for roads tab (unchanged — free, unlimited, registry-driven)
  const roadAssets = useMemo(() => {
    if (selectedCategory !== 'roads') return [];
    let list: AssetEntry[] = [];
    for (const cat of ROAD_REGISTRY_CATEGORIES) {
      list = list.concat(getAssetsByCategory(cat as AssetEntry['category']));
    }
    return list.filter((a) => ROAD_REPRESENTATIVES.has(a.key));
  }, [selectedCategory]);

  // Build inventory items for non-road tabs
  const inventoryItems = useMemo((): InventoryAssetItem[] => {
    if (!selectedCategory || selectedCategory === 'roads') return [];

    const catalogCategories = BUILD_CATEGORY_CATALOG_MAP[selectedCategory];
    const items: InventoryAssetItem[] = [];
    // Group houses by assetId so multiple color variants merge into one entry
    const houseGroups = new Map<string, { total: number; colors: OwnedColorEntry[] }>();

    for (const inv of ownedAssets) {
      if (inv.quantity <= 0) continue;

      const catalogAsset = getCatalogAsset(inv.assetId);
      if (!catalogAsset) continue;
      if (!catalogCategories.includes(catalogAsset.category)) continue;

      const house = isHouseAsset(catalogAsset);

      if (house) {
        const color = inv.colorVariant ?? 'Blue';
        const group = houseGroups.get(inv.assetId);
        if (group) {
          // Merge into existing group (avoid duplicate colors from legacy null entries)
          const existing = group.colors.find((c) => c.color === color);
          if (existing) {
            existing.quantity += inv.quantity;
          } else {
            group.colors.push({ color, quantity: inv.quantity });
          }
          group.total += inv.quantity;
        } else {
          houseGroups.set(inv.assetId, {
            total: inv.quantity,
            colors: [{ color, quantity: inv.quantity }],
          });
        }
      } else {
        const registryKey = catalogToRegistryKey(inv.assetId);
        const registryEntry = getAsset(registryKey);
        if (!registryEntry) continue;

        items.push({
          registryKey,
          catalogAssetId: inv.assetId,
          displayName: catalogAsset.name,
          textureKey: registryEntry.textureKey,
          quantity: inv.quantity,
          isHouse: false,
        });
      }
    }

    // Add house groups as single inventory items
    for (const [assetId, group] of houseGroups) {
      const catalogAsset = getCatalogAsset(assetId)!;
      // Sort colors by standard swatch order
      group.colors.sort((a, b) => COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color));
      // Default thumbnail = first owned color in swatch order
      const defaultColor = group.colors[0].color;
      const registryKey = catalogToRegistryKey(assetId, defaultColor);
      const registryEntry = getAsset(registryKey);
      if (!registryEntry) continue;

      items.push({
        registryKey,
        catalogAssetId: assetId,
        displayName: catalogAsset.name,
        textureKey: registryEntry.textureKey,
        quantity: group.total,
        isHouse: true,
        ownedColors: group.colors,
      });
    }

    return items;
  }, [selectedCategory, ownedAssets]);

  // Check if selected asset is a house + get its owned colors
  const selectedHouseInfo = useMemo(() => {
    if (!selectedAsset || selectedCategory === 'roads') return null;
    const item = inventoryItems.find((i) => i.registryKey === selectedAsset);
    if (!item?.isHouse || !item.ownedColors) return null;
    return item;
  }, [selectedAsset, selectedCategory, inventoryItems]);

  const selectedIsHouse = !!selectedHouseInfo;

  const toggleBuildMode = useGameStore((s) => s.toggleBuildMode);

  if (currentMode !== 'build') return null;

  const isRoadTab = selectedCategory === 'roads';
  const isLoaded = selectedCategory && categoryLoadState[selectedCategory] === 'loaded';
  const isLoading = selectedCategory && categoryLoadState[selectedCategory] === 'loading';

  return (
    <>
    {/* Close button — top right */}
    <button
      onClick={toggleBuildMode}
      style={{
        position: 'fixed',
        top: 'max(env(safe-area-inset-top), 12px)',
        right: 12,
        zIndex: 101,
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        border: 'none',
        color: 'white',
        fontSize: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      aria-label="Exit build mode"
    >
      ✕
    </button>
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
        maxHeight: '25vh',
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

      {/* Color strip for houses — only when 2+ colors owned */}
      {selectedHouseInfo && selectedHouseInfo.ownedColors!.length >= 2 && (
        <HouseColorStrip ownedColors={selectedHouseInfo.ownedColors!} />
      )}

      {/* Loading state */}
      {isLoading && (
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

      {/* Road assets (free, registry-driven) */}
      {isRoadTab && isLoaded && roadAssets.length > 0 && (
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
          <RoadDeleteButton active={roadDeleteMode} />
          {roadAssets.map((asset) => (
            <AssetThumbnail
              key={asset.key}
              asset={asset}
              selected={selectedAsset === asset.key}
            />
          ))}
        </div>
      )}

      {/* Inventory-driven assets (non-road tabs) */}
      {!isRoadTab && isLoaded && inventoryItems.length > 0 && (
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
          {inventoryItems.map((item) => (
            <InventoryThumbnail
              key={item.catalogAssetId}
              item={item}
              selected={selectedAsset === item.registryKey}
            />
          ))}
        </div>
      )}

      {/* Empty inventory message */}
      {!isRoadTab && isLoaded && inventoryItems.length === 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 8px',
            fontSize: 12,
            color: 'rgba(0, 0, 0, 0.4)',
          }}
        >
          No items owned. Visit the Shop to buy assets!
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
    </>
  );
}

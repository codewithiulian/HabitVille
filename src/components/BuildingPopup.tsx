'use client';

import { useBuildStore } from '@/stores/build-store';
import { deleteSelectedBuilding, moveSelectedBuilding } from '@/engine/build-system';

export default function BuildingPopup() {
  const selectedBuilding = useBuildStore((s) => s.selectedBuilding);
  const popupScreenPos = useBuildStore((s) => s.popupScreenPos);

  if (!selectedBuilding || !popupScreenPos) return null;

  const btnBase: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate(${popupScreenPos.x}px, ${popupScreenPos.y}px) translate(-50%, -50%)`,
        zIndex: 150,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 8,
        }}
      >
        {/* Move button */}
        <button
          onClick={moveSelectedBuilding}
          style={{
            ...btnBase,
            background: 'var(--bg-sheet)',
          }}
          title="Move"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5 9 2 12 5 15" />
            <polyline points="9 5 12 2 15 5" />
            <polyline points="15 19 12 22 9 19" />
            <polyline points="19 9 22 12 19 15" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>
        </button>

        {/* Delete button */}
        <button
          onClick={deleteSelectedBuilding}
          style={{
            ...btnBase,
            background: 'rgba(254,226,226,0.92)',
          }}
          title="Delete"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

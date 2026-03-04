'use client';

import { useBuildStore } from '@/stores/build-store';
import { deleteSelectedRoad } from '@/engine/road-system';

export default function RoadPopup() {
  const selectedRoad = useBuildStore((s) => s.selectedRoad);
  const roadPopupScreenPos = useBuildStore((s) => s.roadPopupScreenPos);

  if (!selectedRoad || !roadPopupScreenPos) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate(${roadPopupScreenPos.x}px, ${roadPopupScreenPos.y}px) translate(-50%, -50%)`,
        zIndex: 150,
        pointerEvents: 'auto',
      }}
    >
      <button
        onClick={deleteSelectedRoad}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: 'rgba(254,226,226,0.92)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
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
  );
}

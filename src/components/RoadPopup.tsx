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
        transform: `translate(${roadPopupScreenPos.x}px, ${roadPopupScreenPos.y}px) translate(-50%, -100%)`,
        zIndex: 150,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 12,
          padding: '8px 12px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.12)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 8,
          whiteSpace: 'nowrap',
        }}
      >
        {/* Thumbnail */}
        {selectedRoad.textureKey && (
          <img
            src={`/${selectedRoad.textureKey}`}
            alt={selectedRoad.displayName}
            draggable={false}
            style={{
              width: 36,
              height: 36,
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Name */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#1a1a1a',
            maxWidth: 100,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {selectedRoad.displayName}
        </span>

        {/* Remove button */}
        <button
          onClick={deleteSelectedRoad}
          style={{
            minWidth: 44,
            minHeight: 44,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: '#DC2626',
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

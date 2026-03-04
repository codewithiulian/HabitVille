'use client';

import { useBuildStore } from '@/stores/build-store';
import { deleteSelectedBuilding, moveSelectedBuilding } from '@/engine/build-system';

export default function BuildingPopup() {
  const selectedBuilding = useBuildStore((s) => s.selectedBuilding);
  const popupScreenPos = useBuildStore((s) => s.popupScreenPos);

  if (!selectedBuilding || !popupScreenPos) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate(${popupScreenPos.x}px, ${popupScreenPos.y}px) translate(-50%, -100%)`,
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
        <img
          src={`/${selectedBuilding.textureKey}`}
          alt={selectedBuilding.displayName}
          draggable={false}
          style={{
            width: 36,
            height: 36,
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />

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
          {selectedBuilding.displayName}
        </span>

        {/* Move button */}
        <button
          onClick={moveSelectedBuilding}
          style={{
            minWidth: 44,
            minHeight: 44,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: '#6D28D9',
            background: 'rgba(124, 58, 237, 0.08)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Move
        </button>

        {/* Delete button */}
        <button
          onClick={deleteSelectedBuilding}
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
          Delete
        </button>
      </div>
    </div>
  );
}

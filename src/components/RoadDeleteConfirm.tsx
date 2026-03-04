'use client';

import { useBuildStore } from '@/stores/build-store';
import { deleteRoadBatch, clearDeleteHighlights } from '@/engine/road-system';

export default function RoadDeleteConfirm() {
  const roadDeleteMode = useBuildStore((s) => s.roadDeleteMode);
  const roadDeleteSelection = useBuildStore((s) => s.roadDeleteSelection);

  if (!roadDeleteMode || roadDeleteSelection.size === 0) return null;

  const count = roadDeleteSelection.size;

  const handleConfirm = () => {
    const keys = Array.from(roadDeleteSelection);
    deleteRoadBatch(keys);
    useBuildStore.getState().exitRoadDeleteMode();
  };

  const handleCancel = () => {
    clearDeleteHighlights();
    useBuildStore.getState().clearRoadDeleteSelection();
    useBuildStore.getState().exitRoadDeleteMode();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(20vh + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderRadius: 12,
        background: 'rgba(255, 255, 255, 0.92)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap' }}>
        Delete {count} road{count !== 1 ? 's' : ''}?
      </span>

      <button
        onClick={handleConfirm}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: 'none',
          background: '#DC2626',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Confirm
      </button>

      <button
        onClick={handleCancel}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: '1px solid rgba(0,0,0,0.15)',
          background: 'transparent',
          color: '#374151',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  );
}

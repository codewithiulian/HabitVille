'use client';

import React from 'react';
import type { StreakInfo } from '@/types/habits';

interface StreakBadgeProps {
  streak: StreakInfo;
}

function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak.current < 2) return null;

  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-600">
      <span>&#128293;</span>
      {streak.current}
    </span>
  );
}

export default React.memo(StreakBadge);

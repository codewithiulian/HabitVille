'use client';

import { useEffect, useState } from 'react';
import { useBuildStore } from '@/stores/build-store';

export default function Toast() {
  const toastMessage = useBuildStore((s) => s.toastMessage);
  const dismissToast = useBuildStore((s) => s.dismissToast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toastMessage) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(dismissToast, 300); // wait for fade-out
    }, 1500);

    return () => clearTimeout(timer);
  }, [toastMessage, dismissToast]);

  if (!toastMessage) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(20vh + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        fontSize: 13,
        fontWeight: 500,
        padding: '6px 16px',
        borderRadius: 20,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {toastMessage}
    </div>
  );
}

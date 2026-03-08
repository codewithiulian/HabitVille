'use client';

import { useState, useCallback } from 'react';
import { Equal, BarChart3, ClipboardList, Store, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';

// ---------------------------------------------------------------------------
// Menu items config
// ---------------------------------------------------------------------------

const MENU_ITEMS = [
  {
    label: 'Stats',
    icon: BarChart3,
    color: '#3b82f6',
    action: () => useGameStore.getState().openScreen('stats'),
  },
  {
    label: 'My Habits',
    icon: ClipboardList,
    color: '#8b5cf6',
    action: () => useGameStore.getState().setShowHabitList(true),
  },
  {
    label: 'Shop',
    icon: Store,
    color: '#f59e0b',
    action: () => useGameStore.getState().openScreen('shop'),
  },
  {
    label: 'Settings',
    icon: Settings2,
    color: '#9ca3af',
    action: () => useGameStore.getState().openScreen('settings'),
  },
] as const;

// ---------------------------------------------------------------------------
// MenuButton + MenuSheet
// ---------------------------------------------------------------------------

export default function MenuButton() {
  const initialized = useGameStore((s) => s.initialized);
  const activeScreen = useGameStore((s) => s.activeScreen);
  const currentMode = useGameStore((s) => s.currentMode);
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const [isOpen, setIsOpen] = useState(false);

  const handleItemTap = useCallback((action: () => void) => {
    action();
    setIsOpen(false);
  }, []);

  if (!initialized || activeScreen !== 'city' || currentMode === 'build' || showOnboarding) {
    return null;
  }

  return (
    <>
      {/* Menu trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 90,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        aria-label="Open menu"
      >
        <Equal size={22} color="white" />
      </button>

      {/* Menu sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 91,
              }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 92,
                background: 'rgba(15, 18, 30, 0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px 20px 0 0',
                paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
              }}
            >
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.2)',
                  }}
                />
              </div>

              {/* 2x2 grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  padding: '8px 20px 20px',
                }}
              >
                {MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleItemTap(item.action)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: item.color + '33',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={20} color={item.color} />
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 500, color: 'white' }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

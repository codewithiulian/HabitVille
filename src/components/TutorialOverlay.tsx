'use client';

import { useGameStore } from '@/stores/game-store';

const TIPS = [
  {
    title: 'Check in daily',
    body: 'Tap the habit button to manage and track your daily habits.',
    position: 'bottom' as const,
  },
  {
    title: 'Earn XP & Coins',
    body: 'Complete habits to earn XP and Coins. Level up to unlock new buildings!',
    position: 'center' as const,
  },
  {
    title: 'Build your city',
    body: 'Use your coins to buy buildings and create the city of your dreams.',
    position: 'center' as const,
  },
];

export default function TutorialOverlay() {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const setTutorialStep = useGameStore((s) => s.setTutorialStep);

  if (tutorialStep === null || tutorialStep >= TIPS.length) return null;

  const tip = TIPS[tutorialStep];
  const isLast = tutorialStep === TIPS.length - 1;

  const advance = () => {
    if (isLast) {
      setTutorialStep(null);
    } else {
      setTutorialStep(tutorialStep + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center"
      style={{ zIndex: 500 }}
      onClick={advance}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl px-6 py-5 mx-8 max-w-xs text-center animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-semibold text-base mb-1.5">{tip.title}</h3>
        <p className="text-gray-400 text-sm mb-4">{tip.body}</p>
        <button
          onClick={advance}
          className="px-6 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium active:bg-violet-700"
        >
          {isLast ? 'Got it!' : 'Next'}
        </button>
        <p className="text-gray-500 text-xs mt-3">
          {tutorialStep + 1} / {TIPS.length}
        </p>
      </div>
    </div>
  );
}

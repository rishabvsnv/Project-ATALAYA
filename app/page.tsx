'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import { BentoHUD } from '@/components/BentoHUD';
import { JournalModal } from '@/components/JournalModal';
import { useSimulationLoop } from '@/hooks/useSimulationLoop';

// Dynamically import the entire 3D Canvas context (client-only)
const IslandCanvas = dynamic(
  () => import('@/components/IslandCanvas').then((mod) => mod.IslandCanvas),
  { ssr: false }
);

export default function AtalayaPage() {
  const [mounted, setMounted] = useState(false);

  useSimulationLoop(5000);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-neutral-950 font-mono text-neutral-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Initializing ATALAYA Engine...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-950 font-sans select-none">
      {/* 3D Scene Viewport */}
      <IslandCanvas />

      {/* 2D Glassmorphic Bento HUD */}
      <BentoHUD />

      {/* 2D Persistent Chronicles Modal */}
      <JournalModal />
    </main>
  );
}
'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { IslandScene } from '@/components/IslandScene';
import { BentoHUD } from '@/components/BentoHUD';
import { JournalModal } from '@/components/JournalModal'; // <--- 1. IMPORT
import { useSimulationLoop } from '@/hooks/useSimulationLoop';

const Canvas = dynamic(
  () => import('@react-three/fiber').then((mod) => mod.Canvas),
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
      {/* 2D Glassmorphic Bento HUD */}
      <BentoHUD />

      {/* 2D Persistent Chronicles Modal */}
      <JournalModal /> {/* <--- 2. RENDER HERE */}

      {/* 3D Scene Viewport */}
      <div className="absolute inset-0 h-full w-full">
        <Canvas
          shadows="basic"
          dpr={[1, 1.5]}
          camera={{
            position: [18, 14, 18],
            fov: 42,
            near: 0.1,
            far: 200
          }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping
          }}
          className="h-full w-full"
        >
          <OrbitControls
            makeDefault
            target={[0, 0, 0]}
            maxPolarAngle={Math.PI / 2.15}
            minDistance={8}
            maxDistance={38}
            enableDamping
            dampingFactor={0.06}
            enablePan={false}
          />
          <IslandScene />
        </Canvas>
      </div>
    </main>
  );
}
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, SoftShadows } from '@react-three/drei';
import { IslandScene } from '@/components/IslandScene';
import { BentoHUD } from '@/components/BentoHUD';
import { useSimulationLoop } from '@/hooks/useSimulationLoop';

export default function AtalayaPage() {
  // Drives the 5-second autonomous agent cycle
  useSimulationLoop(5000);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-950 font-sans">
      {/* 2D Glassmorphic HUD */}
      <BentoHUD />

      {/* 3D WebGL Context */}
      <Canvas
        shadows
        camera={{ position: [14, 12, 14], fov: 42 }}
        className="h-full w-full"
      >
        <SoftShadows size={25} samples={10} focus={0.5} />
        <OrbitControls
          maxPolarAngle={Math.PI / 2.15}
          minDistance={8}
          maxDistance={32}
          enablePan={false}
        />
        <IslandScene />
      </Canvas>
    </main>
  );
}
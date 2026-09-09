'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { IslandScene } from '@/components/IslandScene';

export function IslandCanvas() {
  return (
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
  );
}
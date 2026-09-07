'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 18;

export function CampfireSmoke({ position }: { position: [number, number, number] }) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Track state for each rising particle
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      y: (i / PARTICLE_COUNT) * 1.8,
      speed: 0.35 + Math.random() * 0.25,
      driftX: (Math.random() - 0.5) * 0.12,
      driftZ: (Math.random() - 0.5) * 0.12,
      scale: 0.08 + Math.random() * 0.04
    }));
  }, []);

  useFrame((_, delta) => {
    if (!instancedMeshRef.current) return;

    particles.forEach((p, idx) => {
      p.y += p.speed * delta;

      // Reset when reaching peak height
      if (p.y > 1.8) {
        p.y = 0;
      }

      const progress = p.y / 1.8;
      const currentScale = p.scale * (1 + progress * 2.2); // Expands as it rises

      dummy.position.set(
        position[0] + p.driftX * p.y * 3,
        position[1] + 0.3 + p.y,
        position[2] + p.driftZ * p.y * 3
      );
      dummy.scale.set(currentScale, currentScale, currentScale);
      dummy.updateMatrix();

      instancedMeshRef.current!.setMatrixAt(idx, dummy.matrix);
    });

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[undefined, undefined, PARTICLE_COUNT]}
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#94a3b8"
        transparent
        opacity={0.35}
        flatShading
        roughness={1}
      />
    </instancedMesh>
  );
}
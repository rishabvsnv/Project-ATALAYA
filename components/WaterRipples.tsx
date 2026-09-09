'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/lib/store';

export function WaterRipples() {
  const survivorState = useGameStore((s) => s.survivorState);
  const survivorPos = useGameStore((s) => s.survivorPosition);

  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ringMat1Ref = useRef<THREE.MeshBasicMaterial>(null);
  const ringMat2Ref = useRef<THREE.MeshBasicMaterial>(null);

  const isSwimming = survivorState === 'SWIM';

  useFrame(() => {
    if (!isSwimming) {
      if (ring1Ref.current) ring1Ref.current.visible = false;
      if (ring2Ref.current) ring2Ref.current.visible = false;
      return;
    }

    const t = performance.now() * 0.003;
    const [x, , z] = survivorPos;

    // Ripple 1
    if (ring1Ref.current && ringMat1Ref.current) {
      ring1Ref.current.visible = true;
      ring1Ref.current.position.set(x, -0.3, z);
      const scale1 = ((t * 1.2) % 1) * 2.2 + 0.3;
      ring1Ref.current.scale.set(scale1, scale1, 1);
      ringMat1Ref.current.opacity = Math.max(0, (1 - scale1 / 2.5) * 0.45);
    }

    // Ripple 2 (Offset phase)
    if (ring2Ref.current && ringMat2Ref.current) {
      ring2Ref.current.visible = true;
      ring2Ref.current.position.set(x, -0.3, z);
      const scale2 = (((t * 1.2) + 0.5) % 1) * 2.2 + 0.3;
      ring2Ref.current.scale.set(scale2, scale2, 1);
      ringMat2Ref.current.opacity = Math.max(0, (1 - scale2 / 2.5) * 0.45);
    }
  });

  return (
    <group>
      <mesh ref={ring1Ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.3, 0.42, 24]} />
        <meshBasicMaterial
          ref={ringMat1Ref}
          color="#bae6fd"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.3, 0.42, 24]} />
        <meshBasicMaterial
          ref={ringMat2Ref}
          color="#e0f2fe"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
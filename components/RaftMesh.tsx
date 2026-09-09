'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function RaftMesh({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = -0.3 + Math.sin(t * 2) * 0.04;
    groupRef.current.rotation.z = Math.sin(t * 1.5) * 0.03;
    groupRef.current.rotation.x = Math.cos(t * 1.8) * 0.02;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Lashed Driftwood Logs */}
      {[-0.35, -0.12, 0.12, 0.35].map((xOffset, i) => (
        <mesh key={i} position={[xOffset, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.11, 1.8, 6]} />
          <meshLambertMaterial color="#78350f" flatShading />
        </mesh>
      ))}

      {/* Cross Spars */}
      <mesh position={[0, 0.1, 0.6]} castShadow>
        <boxGeometry args={[1.0, 0.06, 0.08]} />
        <meshLambertMaterial color="#92400e" flatShading />
      </mesh>
      <mesh position={[0, 0.1, -0.6]} castShadow>
        <boxGeometry args={[1.0, 0.06, 0.08]} />
        <meshLambertMaterial color="#92400e" flatShading />
      </mesh>

      {/* Center Mast & Woven Frond Sail */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 1.3, 5]} />
        <meshLambertMaterial color="#451a03" flatShading />
      </mesh>
      <mesh position={[0, 0.85, 0.1]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.75, 0.9, 0.02]} />
        <meshLambertMaterial color="#fef08a" flatShading />
      </mesh>
    </group>
  );
}
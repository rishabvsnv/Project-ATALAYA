'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, FaunaEntity } from '@/lib/store';

export function WildlifeRenderer() {
  const wildlife = useGameStore((s) => s.wildlife);

  return (
    <group>
      {wildlife.map((entity) =>
        entity.type === 'crab' ? (
          <CrabMesh key={entity.id} entity={entity} />
        ) : (
          <FishMesh key={entity.id} entity={entity} />
        )
      )}
    </group>
  );
}

function CrabMesh({ entity }: { entity: FaunaEntity }) {
  const groupRef = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(...entity.position));

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() + entity.position[0];

    // Sideways shoreline scuttle
    pos.current.x = entity.position[0] + Math.sin(t * 1.2) * 0.8;
    pos.current.z = entity.position[2] + Math.cos(t * 0.9) * 0.5;
    groupRef.current.position.copy(pos.current);

    // Face travel direction
    groupRef.current.rotation.y = Math.sin(t * 1.2) * 0.6;
  });

  return (
    <group ref={groupRef} position={entity.position}>
      {/* Shell */}
      <mesh castShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[0.22, 0.08, 0.18]} />
        <meshLambertMaterial color="#e11d48" flatShading />
      </mesh>
      {/* Left Claw */}
      <mesh position={[-0.14, 0.08, 0.1]}>
        <boxGeometry args={[0.08, 0.05, 0.08]} />
        <meshLambertMaterial color="#be123c" flatShading />
      </mesh>
      {/* Right Claw */}
      <mesh position={[0.14, 0.08, 0.1]}>
        <boxGeometry args={[0.08, 0.05, 0.08]} />
        <meshLambertMaterial color="#be123c" flatShading />
      </mesh>
    </group>
  );
}

function FishMesh({ entity }: { entity: FaunaEntity }) {
  const groupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const angle = useRef(Math.random() * Math.PI * 2);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Orbital schooling swim in water
    angle.current += delta * 0.6;
    const radius = 2.2;
    const cx = entity.position[0];
    const cz = entity.position[2];

    groupRef.current.position.x = cx + Math.cos(angle.current) * radius;
    groupRef.current.position.z = cz + Math.sin(angle.current) * radius;
    groupRef.current.position.y = -0.45 + Math.sin(t * 2.5) * 0.04;
    groupRef.current.rotation.y = -angle.current - Math.PI / 2;

    // Tail wiggle
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(t * 8) * 0.45;
    }
  });

  return (
    <group ref={groupRef} position={entity.position}>
      {/* Torpedo Body */}
      <mesh castShadow position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.08, 0.28, 5]} />
        <meshLambertMaterial color="#0284c7" flatShading />
      </mesh>
      {/* Dorsal Fin */}
      <mesh position={[0, 0.07, -0.02]}>
        <coneGeometry args={[0.03, 0.08, 3]} />
        <meshLambertMaterial color="#38bdf8" flatShading />
      </mesh>
      {/* Tail Fin */}
      <mesh ref={tailRef} position={[0, 0, -0.16]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.06, 0.1, 3]} />
        <meshLambertMaterial color="#0284c7" flatShading />
      </mesh>
    </group>
  );
}
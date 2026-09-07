'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/lib/store';
import { DayNightCycle } from './DayNightCycle';
import { WorldStructures } from './WorldStructures';

export function IslandScene() {
  const nodes = useGameStore((s) => s.nodes);

  // Generate faceted low-poly terrain
  const terrainGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(14, 16, 3, 18, 4);
    const pos = geo.attributes.position;
    
    // Perturb vertices slightly to remove synthetic uniformity
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      
      // Keep base flat, jitter upper surface
      if (y > 0) {
        const jitter = (Math.sin(x * 2) + Math.cos(z * 2)) * 0.25;
        pos.setY(i, y + jitter);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group>
    {/* Dynamic Celestial Rig & Sky Dome */}
      <DayNightCycle cycleDurationSeconds={180} />

      {/* Directional Sun */}
      {/* <directionalLight
        position={[15, 20, 10]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.001}
      />
      <ambientLight intensity={0.4} /> */}

      {/* Main Island Hex Cylinder */}
      <mesh geometry={terrainGeometry} receiveShadow castShadow position={[0, -1.5, 0]}>
        <meshStandardMaterial
          color="#5B8C5A"
          roughness={0.9}
          metalness={0.1}
          flatShading
        />
      </mesh>

      {/* Procedural Water Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <circleGeometry args={[26, 32]} />
        <meshStandardMaterial
          color="#2A7B9B"
          transparent
          opacity={0.78}
          roughness={0.2}
          metalness={0.3}
          flatShading
        />
      </mesh>

      {/* Dynamic Resource Nodes */}
      {nodes.map((node) => (
        <group key={node.id} position={node.position}>
          {node.type === 'palm' ? (
            <mesh castShadow position={[0, 1.2, 0]}>
              <coneGeometry args={[0.9, 2.4, 5]} />
              <meshStandardMaterial color="#2E6232" flatShading />
            </mesh>
          ) : (
            <mesh castShadow position={[0, 0.4, 0]}>
              <dodecahedronGeometry args={[0.6, 0]} />
              <meshStandardMaterial color="#6B7280" flatShading />
            </mesh>
          )}
        </group>
      ))}

      <WorldStructures />

      <SurvivorMesh />
    </group>
  );
}

function SurvivorMesh() {
  const meshRef = useRef<THREE.Group>(null);
  const targetPos = useGameStore((s) => s.targetPosition);
  const updateStorePos = useGameStore((s) => s.updateSurvivorPosition);

  // High-performance smooth pathing interpolation
  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (targetPos) {
      const targetVec = new THREE.Vector3(...targetPos);
      const currentPos = meshRef.current.position;

      if (currentPos.distanceTo(targetVec) > 0.05) {
        currentPos.lerp(targetVec, delta * 2.5);
        meshRef.current.lookAt(targetVec.x, currentPos.y, targetVec.z);
        updateStorePos([currentPos.x, currentPos.y, currentPos.z]);
      }
    }
  });

  return (
    <group ref={meshRef} position={[0, 0, 0]}>
      {/* Low-poly stylized character placeholder */}
      <mesh castShadow position={[0, 0.75, 0]}>
        <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
        <meshStandardMaterial color="#E07A5F" flatShading />
      </mesh>
    </group>
  );
}
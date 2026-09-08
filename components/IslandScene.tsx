'use client';

import React from 'react';
import { useGameStore } from '@/lib/store';
import { DayNightCycle } from './DayNightCycle';
import { WorldStructures } from './WorldStructures';
import { SurvivorMesh } from '@/components/SurvivorMesh';
import { WeatherFX } from './WeatherFX';

export function IslandScene() {
  const plates = useGameStore((s) => s.plates);
  const nodes = useGameStore((s) => s.nodes);

  return (
    <group position={[0, 0, 0]}>
      <DayNightCycle cycleDurationSeconds={180} />

      {/* Dynamic Weather Particle Rigs */}
      <WeatherFX />

      {/* Dynamic Procedural Terrain Plates (Archipelago) */}
      {plates.map((plate) => (
        <group key={plate.id} position={[plate.position[0], 0, plate.position[2]]}>
          <mesh receiveShadow castShadow position={[0, -1.6, 0]}>
            <cylinderGeometry args={[plate.radius, plate.radius + 1.8, 3.2, 18]} />
            <meshLambertMaterial color={plate.color} flatShading />
          </mesh>
        </group>
      ))}

      {/* Expansive Procedural Ocean Disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
        <circleGeometry args={[75, 36]} />
        <meshLambertMaterial
          color="#0284c7"
          transparent
          opacity={0.8}
          flatShading
        />
      </mesh>

      {/* Dynamic Natural Resource Nodes */}
      {nodes.map((node) => (
        <group key={node.id} position={[node.position[0], 0, node.position[2]]}>
          {node.type === 'palm' && (
            <mesh castShadow position={[0, 1.4, 0]}>
              <coneGeometry args={[1.0, 2.8, 5]} />
              <meshLambertMaterial color="#166534" flatShading />
            </mesh>
          )}

          {node.type === 'limestone' && (
            <mesh castShadow position={[0, 0.45, 0]}>
              <dodecahedronGeometry args={[0.65, 0]} />
              <meshLambertMaterial color="#64748b" flatShading />
            </mesh>
          )}

          {node.type === 'obsidian' && (
            <mesh castShadow position={[0, 0.65, 0]}>
              <octahedronGeometry args={[0.8, 0]} />
              <meshLambertMaterial color="#1e1b4b" flatShading />
            </mesh>
          )}

          {node.type === 'water_spring' && (
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[1.2, 1.2, 0.1, 8]} />
              <meshLambertMaterial color="#38bdf8" flatShading />
            </mesh>
          )}
        </group>
      ))}

      <WorldStructures />
      <SurvivorMesh />
    </group>
  );
}
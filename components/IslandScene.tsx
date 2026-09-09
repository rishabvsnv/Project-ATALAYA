'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, IslandNode } from '@/lib/store';
import { DayNightCycle } from './DayNightCycle';
import { WorldStructures } from './WorldStructures';
import { SurvivorMesh } from '@/components/SurvivorMesh';
import { WeatherFX } from './WeatherFX';
import { InteractiveTerrain } from './InteractiveTerrain';
import { WaterRipples } from './WaterRipples';
import { WildlifeRenderer } from './WildlifeRenderer';

export function IslandScene() {
  const nodes = useGameStore((s) => s.nodes);

  return (
    <group position={[0, 0, 0]}>
      {/* Day / Night Atmospheric Cycle */}
      <DayNightCycle cycleDurationSeconds={180} />

      {/* Dynamic Weather Particle Rigs */}
      <WeatherFX />

      {/* Water Wakes & Swimming Ripples */}
      <WaterRipples />

      {/* Interactive Raycast Terrain & Clickable Ocean Plane */}
      <InteractiveTerrain />

      {/* Natural Resource Nodes */}
      {nodes.map((node) => (
        <React.Fragment key={node.id}>
          {node.type === 'palm' && <PalmTreeNode node={node} />}

          {node.type === 'limestone' && (
            <group position={[node.position[0], 0, node.position[2]]}>
              <mesh castShadow position={[0, 0.45, 0]}>
                <dodecahedronGeometry args={[0.65, 0]} />
                <meshLambertMaterial color="#64748b" flatShading />
              </mesh>
            </group>
          )}

          {node.type === 'obsidian' && (
            <group position={[node.position[0], 0, node.position[2]]}>
              <mesh castShadow position={[0, 0.65, 0]}>
                <octahedronGeometry args={[0.8, 0]} />
                <meshLambertMaterial color="#1e1b4b" flatShading />
              </mesh>
            </group>
          )}

          {node.type === 'water_spring' && (
            <group position={[node.position[0], 0, node.position[2]]}>
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[1.2, 1.2, 0.1, 8]} />
                <meshLambertMaterial color="#38bdf8" flatShading />
              </mesh>
            </group>
          )}
        </React.Fragment>
      ))}

      {/* World Structures (Campfires, Shelters, Benches) */}
      <WorldStructures />

      <WildlifeRenderer />

      {/* Survivor Character */}
      <SurvivorMesh />
    </group>
  );
}

// -------------------------------------------------------------
// GRAVITY-WEIGHTED ARCHING FROND GEOMETRY
// -------------------------------------------------------------
function createProfessionalFrondGeometry(
  length: number,
  maxWidth: number,
  gravitySag: number
) {
  const geom = new THREE.BufferGeometry();
  const segments = 12; // Smooth parabolic sag
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    // Upward emergence from trunk peak, transitioning to downward cascade
    const archY = Math.sin(t * Math.PI * 0.75) * (length * 0.22);
    const dropY = -Math.pow(t, 2.6) * gravitySag;
    const y = archY + dropY;
    const x = t * length;

    // Width curve: slender at base stem, flares in center, tapers sharply at the tip
    const w = Math.sin(Math.pow(t, 0.7) * Math.PI) * maxWidth;

    // Downward lateral leaflet drape
    const edgeSag = w * 0.45;

    // 0: Left leaflet edge (drooped)
    // 1: Center spine (rachis peak)
    // 2: Right leaflet edge (drooped)
    positions.push(
      x, y - edgeSag, -w * 0.5,
      x, y, 0,
      x, y - edgeSag, w * 0.5
    );

    uvs.push(
      t, 0,
      t, 0.5,
      t, 1
    );
  }

  for (let i = 0; i < segments; i++) {
    const row1 = i * 3;
    const row2 = (i + 1) * 3;

    // Left leaflet wing
    indices.push(row1, row2, row1 + 1);
    indices.push(row1 + 1, row2, row2 + 1);

    // Right leaflet wing
    indices.push(row1 + 1, row2 + 1, row1 + 2);
    indices.push(row1 + 2, row2 + 1, row2 + 2);
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

export function PalmTreeNode({ node }: { node: IslandNode }) {
  const [x, , z] = node.position;
  const crownRef = useRef<THREE.Group>(null);

  // Position-based seed for consistent procedural variance
  const seed = useMemo(() => Math.sin(x * 12.9898 + z * 78.233), [x, z]);
  const leanAngle = 0.12 + Math.abs(seed) * 0.14;
  const leanDir = seed * Math.PI;

  // Precomputed geometry tiers with gravity droop factors
  const { lowGeom, midGeom, highGeom } = useMemo(() => ({
    lowGeom: createProfessionalFrondGeometry(2.5, 0.72, 1.4),   // Heavy mature drooping fronds
    midGeom: createProfessionalFrondGeometry(2.1, 0.62, 1.05),  // Spreading canopy
    highGeom: createProfessionalFrondGeometry(1.6, 0.46, 0.65)  // Fresh upright crown fronds
  }), []);

  const frondConfigs = useMemo(() => {
    const list = [];

    // Tier 1: Mature lower leaves (hanging toward the sand)
    for (let i = 0; i < 7; i++) {
      list.push({
        angle: (i / 7) * Math.PI * 2 + seed * 0.4,
        elevation: -0.08,
        tilt: 0.35,
        geometry: lowGeom,
        color: '#166534'
      });
    }

    // Tier 2: Mid spreading foliage
    for (let i = 0; i < 6; i++) {
      list.push({
        angle: (i / 6) * Math.PI * 2 + 0.32,
        elevation: 0.05,
        tilt: 0.12,
        geometry: midGeom,
        color: '#15803d'
      });
    }

    // Tier 3: Upright crown fronds
    for (let i = 0; i < 4; i++) {
      list.push({
        angle: (i / 4) * Math.PI * 2 + 0.78,
        elevation: 0.18,
        tilt: -0.18,
        geometry: highGeom,
        color: '#22c55e'
      });
    }

    return list;
  }, [seed, lowGeom, midGeom, highGeom]);

  // Subtle wind sway animation
  useFrame(({ clock }) => {
    if (crownRef.current) {
      const t = clock.getElapsedTime() * 1.5;
      crownRef.current.rotation.z = Math.sin(t + x) * 0.03;
      crownRef.current.rotation.x = Math.cos(t * 0.9 + z) * 0.025;
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* -------------------------------------------------------------
          TAPERED LEANING TRUNK
      ------------------------------------------------------------- */}
      <group rotation={[0, leanDir, 0]}>
        {/* Base Flare */}
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.24, 0.32, 0.3, 7]} />
          <meshLambertMaterial color="#543310" flatShading />
        </mesh>

        {/* Segment 1 */}
        <group position={[0, 0.3, 0]} rotation={[leanAngle * 0.4, 0, 0]}>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.24, 0.7, 7]} />
            <meshLambertMaterial color="#5c3817" flatShading />
          </mesh>

          {/* Segment 2 */}
          <group position={[0, 0.7, 0]} rotation={[leanAngle * 0.5, 0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.17, 0.2, 0.7, 7]} />
              <meshLambertMaterial color="#6d431d" flatShading />
            </mesh>

            {/* Segment 3 */}
            <group position={[0, 0.7, 0]} rotation={[leanAngle * 0.6, 0, 0]}>
              <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.14, 0.17, 0.7, 7]} />
                <meshLambertMaterial color="#784b22" flatShading />
              </mesh>

              {/* Segment 4 */}
              <group position={[0, 0.7, 0]} rotation={[leanAngle * 0.4, 0, 0]}>
                <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.12, 0.14, 0.6, 7]} />
                  <meshLambertMaterial color="#825327" flatShading />
                </mesh>

                {/* Dead Husk Collar */}
                <mesh position={[0, 0.6, 0]} castShadow>
                  <cylinderGeometry args={[0.17, 0.11, 0.22, 7]} />
                  <meshLambertMaterial color="#45260a" flatShading />
                </mesh>

                {/* -------------------------------------------------------------
                    GRAVITY CANOPY CROWN
                ------------------------------------------------------------- */}
                <group ref={crownRef} position={[0, 0.68, 0]}>
                  {/* Organic Coconut Cluster */}
                  {[
                    [-0.08, -0.06, 0.08],
                    [0.09, -0.05, 0.06],
                    [-0.04, -0.04, -0.09]
                  ].map((cPos, idx) => (
                    <mesh key={`coc_${idx}`} position={cPos as [number, number, number]} castShadow>
                      <sphereGeometry args={[0.085, 5, 4]} />
                      <meshLambertMaterial color="#3e2723" flatShading />
                    </mesh>
                  ))}

                  {/* Arched Downward Fronds */}
                  {frondConfigs.map((f, idx) => (
                    <group
                      key={`frond_${idx}`}
                      position={[0, f.elevation, 0]}
                      rotation={[0, f.angle, 0]}
                    >
                      <group rotation={[0, 0, f.tilt]}>
                        <mesh geometry={f.geometry} castShadow receiveShadow>
                          <meshStandardMaterial
                            color={f.color}
                            roughness={0.65}
                            metalness={0.1}
                            side={THREE.DoubleSide}
                            flatShading
                          />
                        </mesh>
                      </group>
                    </group>
                  ))}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
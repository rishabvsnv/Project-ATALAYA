'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/lib/store';

export function WeatherFX() {
  const weather = useGameStore((s) => s.weather);
  const rainCount = 1400;
  const fogCount = 80;

  const rainRef = useRef<THREE.Points>(null);
  const fogRef = useRef<THREE.Points>(null);
  const lightningLightRef = useRef<THREE.PointLight>(null);

  // Initialize rain particle buffers
  const [rainPositions, rainVelocities] = useMemo(() => {
    const pos = new Float32Array(rainCount * 3);
    const vel = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 50; // X spread
      pos[i * 3 + 1] = Math.random() * 25;        // Y height
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50; // Z spread
      vel[i] = 14 + Math.random() * 10;           // Fall velocity
    }
    return [pos, vel];
  }, [rainCount]);

  // Initialize rolling low-lying fog particles
  const fogPositions = useMemo(() => {
    const pos = new Float32Array(fogCount * 3);
    for (let i = 0; i < fogCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 45;
      pos[i * 3 + 1] = 0.2 + Math.random() * 1.5; // Low to island ground
      pos[i * 3 + 2] = (Math.random() - 0.5) * 45;
    }
    return pos;
  }, [fogCount]);

  const isPrecipitating = weather === 'Rain' || weather === 'Storm';
  const hasFog = weather === 'Fog' || weather === 'Storm';

  useFrame((_, delta) => {
    // 1. Animate Raindrops
    if (rainRef.current && isPrecipitating) {
      const positions = rainRef.current.geometry.attributes.position.array as Float32Array;
      const speedMult = weather === 'Storm' ? 1.6 : 1.0;

      for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] -= rainVelocities[i] * delta * speedMult;

        // Slight wind angle during storms
        if (weather === 'Storm') {
          positions[i * 3 + 0] -= 4.0 * delta;
        }

        // Loop back up when hitting ground level
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 22 + Math.random() * 4;
          positions[i * 3 + 0] = (Math.random() - 0.5) * 50;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Animate Drifting Fog
    if (fogRef.current && hasFog) {
      const positions = fogRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < fogCount; i++) {
        positions[i * 3 + 0] += 0.8 * delta;
        if (positions[i * 3 + 0] > 25) {
          positions[i * 3 + 0] = -25;
        }
      }
      fogRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // 3. Procedural Lightning Flashes during Storm
    if (lightningLightRef.current) {
      if (weather === 'Storm' && Math.random() < 0.015) {
        lightningLightRef.current.intensity = 18.0;
      } else {
        lightningLightRef.current.intensity = THREE.MathUtils.lerp(
          lightningLightRef.current.intensity,
          0,
          delta * 8.0
        );
      }
    }
  });

  return (
    <group>
      {/* Dynamic Raindrop Particles */}
      <points ref={rainRef} visible={isPrecipitating}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[rainPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#93c5fd"
          size={weather === 'Storm' ? 0.18 : 0.12}
          transparent
          opacity={weather === 'Storm' ? 0.85 : 0.6}
          depthWrite={false}
        />
      </points>

      {/* Low-Poly Ground Fog Nodes */}
      <points ref={fogRef} visible={hasFog}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[fogPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#cbd5e1"
          size={1.6}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </points>

      {/* Storm Lightning Flare */}
      <pointLight
        ref={lightningLightRef}
        position={[0, 18, 0]}
        color="#e0f2fe"
        intensity={0}
        distance={60}
      />
    </group>
  );
}
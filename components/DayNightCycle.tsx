'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, TimePhase } from '@/lib/store';
import { ProceduralSky } from './ProceduralSky';

interface DayNightProps {
  cycleDurationSeconds?: number;
}

export function DayNightCycle({ cycleDurationSeconds = 180 }: DayNightProps) {
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const moonLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);

  const setTimeProgress = useGameStore((s) => s.setTimeProgress);
  const sunPosition = useMemo(() => new THREE.Vector3(), []);
  const orbitRadius = 24;

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const progress = (elapsed % cycleDurationSeconds) / cycleDurationSeconds;
    const angle = progress * Math.PI * 2;

    const sunX = Math.cos(angle) * orbitRadius;
    const sunY = Math.sin(angle) * orbitRadius;
    const sunZ = Math.sin(angle * 0.5) * 6;
    sunPosition.set(sunX, sunY, sunZ);

    const moonX = -sunX;
    const moonY = -sunY;
    const moonZ = -sunZ;

    // Sun light adjustments
    if (sunLightRef.current) {
      sunLightRef.current.position.set(sunX, sunY, sunZ);
      const sunElevation = sunY / orbitRadius;
      sunLightRef.current.intensity = Math.max(0.1, sunElevation * 2.5);

      const sunColor = new THREE.Color();
      if (sunElevation < 0.25 && sunElevation > 0) {
        sunColor.setHSL(0.08, 0.9, 0.65);
      } else {
        sunColor.setHSL(0.12, 0.3, 0.95);
      }
      sunLightRef.current.color = sunColor;
    }

    // Moon light adjustments
    if (moonLightRef.current) {
      moonLightRef.current.position.set(moonX, moonY, moonZ);
      const moonElevation = moonY / orbitRadius;
      moonLightRef.current.intensity = Math.max(0.8, moonElevation * 1.8);
      moonLightRef.current.color.set('#93c5fd');
    }

    // Ambient light - maintains visibility even at deep night
    if (ambientLightRef.current) {
      const sunElevation = sunY / orbitRadius;
      const isNight = sunElevation <= 0;
      ambientLightRef.current.intensity = isNight ? 0.65 : 0.85;
      ambientLightRef.current.color.set(isNight ? '#818cf8' : '#ffffff');
    }

    let phase: TimePhase = 'Day';
    if (progress >= 0.2 && progress < 0.3) phase = 'Dawn';
    else if (progress >= 0.3 && progress < 0.7) phase = 'Day';
    else if (progress >= 0.7 && progress < 0.8) phase = 'Dusk';
    else phase = 'Night';

    setTimeProgress(progress, phase);
  });

  return (
    <>
      <ProceduralSky sunPosition={sunPosition} />

      {/* Persistent global ambient lighting */}
      <ambientLight ref={ambientLightRef} intensity={0.75} />

      {/* Primary Directional Sun */}
      <directionalLight
        ref={sunLightRef}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0005}
      />

      {/* Secondary Directional Moon */}
      <directionalLight
        ref={moonLightRef}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0005}
      />
    </>
  );
}
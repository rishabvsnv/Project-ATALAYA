'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, TimePhase } from '@/lib/store';
import { ProceduralSky } from './ProceduralSky';

interface DayNightProps {
  cycleDurationSeconds?: number; // 180s = 3 minute full day
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
    // Normalized 0.0 to 1.0 progress through full 24-hour cycle
    const progress = (elapsed % cycleDurationSeconds) / cycleDurationSeconds;
    
    // Orbital angle: theta goes 0 to 2*PI
    const angle = progress * Math.PI * 2;

    // Orbit path along X/Y with slight Z inclination
    const sunX = Math.cos(angle) * orbitRadius;
    const sunY = Math.sin(angle) * orbitRadius;
    const sunZ = Math.sin(angle * 0.5) * 6;
    sunPosition.set(sunX, sunY, sunZ);

    // Opposing Moon path
    const moonX = -sunX;
    const moonY = -sunY;
    const moonZ = -sunZ;

    // 1. Sun & Moon position & cast setup
    if (sunLightRef.current) {
      sunLightRef.current.position.set(sunX, sunY, sunZ);
      
      // Sun intensity scales with its elevation above horizon
      const sunElevation = sunY / orbitRadius;
      sunLightRef.current.intensity = Math.max(0, sunElevation * 2.2);
      
      // Warmer golden-amber color near horizon, crisp white overhead
      const sunColor = new THREE.Color();
      if (sunElevation < 0.25 && sunElevation > 0) {
        sunColor.setHSL(0.08, 0.9, 0.65); // Warm sunset orange
      } else {
        sunColor.setHSL(0.12, 0.3, 0.95); // Pale daylight
      }
      sunLightRef.current.color = sunColor;
    }

    if (moonLightRef.current) {
      moonLightRef.current.position.set(moonX, moonY, moonZ);
      const moonElevation = moonY / orbitRadius;
      moonLightRef.current.intensity = Math.max(0, moonElevation * 0.45);
      moonLightRef.current.color.set('#93c5fd'); // Cold lunar blue
    }

    // 2. Ambient light level adjustments
    if (ambientLightRef.current) {
      const sunElevation = sunY / orbitRadius;
      const ambientIntensity = THREE.MathUtils.lerp(0.08, 0.45, Math.max(0, (sunElevation + 0.2) / 1.2));
      ambientLightRef.current.intensity = ambientIntensity;
    }

    // 3. Determine time phase & sync to Zustand
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

      {/* Global Ambient Lighting */}
      <ambientLight ref={ambientLightRef} intensity={0.3} />

      {/* Primary Directional Sun */}
      <directionalLight
        ref={sunLightRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0005}
      />

      {/* Secondary Directional Moon */}
      <directionalLight
        ref={moonLightRef}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0005}
      />
    </>
  );
}
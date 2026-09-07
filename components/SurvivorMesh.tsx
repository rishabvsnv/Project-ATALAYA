'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, SurvivorAnimState } from '@/lib/store';

export function SurvivorMesh() {
  const rootRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const toolRef = useRef<THREE.Group>(null);

  const targetPos = useGameStore((s) => s.targetPosition);
  const animState = useGameStore((s) => s.survivorState);
  const setAnimState = useGameStore((s) => s.setSurvivorState);
  const updateStorePos = useGameStore((s) => s.updateSurvivorPosition);

  // Smooth lerping target vectors
  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const walkTime = useRef(0);
  const actionTime = useRef(0);

  useFrame((_, delta) => {
    if (!rootRef.current) return;

    // --- 1. SPATIAL NAVIGATION & ORIENTATION ---
    let isMoving = false;
    if (targetPos) {
      const targetVec = new THREE.Vector3(...targetPos);
      const dist = currentPos.current.distanceTo(targetVec);

      if (dist > 0.1) {
        isMoving = true;
        // Move towards target
        currentPos.current.lerp(targetVec, delta * 2.8);
        rootRef.current.position.copy(currentPos.current);

        // Turn towards movement heading
        const lookTarget = new THREE.Vector3(targetVec.x, rootRef.current.position.y, targetVec.z);
        rootRef.current.lookAt(lookTarget);

        updateStorePos([currentPos.current.x, currentPos.current.y, currentPos.current.z]);
      } else {
        // Arrived at target
        if (animState === 'WALK') {
          setAnimState('IDLE');
        }
      }
    }

    // Active state takes movement into account
    const effectiveState: SurvivorAnimState = isMoving ? 'WALK' : animState;

    // --- 2. PROCEDURAL KINEMATICS LOOP ---
    const t = performance.now() * 0.001;

    // Reference shortcuts
    const la = leftArmRef.current;
    const ra = rightArmRef.current;
    const ll = leftLegRef.current;
    const rl = rightLegRef.current;
    const head = headRef.current;
    const torso = torsoRef.current;
    const root = rootRef.current;
    const tool = toolRef.current;

    if (!la || !ra || !ll || !rl || !head || !torso || !tool) return;

    // Tool visibility: only render primitive flint axe during CHOP
    tool.visible = effectiveState === 'CHOP';

    switch (effectiveState) {
      case 'WALK': {
        walkTime.current += delta * 7.5;
        const w = walkTime.current;

        // Upright posture
        root.rotation.x = 0.1; // Slight forward lean
        root.rotation.z = 0;
        root.position.y = Math.abs(Math.sin(w)) * 0.08; // Step bounce

        // Torso counter-twist
        torso.rotation.y = Math.sin(w) * 0.15;
        head.rotation.y = -Math.sin(w) * 0.08;

        // Natural opposing limb pendulum swing
        la.rotation.x = Math.sin(w) * 0.7;
        ra.rotation.x = -Math.sin(w) * 0.7;
        la.rotation.z = -0.15;
        ra.rotation.z = 0.15;

        ll.rotation.x = -Math.sin(w) * 0.8;
        rl.rotation.x = Math.sin(w) * 0.8;
        break;
      }

      case 'CHOP': {
        actionTime.current += delta * 6.0;
        const a = actionTime.current;

        // Torso swings downward aggressively
        const strike = Math.sin(a);
        torso.rotation.x = THREE.MathUtils.lerp(0, 0.4, (strike + 1) * 0.5);
        torso.rotation.y = Math.sin(a * 0.5) * 0.2;

        // Right arm swings tool down, left arm stabilizes
        ra.rotation.x = -Math.PI / 3 + strike * 1.2;
        ra.rotation.z = 0.2;
        la.rotation.x = 0.3;
        la.rotation.z = -0.3;

        // Legs planted firmly
        ll.rotation.x = 0.15;
        rl.rotation.x = -0.2;
        root.position.y = 0;
        break;
      }

      case 'SLEEP': {
        // Lay flat on ground: rotate root pitch by 90 degrees
        root.rotation.x = -Math.PI / 2;
        root.rotation.z = 0;
        root.position.y = 0.15; // Resting on terrain plane

        // Subtle breathing expansion
        const breathe = Math.sin(t * 1.5) * 0.04;
        torso.scale.set(1 + breathe, 1 + breathe, 1);

        // Relaxed limbs
        la.rotation.set(0.1, 0, -0.4);
        ra.rotation.set(0.1, 0, 0.4);
        ll.rotation.set(0, 0, -0.1);
        rl.rotation.set(0, 0, 0.1);
        break;
      }

      case 'IDLE':
      default: {
        // Reset rotation and position
        root.rotation.x = 0;
        root.rotation.z = 0;
        root.position.y = 0;
        torso.scale.set(1, 1, 1);

        // Subtle breathing bounce
        const breath = Math.sin(t * 2.2);
        torso.position.y = 0.6 + breath * 0.02;
        head.rotation.y = Math.sin(t * 0.6) * 0.15; // Natural head scan

        // Idle arm dangle with minor drift
        la.rotation.x = Math.sin(t * 1.2) * 0.05;
        ra.rotation.x = -Math.sin(t * 1.2) * 0.05;
        la.rotation.z = -0.12;
        ra.rotation.z = 0.12;

        // Neutral standing legs
        ll.rotation.set(0, 0, 0);
        rl.rotation.set(0, 0, 0);
        break;
      }
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      {/* --- TORSO ROOT --- */}
      <group ref={torsoRef} position={[0, 0.6, 0]}>
        {/* Torso Box */}
        <mesh castShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[0.36, 0.42, 0.22]} />
          <meshStandardMaterial color="#E07A5F" roughness={0.8} flatShading />
        </mesh>

        {/* Neck / Head Joint */}
        <group ref={headRef} position={[0, 0.45, 0]}>
          <mesh castShadow position={[0, 0.12, 0]}>
            <dodecahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color="#F4A261" roughness={0.7} flatShading />
          </mesh>
        </group>

        {/* --- LEFT ARM (Pivot at Shoulder) --- */}
        <group ref={leftArmRef} position={[-0.24, 0.35, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}>
            <boxGeometry args={[0.1, 0.36, 0.1]} />
            <meshStandardMaterial color="#E07A5F" roughness={0.8} flatShading />
          </mesh>
        </group>

        {/* --- RIGHT ARM & TOOL SOCKET --- */}
        <group ref={rightArmRef} position={[0.24, 0.35, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}>
            <boxGeometry args={[0.1, 0.36, 0.1]} />
            <meshStandardMaterial color="#E07A5F" roughness={0.8} flatShading />
          </mesh>

          {/* Flint Axe Primitive in Right Hand */}
          <group ref={toolRef} position={[0, -0.36, 0.12]} rotation={[0.4, 0, 0]}>
            <mesh castShadow position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.02, 0.025, 0.35, 4]} />
              <meshStandardMaterial color="#451A03" flatShading />
            </mesh>
            <mesh castShadow position={[0, 0.22, 0.04]} rotation={[0, 0, 0.3]}>
              <dodecahedronGeometry args={[0.07, 0]} />
              <meshStandardMaterial color="#64748B" flatShading />
            </mesh>
          </group>
        </group>
      </group>

      {/* --- LEFT LEG (Pivot at Hip) --- */}
      <group ref={leftLegRef} position={[-0.1, 0.42, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <boxGeometry args={[0.12, 0.44, 0.12]} />
          <meshStandardMaterial color="#3D405B" roughness={0.9} flatShading />
        </mesh>
      </group>

      {/* --- RIGHT LEG (Pivot at Hip) --- */}
      <group ref={rightLegRef} position={[0.1, 0.42, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <boxGeometry args={[0.12, 0.44, 0.12]} />
          <meshStandardMaterial color="#3D405B" roughness={0.9} flatShading />
        </mesh>
      </group>
    </group>
  );
}
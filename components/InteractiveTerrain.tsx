'use client';

import React, { useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/lib/store';

export function InteractiveTerrain() {
  const plates = useGameStore((s) => s.plates);
  const activeTool = useGameStore((s) => s.activeTool);
  const setTargetPosition = useGameStore((s) => s.setTargetPosition);
  const spawnSupplyCrate = useGameStore((s) => s.spawnSupplyCrate);
  const plantCustomNode = useGameStore((s) => s.plantCustomNode);
  const setSurvivorState = useGameStore((s) => s.setSurvivorState);

  const [cursorPos, setCursorPos] = useState<[number, number, number] | null>(null);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.point) {
      setCursorPos([e.point.x, 0.05, e.point.z]);
    }
  };

  const handlePointerOut = () => {
    setCursorPos(null);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pt: [number, number, number] = [e.point.x, 0, e.point.z];

    switch (activeTool) {
      case 'ORDER_MOVE':
        setTargetPosition(pt);
        setSurvivorState('WALK');
        break;
      case 'DROP_SUPPLY':
        spawnSupplyCrate(pt);
        break;
      case 'PLANT_NODE':
        plantCustomNode(pt, Math.random() > 0.5 ? 'palm' : 'limestone');
        break;
      case 'INSPECT':
      default:
        // Set inspection target
        setTargetPosition(pt);
        break;
    }
  };

  const ringColor = {
    INSPECT: '#38bdf8',
    DROP_SUPPLY: '#fbbf24',
    PLANT_NODE: '#4ade80',
    ORDER_MOVE: '#f43f5e'
  }[activeTool];

  return (
    <group>
      {/* Clickable Island Surface Plates */}
      {plates.map((plate) => (
        <group key={plate.id} position={[plate.position[0], 0, plate.position[2]]}>
          <mesh
            receiveShadow
            castShadow
            position={[0, -1.6, 0]}
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <cylinderGeometry args={[plate.radius, plate.radius + 1.8, 3.2, 18]} />
            <meshLambertMaterial color={plate.color} flatShading />
          </mesh>
        </group>
      ))}

      {/* Dynamic Cursor Projection Indicator */}
      {cursorPos && (
        <mesh position={cursorPos} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.55, 24]} />
          <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
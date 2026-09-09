'use client';

import React, { useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, InterventionTool } from '@/lib/store';

const ringColor: Record<InterventionTool, string> = {
  INSPECT: '#38bdf8',
  DROP_SUPPLY: '#fbbf24',
  PLANT_NODE: '#4ade80',
  ORDER_MOVE: '#f43f5e',
  BUILD_HOUSE: '#a855f7',
  BUILD_FARM: '#84cc16'
};

export function InteractiveTerrain() {
  const plates = useGameStore((s) => s.plates);
  const activeTool = useGameStore((s) => s.activeTool);
  const setTargetPosition = useGameStore((s) => s.setTargetPosition);
  const spawnSupplyCrate = useGameStore((s) => s.spawnSupplyCrate);
  const plantCustomNode = useGameStore((s) => s.plantCustomNode);

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
        break;
      case 'DROP_SUPPLY':
        spawnSupplyCrate(pt);
        break;
      case 'PLANT_NODE':
        plantCustomNode(pt, Math.random() > 0.5 ? 'palm' : 'limestone');
        break;
      case 'BUILD_HOUSE':
        useGameStore.setState((s) => ({
          structures: [
            ...s.structures,
            {
              id: `struct_shelter_${Date.now()}`,
              type: 'shelter',
              position: [pt[0], 0, pt[2]],
              rotationY: Math.random() * Math.PI * 2
            }
          ],
          logs: [
            `[God-Mode] Constructed Thatched Shelter at [${pt[0].toFixed(1)}, ${pt[2].toFixed(1)}]`,
            ...s.logs.slice(0, 18)
          ]
        }));
        break;
      case 'BUILD_FARM':
        useGameStore.setState((s) => ({
          structures: [
            ...s.structures,
            {
              id: `struct_farm_${Date.now()}`,
              type: 'crop_plot',
              position: [pt[0], 0, pt[2]],
              rotationY: Math.random() * Math.PI * 2,
              cropStage: 1,
              waterLevel: 50
            }
          ],
          logs: [
            `[God-Mode] Established Farm Plot at [${pt[0].toFixed(1)}, ${pt[2].toFixed(1)}]`,
            ...s.logs.slice(0, 18)
          ]
        }));
        break;
      case 'INSPECT':
      default:
        setTargetPosition(pt);
        break;
    }
  };

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

      {/* Clickable Ocean Disc */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.3, 0]}
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <circleGeometry args={[75, 36]} />
        <meshLambertMaterial
          color="#0284c7"
          transparent
          opacity={0.82}
          depthWrite={false}
          flatShading
        />
      </mesh>

      {/* Dynamic Cursor Projection Indicator */}
      {cursorPos && (
        <mesh position={cursorPos} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.55, 24]} />
          <meshBasicMaterial
            color={ringColor[activeTool]}
            side={THREE.DoubleSide}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}
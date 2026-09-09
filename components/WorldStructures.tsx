"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore, WorldStructure } from "@/lib/store";
import { CampfireSmoke } from "./CampfireSmoke";

export function WorldStructures() {
  const structures = useGameStore((s) => s.structures);

  return (
    <group>
      {structures.map((struct) => {
        switch (struct.type) {
          case "campfire":
            return (
              <React.Fragment key={struct.id}>
                <CampfireMesh struct={struct} />
                <CampfireSmoke position={struct.position} />
              </React.Fragment>
            );
          case "shelter":
            return <ShelterMesh key={struct.id} struct={struct} />;
          case "crafting_bench":
            return <CraftingBenchMesh key={struct.id} struct={struct} />;
          case "crop_plot":
            return <CropPlotMesh key={struct.id} struct={struct} />;
          default:
            return null;
        }
      })}
    </group>
  );
}

function CampfireMesh({ struct }: { struct: WorldStructure }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (lightRef.current) {
      // Natural fire illumination flicker
      lightRef.current.intensity =
        1.4 + Math.sin(clock.elapsedTime * 12) * 0.35;
    }
  });

  return (
    <group position={struct.position} rotation={[0, struct.rotationY, 0]}>
      {/* Stone Ring */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const rad = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(rad) * 0.35, 0.05, Math.sin(rad) * 0.35]}
            castShadow
          >
            <dodecahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial color="#57534E" flatShading />
          </mesh>
        );
      })}

      {/* Cross Logs */}
      <mesh rotation={[0.3, 0.4, 0]} position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.5, 5]} />
        <meshStandardMaterial color="#451A03" flatShading />
      </mesh>
      <mesh rotation={[-0.3, -0.6, 0]} position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.5, 5]} />
        <meshStandardMaterial color="#451A03" flatShading />
      </mesh>

      {/* Flame Mesh */}
      <mesh position={[0, 0.22, 0]}>
        <coneGeometry args={[0.15, 0.35, 4]} />
        <meshStandardMaterial
          color="#F97316"
          emissive="#EA580C"
          emissiveIntensity={1.2}
          flatShading
        />
      </mesh>

      {/* Animated Point Light */}
      <pointLight
        ref={lightRef}
        color="#FFAA33"
        distance={6}
        decay={2}
        position={[0, 0.3, 0]}
        castShadow
      />
    </group>
  );
}

function ShelterMesh({ struct }: { struct: WorldStructure }) {
  return (
    <group position={struct.position} rotation={[0, struct.rotationY, 0]}>
      {/* Ridgepole Support Beam */}
      <mesh position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 5]} />
        <meshStandardMaterial color="#451A03" flatShading />
      </mesh>

      {/* Left Lean Wall */}
      <mesh
        position={[-0.45, 0.45, 0]}
        rotation={[0, 0, -0.45]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.05, 1.1, 1.3]} />
        <meshStandardMaterial color="#2E6232" roughness={0.8} flatShading />
      </mesh>

      {/* Right Lean Wall */}
      <mesh
        position={[0.45, 0.45, 0]}
        rotation={[0, 0, 0.45]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.05, 1.1, 1.3]} />
        <meshStandardMaterial color="#2E6232" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

function CraftingBenchMesh({ struct }: { struct: WorldStructure }) {
  return (
    <group position={struct.position} rotation={[0, struct.rotationY, 0]}>
      {/* Log Table Top */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.12, 0.6]} />
        <meshStandardMaterial color="#78350F" flatShading />
      </mesh>

      {/* Table Legs */}
      {[
        [-0.4, 0.22, -0.22],
        [0.4, 0.22, -0.22],
        [-0.4, 0.22, 0.22],
        [0.4, 0.22, 0.22],
      ].map((coords, i) => (
        <mesh key={i} position={coords as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.45, 5]} />
          <meshStandardMaterial color="#451A03" flatShading />
        </mesh>
      ))}

      {/* Work Flint Tool on Top */}
      <mesh position={[0.15, 0.54, 0.05]} rotation={[0.2, 0.4, 0]} castShadow>
        <dodecahedronGeometry args={[0.07, 0]} />
        <meshStandardMaterial color="#57534E" flatShading />
      </mesh>
    </group>
  );
}

function CropPlotMesh({ struct }: { struct: WorldStructure }) {
  const stage = struct.cropStage ?? 1;
  const isHydrated = (struct.waterLevel ?? 0) > 20;

  return (
    <group position={struct.position} rotation={[0, struct.rotationY, 0]}>
      {/* Wood border box */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={`bw_${x}`} position={[x, 0.08, 0]} castShadow>
          <boxGeometry args={[0.08, 0.16, 1.2]} />
          <meshLambertMaterial color="#451a03" flatShading />
        </mesh>
      ))}
      {[-0.55, 0.55].map((z) => (
        <mesh key={`bl_${z}`} position={[0, 0.08, z]} castShadow>
          <boxGeometry args={[1.18, 0.16, 0.08]} />
          <meshLambertMaterial color="#451a03" flatShading />
        </mesh>
      ))}

      {/* Soil */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[1.05, 0.1, 1.05]} />
        <meshLambertMaterial
          color={isHydrated ? '#2d1808' : '#5c3817'}
          flatShading
        />
      </mesh>

      {/* Sprout stage */}
      {stage === 1 && (
        <group position={[0, 0.1, 0]}>
          {[-0.3, 0, 0.3].map((sx) =>
            [-0.3, 0, 0.3].map((sz) => (
              <mesh key={`sprout_${sx}_${sz}`} position={[sx, 0.05, sz]}>
                <coneGeometry args={[0.04, 0.12, 4]} />
                <meshLambertMaterial color="#86efac" flatShading />
              </mesh>
            ))
          )}
        </group>
      )}

      {/* Growing stage */}
      {stage === 2 && (
        <group position={[0, 0.1, 0]}>
          {[-0.3, 0, 0.3].map((sx) =>
            [-0.3, 0, 0.3].map((sz) => (
              <group key={`veg_${sx}_${sz}`} position={[sx, 0, sz]}>
                <mesh position={[0, 0.15, 0]} castShadow>
                  <cylinderGeometry args={[0.02, 0.025, 0.3, 5]} />
                  <meshLambertMaterial color="#22c55e" flatShading />
                </mesh>
                <mesh position={[0.05, 0.2, 0]} rotation={[0, 0, -0.4]}>
                  <boxGeometry args={[0.15, 0.02, 0.06]} />
                  <meshLambertMaterial color="#16a34a" flatShading />
                </mesh>
              </group>
            ))
          )}
        </group>
      )}

      {/* Harvestable mature stage */}
      {stage >= 3 && (
        <group position={[0, 0.1, 0]}>
          {[-0.3, 0, 0.3].map((sx) =>
            [-0.3, 0, 0.3].map((sz) => (
              <group key={`mature_${sx}_${sz}`} position={[sx, 0, sz]}>
                <mesh position={[0, 0.3, 0]} castShadow>
                  <cylinderGeometry args={[0.025, 0.03, 0.6, 5]} />
                  <meshLambertMaterial color="#ca8a04" flatShading />
                </mesh>
                <mesh position={[0, 0.55, 0]} castShadow>
                  <dodecahedronGeometry args={[0.08, 0]} />
                  <meshLambertMaterial color="#eab308" flatShading />
                </mesh>
                <mesh position={[0, 0.38, 0.04]} rotation={[0.4, 0, 0]}>
                  <boxGeometry args={[0.18, 0.02, 0.08]} />
                  <meshLambertMaterial color="#65a30d" flatShading />
                </mesh>
              </group>
            ))
          )}
        </group>
      )}
    </group>
  );
}
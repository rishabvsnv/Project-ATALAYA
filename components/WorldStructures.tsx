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
          case 'water_collector':
            return <WaterCollectorMesh key={struct.id} struct={struct} />;
          case 'watchtower':
            return <WatchtowerMesh key={struct.id} struct={struct} />;
          case 'smelting_kiln':
            return <SmeltingKilnMesh key={struct.id} struct={struct} />;
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

// 1. Rain Catchment Cistern (Funnel tarp + hollow stone reservoir)
function WaterCollectorMesh({ struct }: { struct: WorldStructure }) {
  const fillHeight = Math.max(0.05, ((struct.waterLevel ?? 0) / 100) * 0.45);

  return (
    <group position={struct.position} rotation={[0, struct.rotationY, 0]}>
      {/* Stone Basin Base */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.65, 0.72, 0.5, 8]} />
        <meshLambertMaterial color="#475569" flatShading />
      </mesh>

      {/* Water Level in Basin */}
      {(struct.waterLevel ?? 0) > 0 && (
        <mesh position={[0, 0.05 + fillHeight, 0]}>
          <cylinderGeometry args={[0.58, 0.58, 0.05, 8]} />
          <meshLambertMaterial color="#38bdf8" transparent opacity={0.8} />
        </mesh>
      )}

      {/* 4 Timber Support Stilts */}
      {[
        [-0.45, -0.45],
        [0.45, -0.45],
        [-0.45, 0.45],
        [0.45, 0.45]
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[sx, 0.7, sz]} castShadow>
          <boxGeometry args={[0.08, 0.9, 0.08]} />
          <meshLambertMaterial color="#543310" flatShading />
        </mesh>
      ))}

      {/* Inverted Palm Frond Catchment Funnel */}
      <mesh position={[0, 1.15, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.95, 0.45, 6, 1, true]} />
        <meshLambertMaterial color="#166534" side={THREE.DoubleSide} flatShading />
      </mesh>
    </group>
  );
}

// 2. High Signal Watchtower (Elevated lookout platform + blazing night beacon)
function WatchtowerMesh({ struct }: { struct: WorldStructure }) {
  return (
    <group position={struct.position} rotation={[0, struct.rotationY, 0]}>
      {/* 4 Angled Main Pillar Trusses */}
      {[
        [-0.6, -0.6, 0.08, 0.08],
        [0.6, -0.6, -0.08, 0.08],
        [-0.6, 0.6, 0.08, -0.08],
        [0.6, 0.6, -0.08, -0.08]
      ].map(([px, pz, rx, rz], i) => (
        <mesh key={i} position={[px * 0.7, 1.5, pz * 0.7]} rotation={[rx, 0, rz]} castShadow>
          <cylinderGeometry args={[0.07, 0.1, 3.1, 5]} />
          <meshLambertMaterial color="#451a03" flatShading />
        </mesh>
      ))}

      {/* Crossbeam Ring Braces */}
      {[0.9, 1.9, 2.8].map((by, i) => (
        <mesh key={i} position={[0, by, 0]}>
          <boxGeometry args={[1.2 - i * 0.15, 0.06, 1.2 - i * 0.15]} />
          <meshLambertMaterial color="#5c3817" flatShading />
        </mesh>
      ))}

      {/* Elevated Lookout Deck */}
      <mesh position={[0, 3.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.1, 1.4]} />
        <meshLambertMaterial color="#78350f" flatShading />
      </mesh>

      {/* Guard Rails */}
      <mesh position={[0, 3.25, 0]}>
        <boxGeometry args={[1.35, 0.4, 1.35]} />
        <meshLambertMaterial color="#92400e" wireframe />
      </mesh>

      {/* Monument Beacon Brazier */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.15, 0.3, 6]} />
        <meshLambertMaterial color="#1e293b" flatShading />
      </mesh>
      {/* Eternal Lookout Glow */}
      <pointLight position={[0, 3.5, 0]} intensity={1.8} color="#f59e0b" distance={8} />
      <mesh position={[0, 3.35, 0]}>
        <dodecahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
    </group>
  );
}

// 3. Volcanic Obsidian Smelting Kiln (Thermal chimney with internal magma glow)
function SmeltingKilnMesh({ struct }: { struct: WorldStructure }) {
  return (
    <group position={struct.position} rotation={[0, struct.rotationY, 0]}>
      {/* Heavy Megalith Base */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.7, 1.1]} />
        <meshLambertMaterial color="#1e1b4b" flatShading />
      </mesh>

      {/* Stepped Kiln Chimney */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.46, 0.8, 6]} />
        <meshLambertMaterial color="#0f172a" flatShading />
      </mesh>

      {/* Smelting Hearth Mouth (Glow Portal) */}
      <mesh position={[0, 0.28, 0.52]}>
        <planeGeometry args={[0.42, 0.36]} />
        <meshBasicMaterial color="#ea580c" />
      </mesh>

      {/* Magma Embers & Interior Light */}
      <pointLight position={[0, 0.35, 0.6]} intensity={2.5} color="#f97316" distance={4.5} />
      <mesh position={[0, 1.38, 0]}>
        <dodecahedronGeometry args={[0.08, 0]} />
        <meshBasicMaterial color="#fdba74" />
      </mesh>
    </group>
  );
}
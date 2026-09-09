'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, SurvivorAnimState } from '@/lib/store';

export function SurvivorMesh() {
  const rootRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const chestRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const backpackRef = useRef<THREE.Group>(null);

  // Limbs
  const leftUpperArmRef = useRef<THREE.Group>(null);
  const rightUpperArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);

  const leftThighRef = useRef<THREE.Group>(null);
  const rightThighRef = useRef<THREE.Group>(null);
  const leftShinRef = useRef<THREE.Group>(null);
  const rightShinRef = useRef<THREE.Group>(null);

  const toolRef = useRef<THREE.Group>(null);

  const plates = useGameStore((s) => s.plates);
  const targetPos = useGameStore((s) => s.targetPosition);
  const animState = useGameStore((s) => s.survivorState);
  const setAnimState = useGameStore((s) => s.setSurvivorState);
  const updateStorePos = useGameStore((s) => s.updateSurvivorPosition);

  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const walkTime = useRef(0);
  const swimTime = useRef(0);
  const actionTime = useRef(0);

  const nodes = useGameStore((s) => s.nodes);
  const structures = useGameStore((s) => s.structures);

  // Set rotation order to YXZ so heading (Y) is evaluated before pitch (X)
  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.rotation.order = 'YXZ';
    }
  }, []);

  const palette = {
    skin: '#c68662',
    skinShadow: '#b06f4c',
    tunic: '#3f4f44',
    tunicTrim: '#2c3730',
    pants: '#2d3342',
    belt: '#1c1714',
    boots: '#241a14',
    sole: '#120d0a',
    hair: '#1f1612',
    buckle: '#d4af37',
    pack: '#785b41',
    packRoll: '#8c7b69',
    wood: '#6b4423',
    stone: '#606770'
  };

  const COLLIDERS = {
    palm: 0.35,
    limestone: 0.65,
    obsidian: 0.75,
    shelter: 1.1,
    crafting_bench: 0.6,
    campfire: 0.45
  };

  const checkIsOnLand = (x: number, z: number) => {
    return plates.some((plate) => {
      const dx = x - plate.position[0];
      const dz = z - plate.position[2];
      return Math.sqrt(dx * dx + dz * dz) <= plate.radius;
    });
  };

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;

    let isMoving = false;
    const onLand = checkIsOnLand(currentPos.current.x, currentPos.current.z);

    if (targetPos) {
      const targetVec = new THREE.Vector3(...targetPos);
      const dx = targetVec.x - currentPos.current.x;
      const dz = targetVec.z - currentPos.current.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.15) {
        isMoving = true;
        
        // Steady fixed units/second (no teleporting across long distances)
        const moveSpeed = onLand ? 3.4 : 1.8;
        const step = Math.min(dist, moveSpeed * delta);

        // Linear constant velocity
        currentPos.current.x += (dx / dist) * step;
        currentPos.current.z += (dz / dist) * step;

        root.position.x = currentPos.current.x;
        root.position.z = currentPos.current.z;

        // Direct angle towards waypoint (no Math.PI offset)
        const targetRot = Math.atan2(dx, dz);
        const diff = Math.atan2(
          Math.sin(targetRot - root.rotation.y),
          Math.cos(targetRot - root.rotation.y)
        );
        root.rotation.y += diff * (1 - Math.exp(-10 * delta));

        updateStorePos([currentPos.current.x, currentPos.current.y, currentPos.current.z]);

        if (!onLand && animState !== 'SWIM') {
          setAnimState('SWIM');
        } else if (onLand && animState === 'SWIM') {
          setAnimState('WALK');
        }
      } else {
        // Arrived at destination waypoint
        if (!onLand) {
          if (animState !== 'SWIM') setAnimState('SWIM');
        } else if (animState === 'WALK' || animState === 'SWIM') {
          setAnimState('IDLE');
        }
      }
    }

    // Submersion elevation
    const targetY = onLand ? 0.0 : -0.72;
    currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, targetY, 1 - Math.exp(-6 * delta));

    let effectiveState: SurvivorAnimState = animState;
    if (!onLand) {
      effectiveState = 'SWIM';
    } else if (isMoving) {
      effectiveState = 'WALK';
    }

    const t = performance.now() * 0.001;

    const hips = hipsRef.current;
    const chest = chestRef.current;
    const head = headRef.current;
    const pack = backpackRef.current;
    const lua = leftUpperArmRef.current;
    const rua = rightUpperArmRef.current;
    const lfa = leftForearmRef.current;
    const rfa = rightForearmRef.current;
    const lth = leftThighRef.current;
    const rth = rightThighRef.current;
    const lsh = leftShinRef.current;
    const rsh = rightShinRef.current;
    const tool = toolRef.current;

    if (!hips || !chest || !head || !lua || !rua || !lfa || !rfa || !lth || !rth || !lsh || !rsh || !tool) {
      return;
    }

    tool.visible = effectiveState === 'CHOP';

    // -------------------------------------------------------------
    // SWIMMING KINEMATICS (Face +Z forward, positive X pitch into water)
    // -------------------------------------------------------------
    if (effectiveState === 'SWIM') {
      swimTime.current += delta * (isMoving ? 5.5 : 2.5);
      const sw = swimTime.current;

      const buoyancy = Math.sin(sw * 2.0) * 0.03;
      root.position.y = currentPos.current.y + buoyancy;

      // Positive X rotation pitches the +Z face down into the water
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, Math.PI / 2.5, 1 - Math.exp(-6 * delta));
      root.rotation.z = Math.sin(sw) * 0.08;

      // Head looks UP and forward relative to the angled body
      head.rotation.x = -0.65;
      head.rotation.y = Math.sin(sw * 0.5) * 0.12;

      chest.rotation.set(0, 0, 0);
      chest.scale.set(1, 1, 1);
      hips.position.y = 0.46;
      hips.rotation.set(0, 0, 0);

      // Front crawl arm strokes
      const strokeL = Math.sin(sw);
      const strokeR = Math.sin(sw + Math.PI);

      lua.rotation.set(-0.3 + strokeL * 0.7, 0.2, -0.4);
      rua.rotation.set(-0.3 + strokeR * 0.7, -0.2, 0.4);

      lfa.rotation.set(Math.max(0, -strokeL) * 0.8 + 0.3, 0, 0);
      rfa.rotation.set(Math.max(0, -strokeR) * 0.8 + 0.3, 0, 0);

      // Submerged flutter kicks
      const kickL = Math.sin(sw * 1.8);
      const kickR = Math.sin(sw * 1.8 + Math.PI);

      lth.rotation.set(kickL * 0.3, 0, -0.05);
      rth.rotation.set(kickR * 0.3, 0, 0.05);

      lsh.rotation.set(Math.max(0, kickL) * 0.45, 0, 0);
      rsh.rotation.set(Math.max(0, kickR) * 0.45, 0, 0);

      if (pack) pack.rotation.x = 0;
    }

    // -------------------------------------------------------------
    // WALKING KINEMATICS
    // -------------------------------------------------------------
    else if (effectiveState === 'WALK') {
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, 0, 1 - Math.exp(-8 * delta));
      root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, 0, 1 - Math.exp(-8 * delta));

      walkTime.current += delta * 9.0;
      const w = walkTime.current;

      const legL = Math.sin(w);
      const legR = Math.sin(w + Math.PI);
      const armL = Math.sin(w + Math.PI + 0.1);
      const armR = Math.sin(w + 0.1);

      root.position.y = currentPos.current.y + Math.abs(Math.sin(w * 2)) * 0.055;
      hips.position.y = 0.46;
      hips.rotation.z = Math.sin(w) * 0.06;
      hips.rotation.y = Math.sin(w) * 0.08;

      chest.rotation.y = -Math.sin(w) * 0.1;
      chest.rotation.x = 0.08;
      head.rotation.x = -0.04;
      head.rotation.y = Math.sin(w * 0.5) * 0.03;

      lth.rotation.x = legL * 0.65;
      rth.rotation.x = legR * 0.65;
      lth.rotation.z = 0.02;
      rth.rotation.z = -0.02;

      lsh.rotation.x = Math.max(0, -legL) * 0.75;
      rsh.rotation.x = Math.max(0, -legR) * 0.75;

      lua.rotation.x = armL * 0.5;
      rua.rotation.x = armR * 0.5;
      lua.rotation.z = -0.12;
      rua.rotation.z = 0.12;

      lfa.rotation.x = 0.25 + Math.max(0, -armL) * 0.3;
      rfa.rotation.x = 0.25 + Math.max(0, -armR) * 0.3;

      if (pack) pack.rotation.x = Math.sin(w * 2) * 0.04;
    }

    // -------------------------------------------------------------
    // CHOPPING KINEMATICS
    // -------------------------------------------------------------
    else if (effectiveState === 'CHOP') {
      root.rotation.x = 0;
      root.rotation.z = 0;

      actionTime.current += delta * 6.5;
      const a = actionTime.current;
      const swing = Math.pow((Math.sin(a) + 1) * 0.5, 2.2);

      root.position.y = currentPos.current.y;
      hips.position.y = 0.46;
      hips.rotation.set(0.08, 0, 0);

      chest.rotation.x = THREE.MathUtils.lerp(-0.15, 0.6, swing);
      chest.rotation.y = THREE.MathUtils.lerp(-0.12, 0.12, swing);
      head.rotation.x = THREE.MathUtils.lerp(0.2, -0.3, swing);

      rua.rotation.set(THREE.MathUtils.lerp(-1.75, 0.45, swing), 0.2, 0.1);
      rfa.rotation.set(THREE.MathUtils.lerp(-0.85, 0.2, swing), 0, 0);

      lua.rotation.set(THREE.MathUtils.lerp(-1.55, 0.25, swing), -0.2, -0.2);
      lfa.rotation.set(THREE.MathUtils.lerp(-0.65, 0.45, swing), 0, 0);

      lth.rotation.set(0.25, 0, -0.1);
      rth.rotation.set(-0.2, 0, 0.12);
      lsh.rotation.set(0.15, 0, 0);
      rsh.rotation.set(0.25, 0, 0);
    }

    // -------------------------------------------------------------
    // SLEEPING KINEMATICS
    // -------------------------------------------------------------
    else if (effectiveState === 'SLEEP') {
      root.position.y = 0.12;
      root.rotation.x = -Math.PI / 2;
      root.rotation.z = 0;

      const breathe = Math.sin(t * 1.8) * 0.03;
      chest.scale.set(1 + breathe, 1 + breathe, 1);

      hips.position.y = 0.46;
      hips.rotation.set(0, 0, 0);
      chest.rotation.set(0, 0, 0);
      head.rotation.set(-0.1, Math.sin(t * 0.4) * 0.15, 0);

      lua.rotation.set(0.1, 0, -0.4);
      rua.rotation.set(0.1, 0, 0.4);
      lfa.rotation.set(0.8, 0, 0);
      rfa.rotation.set(0.8, 0, 0);

      lth.rotation.set(-0.05, 0, -0.1);
      rth.rotation.set(-0.05, 0, 0.1);
      lsh.rotation.set(0.1, 0, 0);
      rsh.rotation.set(0.1, 0, 0);

      if (pack) pack.rotation.x = 0;
    }

    // -------------------------------------------------------------
    // IDLE KINEMATICS
    // -------------------------------------------------------------
    else {
      root.position.y = currentPos.current.y;
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, 0, 1 - Math.exp(-8 * delta));
      root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, 0, 1 - Math.exp(-8 * delta));

      const breathe = Math.sin(t * 2.0) * 0.02;
      chest.scale.set(1, 1 + breathe, 1);

      hips.position.y = 0.46;
      hips.rotation.z = Math.sin(t * 0.6) * 0.02 + 0.015;
      hips.rotation.x = 0;

      head.rotation.y = Math.sin(t * 0.45) * 0.22;
      head.rotation.x = Math.sin(t * 0.35) * 0.04 - 0.02;

      lua.rotation.set(0.04, 0, -0.12 + breathe);
      rua.rotation.set(-0.04, 0, 0.12 - breathe);
      lfa.rotation.set(0.18, 0, 0);
      rfa.rotation.set(0.18, 0, 0);

      lth.rotation.set(-0.04, 0, -0.04);
      rth.rotation.set(0.04, 0, 0.04);
      lsh.rotation.set(0.06, 0, 0);
      rsh.rotation.set(0.02, 0, 0);
    }

    // -------------------------------------------------------------
    // OBSTACLE COLLISION RESOLUTION (2D Circle Push)
    // -------------------------------------------------------------
    const survivorRadius = 0.28;

    // 1. Collide with Natural Resource Nodes
    for (const node of nodes) {
      if (node.type === 'water_spring') continue; // Allow walking into water springs
      const r = (COLLIDERS[node.type as keyof typeof COLLIDERS] ?? 0.4) + survivorRadius;
      
      const ox = currentPos.current.x - node.position[0];
      const oz = currentPos.current.z - node.position[2];
      const distSq = ox * ox + oz * oz;

      if (distSq < r * r && distSq > 0.0001) {
        const d = Math.sqrt(distSq);
        const overlap = r - d;
        // Push survivor outward along collision normal
        currentPos.current.x += (ox / d) * overlap;
        currentPos.current.z += (oz / d) * overlap;
      }
    }

    // 2. Collide with Placed Structures
    for (const struct of structures) {
      const r = (COLLIDERS[struct.type as keyof typeof COLLIDERS] ?? 0.5) + survivorRadius;
      
      const ox = currentPos.current.x - struct.position[0];
      const oz = currentPos.current.z - struct.position[2];
      const distSq = ox * ox + oz * oz;

      if (distSq < r * r && distSq > 0.0001) {
        const d = Math.sqrt(distSq);
        const overlap = r - d;
        // Push survivor outward so they slide along walls/fire
        currentPos.current.x += (ox / d) * overlap;
        currentPos.current.z += (oz / d) * overlap;
      }
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      {/* Pelvis / Cargo Belt */}
      <group ref={hipsRef} position={[0, 0.46, 0]}>
        <mesh castShadow position={[0, 0.04, 0]}>
          <boxGeometry args={[0.34, 0.16, 0.22]} />
          <meshLambertMaterial color={palette.pants} flatShading />
        </mesh>

        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.36, 0.06, 0.24]} />
          <meshLambertMaterial color={palette.belt} flatShading />
        </mesh>

        <mesh position={[0, 0.12, 0.125]}>
          <boxGeometry args={[0.065, 0.045, 0.02]} />
          <meshLambertMaterial color={palette.buckle} flatShading />
        </mesh>

        <mesh castShadow position={[0, 0.19, 0]}>
          <boxGeometry args={[0.33, 0.12, 0.22]} />
          <meshLambertMaterial color={palette.tunicTrim} flatShading />
        </mesh>

        {/* Torso & Satchel */}
        <group ref={chestRef} position={[0, 0.22, 0]}>
          <mesh castShadow position={[0, 0.06, 0]}>
            <boxGeometry args={[0.35, 0.14, 0.23]} />
            <meshLambertMaterial color={palette.tunicTrim} flatShading />
          </mesh>

          <mesh castShadow position={[0, 0.2, 0]}>
            <boxGeometry args={[0.42, 0.24, 0.25]} />
            <meshLambertMaterial color={palette.tunic} flatShading />
          </mesh>

          <mesh castShadow position={[0, 0.34, 0.01]}>
            <cylinderGeometry args={[0.075, 0.085, 0.1, 8]} />
            <meshLambertMaterial color={palette.skin} flatShading />
          </mesh>

          <group ref={backpackRef} position={[0, 0.18, -0.14]}>
            <mesh castShadow>
              <boxGeometry args={[0.26, 0.26, 0.12]} />
              <meshLambertMaterial color={palette.pack} flatShading />
            </mesh>
            <mesh castShadow position={[0, -0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.05, 0.05, 0.32, 7]} />
              <meshLambertMaterial color={palette.packRoll} flatShading />
            </mesh>
          </group>

          {/* Head & Features */}
          <group ref={headRef} position={[0, 0.45, 0.02]}>
            <mesh castShadow position={[0, 0.06, 0]}>
              <boxGeometry args={[0.22, 0.24, 0.22]} />
              <meshLambertMaterial color={palette.skin} flatShading />
            </mesh>
            <mesh castShadow position={[0, 0.15, -0.02]} scale={[1.05, 0.55, 1.08]}>
              <boxGeometry args={[0.23, 0.22, 0.24]} />
              <meshLambertMaterial color={palette.hair} flatShading />
            </mesh>
            <mesh castShadow position={[0, 0.16, 0.08]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.21, 0.08, 0.09]} />
              <meshLambertMaterial color={palette.hair} flatShading />
            </mesh>
            <mesh castShadow position={[0, 0.04, 0.12]}>
              <boxGeometry args={[0.04, 0.07, 0.04]} />
              <meshLambertMaterial color={palette.skinShadow} flatShading />
            </mesh>
            <mesh position={[-0.055, 0.07, 0.112]}>
              <boxGeometry args={[0.035, 0.02, 0.01]} />
              <meshLambertMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0.055, 0.07, 0.112]}>
              <boxGeometry args={[0.035, 0.02, 0.01]} />
              <meshLambertMaterial color="#1a1a1a" />
            </mesh>
          </group>

          {/* Left Arm */}
          <group ref={leftUpperArmRef} position={[-0.26, 0.26, 0]}>
            <mesh castShadow position={[0, -0.06, 0]}>
              <boxGeometry args={[0.13, 0.18, 0.14]} />
              <meshLambertMaterial color={palette.tunicTrim} flatShading />
            </mesh>
            <group ref={leftForearmRef} position={[0, -0.18, 0]}>
              <mesh castShadow position={[0, -0.08, 0]}>
                <boxGeometry args={[0.1, 0.18, 0.11]} />
                <meshLambertMaterial color={palette.skin} flatShading />
              </mesh>
              <mesh castShadow position={[0, -0.21, 0]}>
                <boxGeometry args={[0.08, 0.1, 0.08]} />
                <meshLambertMaterial color={palette.skinShadow} flatShading />
              </mesh>
            </group>
          </group>

          {/* Right Arm & Hatchet */}
          <group ref={rightUpperArmRef} position={[0.26, 0.26, 0]}>
            <mesh castShadow position={[0, -0.06, 0]}>
              <boxGeometry args={[0.13, 0.18, 0.14]} />
              <meshLambertMaterial color={palette.tunicTrim} flatShading />
            </mesh>
            <group ref={rightForearmRef} position={[0, -0.18, 0]}>
              <mesh castShadow position={[0, -0.08, 0]}>
                <boxGeometry args={[0.1, 0.18, 0.11]} />
                <meshLambertMaterial color={palette.skin} flatShading />
              </mesh>
              <mesh castShadow position={[0, -0.21, 0]}>
                <boxGeometry args={[0.08, 0.1, 0.08]} />
                <meshLambertMaterial color={palette.skinShadow} flatShading />
              </mesh>

              <group ref={toolRef} position={[0.02, -0.22, 0.08]} rotation={[0.4, 0, 0]}>
                <mesh castShadow position={[0, 0.08, 0]}>
                  <cylinderGeometry args={[0.02, 0.025, 0.5, 6]} />
                  <meshLambertMaterial color={palette.wood} flatShading />
                </mesh>
                <mesh castShadow position={[0, 0.28, 0.05]} rotation={[0, 0, Math.PI / 2]}>
                  <coneGeometry args={[0.08, 0.16, 4]} />
                  <meshLambertMaterial color={palette.stone} flatShading />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* Left Leg */}
        <group ref={leftThighRef} position={[-0.1, -0.04, 0]}>
          <mesh castShadow position={[0, -0.14, 0]}>
            <boxGeometry args={[0.13, 0.26, 0.15]} />
            <meshLambertMaterial color={palette.pants} flatShading />
          </mesh>
          <group ref={leftShinRef} position={[0, -0.28, 0]}>
            <mesh castShadow position={[0, -0.12, 0]}>
              <boxGeometry args={[0.12, 0.26, 0.14]} />
              <meshLambertMaterial color={palette.boots} flatShading />
            </mesh>
            <mesh castShadow position={[0, -0.23, 0.05]}>
              <boxGeometry args={[0.13, 0.08, 0.21]} />
              <meshLambertMaterial color={palette.sole} flatShading />
            </mesh>
          </group>
        </group>

        {/* Right Leg */}
        <group ref={rightThighRef} position={[0.1, -0.04, 0]}>
          <mesh castShadow position={[0, -0.14, 0]}>
            <boxGeometry args={[0.13, 0.26, 0.15]} />
            <meshLambertMaterial color={palette.pants} flatShading />
          </mesh>
          <group ref={rightShinRef} position={[0, -0.28, 0]}>
            <mesh castShadow position={[0, -0.12, 0]}>
              <boxGeometry args={[0.12, 0.26, 0.14]} />
              <meshLambertMaterial color={palette.boots} flatShading />
            </mesh>
            <mesh castShadow position={[0, -0.23, 0.05]}>
              <boxGeometry args={[0.13, 0.08, 0.21]} />
              <meshLambertMaterial color={palette.sole} flatShading />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
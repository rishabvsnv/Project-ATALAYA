'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SkyShader = {
  uniforms: {
    uSunPosition: { value: new THREE.Vector3() },
    uNightColorTop: { value: new THREE.Color('#030712') },
    uNightColorBottom: { value: new THREE.Color('#0f172a') },
    uDayColorTop: { value: new THREE.Color('#1e40af') },
    uDayColorBottom: { value: new THREE.Color('#bae6fd') },
    uDuskColorTop: { value: new THREE.Color('#4c1d95') },
    uDuskColorBottom: { value: new THREE.Color('#f97316') }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSunPosition;
    uniform vec3 uNightColorTop;
    uniform vec3 uNightColorBottom;
    uniform vec3 uDayColorTop;
    uniform vec3 uDayColorBottom;
    uniform vec3 uDuskColorTop;
    uniform vec3 uDuskColorBottom;
    varying vec3 vWorldPosition;

    void main() {
      vec3 normalizedPos = normalize(vWorldPosition);
      float height = clamp(normalizedPos.y, 0.0, 1.0);
      
      // Calculate sun elevation (-1.0 to 1.0)
      vec3 sunDir = normalize(uSunPosition);
      float sunHeight = sunDir.y;

      // Base night & day vertical gradients
      vec3 nightGrad = mix(uNightColorBottom, uNightColorTop, height);
      vec3 dayGrad = mix(uDayColorBottom, uDayColorTop, height);
      vec3 duskGrad = mix(uDuskColorBottom, uDuskColorTop, pow(height, 0.6));

      // Atmospheric blend based on sun inclination
      vec3 color;
      if (sunHeight > 0.15) {
        // High Sun: Clear Daytime
        color = mix(duskGrad, dayGrad, clamp((sunHeight - 0.15) * 2.0, 0.0, 1.0));
      } else if (sunHeight > -0.15) {
        // Horizon Transition: Dawn / Dusk glow
        float t = (sunHeight + 0.15) / 0.3;
        color = mix(nightGrad, duskGrad, t);
      } else {
        // Low Sun: Deep Night
        color = nightGrad;
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export function ProceduralSky({ sunPosition }: { sunPosition: THREE.Vector3 }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => THREE.UniformsUtils.clone(SkyShader.uniforms),
    []
  );

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uSunPosition.value.copy(sunPosition);
    }
  });

  return (
    <mesh>
      {/* Inverted dome bounding the island */}
      <sphereGeometry args={[75, 24, 16]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={SkyShader.vertexShader}
        fragmentShader={SkyShader.fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
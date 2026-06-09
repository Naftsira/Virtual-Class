'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Line, Points, PointMaterial } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function ParticleField() {
  const points = useMemo(() => {
    const positions = new Float32Array(420 * 3);

    for (let i = 0; i < 420; i++) {
      const radius = 2.2 + Math.random() * 2.4;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 3.2;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    return positions;
  }, []);

  return (
    <Points positions={points} stride={3} frustumCulled>
      <PointMaterial
        transparent
        color="#ffffff"
        size={0.018}
        sizeAttenuation
        depthWrite={false}
        opacity={0.55}
      />
    </Points>
  );
}

function WireStructure() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    groupRef.current.rotation.y += delta * 0.08;
    groupRef.current.rotation.x = Math.sin(Date.now() * 0.00025) * 0.08;
  });

  const square = [
    [-1.4, -0.8, 0],
    [1.4, -0.8, 0],
    [1.4, 0.8, 0],
    [-1.4, 0.8, 0],
    [-1.4, -0.8, 0],
  ] as [number, number, number][];

  return (
    <group ref={groupRef}>
      <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.45}>
        <group>
          <Line
            points={square}
            color="#ffffff"
            lineWidth={1}
            transparent
            opacity={0.55}
          />

          <Line
            points={square.map(([x, y, z]) => [x * 0.72, y * 0.72, z + 0.55])}
            color="#ffffff"
            lineWidth={1}
            transparent
            opacity={0.32}
          />

          <Line
            points={[
              [-1.4, -0.8, 0],
              [-1.008, -0.576, 0.55],
            ]}
            color="#ffffff"
            lineWidth={1}
            transparent
            opacity={0.25}
          />

          <Line
            points={[
              [1.4, -0.8, 0],
              [1.008, -0.576, 0.55],
            ]}
            color="#ffffff"
            lineWidth={1}
            transparent
            opacity={0.25}
          />

          <Line
            points={[
              [1.4, 0.8, 0],
              [1.008, 0.576, 0.55],
            ]}
            color="#ffffff"
            lineWidth={1}
            transparent
            opacity={0.25}
          />

          <Line
            points={[
              [-1.4, 0.8, 0],
              [-1.008, 0.576, 0.55],
            ]}
            color="#ffffff"
            lineWidth={1}
            transparent
            opacity={0.25}
          />
        </group>
      </Float>
    </group>
  );
}

function SceneContent() {
  const rootRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!rootRef.current) return;
    rootRef.current.rotation.y += delta * 0.025;
  });

  return (
    <group ref={rootRef}>
      <ParticleField />
      <WireStructure />
    </group>
  );
}

export default function AuthVisualScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <SceneContent />
      </Canvas>
    </div>
  );
}
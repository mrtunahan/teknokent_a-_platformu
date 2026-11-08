import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Arka planda yavaşça dönen 3D "ekosistem ağı": düğümler (firmalar) ve yakın düğümler arası bağlantılar.
 * Fare konumuna göre hafifçe eğilir. Tek draw-call'lık Points + LineSegments ile hafif tutulur.
 */
function Network({ count = 90, radius = 6.5 }: { count?: number; radius?: number }) {
  const group = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Points>(null);

  const { positions, colors, linePositions, lineColors } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    // Fibonacci küresi + hafif gürültü: dengeli, organik dağılım
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      const jitter = 0.75 + Math.random() * 0.45;
      pts.push(new THREE.Vector3(Math.cos(theta) * r, y * 0.8, Math.sin(theta) * r).multiplyScalar(radius * jitter));
    }
    const palette = [new THREE.Color('#FF5E00'), new THREE.Color('#2563EB'), new THREE.Color('#94A3B8')];
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    pts.forEach((p, i) => {
      positions.set([p.x, p.y, p.z], i * 3);
      const c = palette[i % 3]!;
      colors.set([c.r, c.g, c.b], i * 3);
    });
    const lp: number[] = [];
    const lc: number[] = [];
    const maxDist = radius * 0.42;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const d = pts[i]!.distanceTo(pts[j]!);
        if (d < maxDist) {
          lp.push(pts[i]!.x, pts[i]!.y, pts[i]!.z, pts[j]!.x, pts[j]!.y, pts[j]!.z);
          const c1 = palette[i % 3]!;
          const c2 = palette[j % 3]!;
          lc.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
        }
      }
    }
    return { positions, colors, linePositions: new Float32Array(lp), lineColors: new Float32Array(lc) };
  }, [count, radius]);

  useFrame(({ clock, pointer }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    g.rotation.y = t * 0.045 + pointer.x * 0.25;
    g.rotation.x = Math.sin(t * 0.08) * 0.08 - pointer.y * 0.15;
    if (pulse.current) {
      const m = pulse.current.material as THREE.PointsMaterial;
      m.size = 0.09 + Math.sin(t * 1.6) * 0.02;
    }
  });

  return (
    <group ref={group}>
      <points ref={pulse}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.09} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[lineColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.16} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

function Dust({ count = 260 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a.set([(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 16 - 4], i * 3);
    }
    return a;
  }, [count]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.012;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#CBD5E1" transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

export default function NetworkScene() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 13], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      eventSource={document.body}
      eventPrefix="client"
      aria-hidden
    >
      <fog attach="fog" args={['#F8FAFC', 10, 22]} />
      <Network />
      <Dust />
    </Canvas>
  );
}

/**
 * FloatingGeometry — a procedurally-animated geometric shape.
 * Accepts `type` prop: 'icosahedron' | 'octahedron' | 'torus-knot' | 'sphere'
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei'
import * as THREE from 'three'

export default function FloatingGeometry({
  type      = 'icosahedron',
  scale     = 1,
  color     = '#3d5eff',
  emissive  = '#1a1aff',
  wireframe = false,
  speed     = 1,
}) {
  const mesh = useRef()

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t = clock.elapsedTime * speed
    mesh.current.rotation.x = t * 0.18
    mesh.current.rotation.y = t * 0.25
    mesh.current.rotation.z = Math.sin(t * 0.3) * 0.1
  })

  const geometry = {
    icosahedron: <icosahedronGeometry args={[1, 1]} />,
    octahedron:  <octahedronGeometry  args={[1, 0]} />,
    'torus-knot':<torusKnotGeometry   args={[0.7, 0.25, 120, 16]} />,
    sphere:      <sphereGeometry      args={[1, 32, 32]} />,
    box:         <boxGeometry         args={[1.4, 1.4, 1.4]} />,
  }[type] ?? <icosahedronGeometry args={[1, 1]} />

  return (
    <mesh ref={mesh} scale={scale}>
      {geometry}
      {wireframe ? (
        <meshBasicMaterial color={color} wireframe />
      ) : (
        <MeshDistortMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.4}
          metalness={0.8}
          roughness={0.1}
          distort={0.3}
          speed={2}
        />
      )}
    </mesh>
  )
}

/**
 * AIBrain — neural network node-and-edge visualisation built with Three.js lines.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const NODE_COLOR  = '#3d5eff'
const EDGE_COLOR  = '#00d4ff'
const NODE_COUNT  = 28
const SPHERE_R    = 1.8

function fibonacci(n) {
  const pts = []
  const phi = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y     = 1 - (i / (n - 1)) * 2
    const r     = Math.sqrt(1 - y * y)
    const theta = phi * i
    pts.push(new THREE.Vector3(Math.cos(theta) * r * SPHERE_R, y * SPHERE_R, Math.sin(theta) * r * SPHERE_R))
  }
  return pts
}

export default function AIBrain({ scale = 1 }) {
  const group   = useRef()
  const nodes   = useMemo(() => fibonacci(NODE_COUNT), [])

  // Build edges (connect each node to its 2 nearest neighbours)
  const edgePositions = useMemo(() => {
    const pts = []
    nodes.forEach((a, i) => {
      const nearest = nodes
        .map((b, j) => ({ j, d: i !== j ? a.distanceTo(b) : Infinity }))
        .sort((x, y) => x.d - y.d)
        .slice(0, 2)
      nearest.forEach(({ j }) => {
        pts.push(a.x, a.y, a.z, nodes[j].x, nodes[j].y, nodes[j].z)
      })
    })
    return new Float32Array(pts)
  }, [nodes])

  const nodePositions = useMemo(() => {
    const arr = new Float32Array(nodes.length * 3)
    nodes.forEach((v, i) => { arr[i*3]=v.x; arr[i*3+1]=v.y; arr[i*3+2]=v.z })
    return arr
  }, [nodes])

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.rotation.y = t * 0.15
    group.current.rotation.x = Math.sin(t * 0.1) * 0.2
  })

  return (
    <group ref={group} scale={scale}>
      {/* Edges */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.35} />
      </lineSegments>

      {/* Nodes */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={NODE_COLOR} size={0.08} sizeAttenuation />
      </points>

      {/* Core glow sphere */}
      <mesh>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial
          color={NODE_COLOR}
          emissive={NODE_COLOR}
          emissiveIntensity={2}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  )
}

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ParticleField({
  count   = 1200,
  spread  = 12,
  color   = '#3d5eff',
  speed   = 0.12,
  size    = 0.025,
}) {
  const mesh = useRef()

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * spread
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread
      vel[i * 3]     = (Math.random() - 0.5) * 0.002
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.002
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002
    }
    return { positions: pos, velocities: vel }
  }, [count, spread])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const pos = mesh.current.geometry.attributes.position.array
    const t   = clock.elapsedTime * speed

    for (let i = 0; i < count; i++) {
      pos[i * 3]     += velocities[i * 3]
      pos[i * 3 + 1] += velocities[i * 3 + 1] + Math.sin(t + i * 0.01) * 0.001
      pos[i * 3 + 2] += velocities[i * 3 + 2]

      // Wrap particles that leave the spread box
      for (let axis = 0; axis < 3; axis++) {
        const idx = i * 3 + axis
        if (pos[idx] >  spread / 2) pos[idx] = -spread / 2
        if (pos[idx] < -spread / 2) pos[idx] =  spread / 2
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true
    mesh.current.rotation.y = t * 0.05
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  )
}

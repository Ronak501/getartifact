/**
 * HeroScene — the builder's own homepage 3D background.
 * Shows the AI Brain surrounded by a particle field with post-processing bloom.
 */

import { Suspense } from 'react'
import { Stars, Float } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import AIBrain        from '@3d/objects/AIBrain'
import ParticleField  from '@3d/objects/ParticleField'
import FloatingGeometry from '@3d/objects/FloatingGeometry'
import CameraRig      from '@3d/effects/CameraRig'

export default function HeroScene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[6, 6, 6]}   intensity={3}   color="#3d5eff" />
      <pointLight position={[-6, -4, -4]} intensity={1.5} color="#bf5fff" />
      <pointLight position={[0, 8, -6]}   intensity={2}   color="#00d4ff" />

      {/* Background stars */}
      <Stars radius={80} depth={40} count={2500} factor={3} fade speed={0.8} />

      {/* Central AI Brain */}
      <Suspense fallback={null}>
        <Float speed={1.5} rotationIntensity={0.4} floatIntensity={1.2}>
          <AIBrain scale={1.1} />
        </Float>
      </Suspense>

      {/* Orbiting geometry accents */}
      <Suspense fallback={null}>
        <Float speed={3} rotationIntensity={1} floatIntensity={0.5}>
          <group position={[3.2, 1, -1]}>
            <FloatingGeometry type="icosahedron" scale={0.35} color="#00d4ff" emissive="#0055ff" />
          </group>
        </Float>
        <Float speed={2.5} rotationIntensity={0.8} floatIntensity={0.7}>
          <group position={[-3, -1, -0.5]}>
            <FloatingGeometry type="octahedron" scale={0.28} color="#bf5fff" emissive="#6600cc" />
          </group>
        </Float>
        <Float speed={2} rotationIntensity={0.6} floatIntensity={1}>
          <group position={[0, -2.5, 0]}>
            <FloatingGeometry type="torus-knot" scale={0.2} color="#ff2d78" emissive="#990033" />
          </group>
        </Float>
      </Suspense>

      {/* Particle field */}
      <ParticleField count={1000} spread={14} color="#3d5eff" size={0.02} />

      {/* Camera follows mouse */}
      <CameraRig intensity={0.25} />

      {/* Bloom post-processing */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9}
          intensity={1.5}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

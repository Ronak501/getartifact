/**
 * CodeGenerator — Phase 7-8
 *
 * Takes a finished blueprint and produces:
 *   1. Project file tree (string)
 *   2. Per-component starter code stubs (JSX)
 *   3. App.jsx router skeleton
 *   4. Tailwind + Three.js integration notes
 */

// ─── File tree builder ────────────────────────────────────────────────────────

export function buildFileTree(blueprint) {
  const { components, pages } = blueprint
  const lines = ['src/', '├── main.jsx', '├── App.jsx', '├── index.css', '├── core/']

  const coreFiles = ['AIArchitect.js', 'BlueprintGenerator.js', 'VideoScriptGenerator.js', 'CodeGenerator.js']
  coreFiles.forEach((f, i) => {
    lines.push(`│   ${i < coreFiles.length - 1 ? '├' : '└'}── ${f}`)
  })

  lines.push('├── store/', '│   └── blueprintStore.js')
  lines.push('├── hooks/')
  const hooks = ['useAIBuilder.js', 'useScrollAnimation.js', 'useThreeScene.js']
  hooks.forEach((h, i) => lines.push(`│   ${i < hooks.length - 1 ? '├' : '└'}── ${h}`))

  lines.push('├── templates/')
  lines.push('│   ├── blueprintSchema.js')
  lines.push('│   └── sampleBlueprints.js')

  lines.push('├── utils/')
  lines.push('│   ├── colorUtils.js')
  lines.push('│   ├── animationUtils.js')
  lines.push('│   └── exportUtils.js')

  lines.push('├── components/')
  lines.push('│   ├── layout/')
  components.layout.forEach((c, i) => {
    lines.push(`│   │   ${i < components.layout.length - 1 ? '├' : '└'}── ${c}.jsx`)
  })
  lines.push('│   ├── ui/')
  const uiComps = ['GlassCard', 'Button', 'Badge', 'LoadingSpinner', 'PhaseIndicator']
  uiComps.forEach((c, i) => {
    lines.push(`│   │   ${i < uiComps.length - 1 ? '├' : '└'}── ${c}.jsx`)
  })
  lines.push('│   ├── builder/')
  const builderComps = ['PromptInput', 'BlueprintViewer', 'VideoScript', 'CodeOutput']
  builderComps.forEach((c, i) => {
    lines.push(`│   │   ${i < builderComps.length - 1 ? '├' : '└'}── ${c}.jsx`)
  })
  lines.push('│   └── sections/')
  components.sections.forEach((c, i) => {
    lines.push(`│       ${i < components.sections.length - 1 ? '├' : '└'}── ${c}.jsx`)
  })

  lines.push('├── 3d/')
  lines.push('│   ├── scenes/')
  lines.push('│   │   └── HeroScene.jsx')
  lines.push('│   ├── objects/')
  components.threeD
    .filter(c => !['ParticleField', 'CameraRig'].includes(c))
    .forEach((c, i, arr) => lines.push(`│   │   ${i < arr.length - 1 ? '├' : '└'}── ${c}.jsx`))
  lines.push('│   └── effects/')
  lines.push('│       ├── CameraRig.jsx')
  lines.push('│       └── Bloom.jsx')

  lines.push('└── pages/')
  pages.forEach((p, i) => {
    lines.push(`    ${i < pages.length - 1 ? '├' : '└'}── ${p.name}Page.jsx`)
  })

  return lines.join('\n')
}

// ─── Code template generators ─────────────────────────────────────────────────

export function generateAppJSX(blueprint) {
  const { pages, concept } = blueprint
  const imports = pages
    .map(p => `import ${p.name}Page from '@pages/${p.name}Page'`)
    .join('\n')
  const routes = pages
    .map(p => `        <Route path="${p.path}" element={<${p.name}Page />} />`)
    .join('\n')

  return `import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from '@components/layout/Navbar'
import Footer from '@components/layout/Footer'
${imports}

// Generated for: ${concept.websiteName}
// Design Style: ${concept.designStyle}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[${blueprint.palette.background}] text-[${blueprint.palette.text}]">
        <Navbar brandName="${concept.websiteName}" />
        <main>
          <Routes>
${routes}
          </Routes>
        </main>
        <Footer brandName="${concept.websiteName}" />
      </div>
    </BrowserRouter>
  )
}`
}

export function generateSectionComponent(section, palette) {
  const compName = section.name.replace(/\s+/g, '')
  return `import { useRef } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '@components/ui/GlassCard'
import { useScrollAnimation } from '@hooks/useScrollAnimation'

// Section: ${section.name}
// Purpose: ${section.purpose}
// Animation: ${section.animation}
// 3D Object: ${section.threeObject || 'none'}

export default function ${compName}({ data = {} }) {
  const ref = useRef(null)
  const { isVisible } = useScrollAnimation(ref)

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl mx-auto"
      >
        <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mb-6">
          {data.heading || '${section.content?.heading || section.name}'}
        </h2>

        {/* TODO: Add ${section.name} content here */}
      </motion.div>
    </section>
  )
}`
}

export function generateHeroComponent(blueprint) {
  const { concept, palette } = blueprint
  return `import { useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion } from 'framer-motion'
import HeroScene from '@3d/scenes/HeroScene'
import Button from '@components/ui/Button'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* 3D Background Canvas */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={null}>
          <Canvas
            camera={{ position: [0, 0, 5], fov: 60 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
          >
            <HeroScene />
          </Canvas>
        </Suspense>
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: \`radial-gradient(ellipse at center, transparent 30%, ${palette.background} 80%)\`
        }}
      />

      {/* Hero content */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{
              background: 'rgba(61,94,255,0.15)',
              border: '1px solid rgba(61,94,255,0.4)',
              color: '${palette.secondary}',
            }}
          >
            ${concept.brandPersonality[0]} · ${concept.brandPersonality[1]}
          </motion.span>

          <h1 className="font-display text-6xl lg:text-8xl font-extrabold text-white leading-none mb-6">
            ${concept.websiteName}
          </h1>

          <p className="text-xl lg:text-2xl text-white/60 max-w-2xl mb-10">
            ${concept.tagline}
          </p>

          <div className="flex flex-wrap gap-4">
            <Button variant="primary" size="lg">Get Started</Button>
            <Button variant="ghost" size="lg">Watch Demo</Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}`
}

export function generateThreeSceneComponent(blueprint) {
  const mainObj = blueprint.components.threeD.find(
    c => !['ParticleField', 'CameraRig', 'Bloom'].includes(c)
  ) || 'FloatingSphere'

  return `import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Float, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import ParticleField from '@3d/objects/ParticleField'
import CameraRig from '@3d/effects/CameraRig'
import ${mainObj} from '@3d/objects/${mainObj}'

export default function HeroScene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={2} color="${blueprint.palette.secondary}" />
      <pointLight position={[-10, -5, -5]} intensity={1} color="${blueprint.palette.accent}" />
      <spotLight
        position={[0, 20, 0]}
        angle={0.4}
        penumbra={1}
        intensity={3}
        color="${blueprint.palette.primary}"
      />

      {/* Environment */}
      <Stars radius={100} depth={50} count={3000} factor={4} fade speed={1} />

      {/* Main 3D Object */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
        <${mainObj} scale={1.5} />
      </Float>

      {/* Particles */}
      <ParticleField count={1500} color="${blueprint.palette.primary}" />

      {/* Camera */}
      <CameraRig />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          intensity={1.2}
        />
      </EffectComposer>
    </>
  )
}`
}

/**
 * Master code output object — all tabs in the CodeOutput panel.
 */
export function generateAllCode(blueprint) {
  const hero = blueprint.pages[0]?.sections?.find(s => s.id === 'hero')

  return {
    fileTree:    buildFileTree(blueprint),
    appJSX:      generateAppJSX(blueprint),
    heroJSX:     generateHeroComponent(blueprint),
    sceneJSX:    generateThreeSceneComponent(blueprint),
    sampleSection: hero ? generateSectionComponent(hero, blueprint.palette) : '',
    installCmd:  `npm install && npm run dev`,
    envSetup:    `cp .env.example .env\n# Add your ANTHROPIC_API_KEY to .env`,
  }
}

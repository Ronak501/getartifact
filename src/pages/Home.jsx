import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import HeroScene from '@3d/scenes/HeroScene'
import GlassCard from '@components/ui/GlassCard'
import Badge from '@components/ui/Badge'
import { staggerContainer, fadeUp, scaleIn } from '@utils/animationUtils'
import { useScrollAnimation } from '@hooks/useScrollAnimation'


const FEATURES = [
  { icon: '🧠', title: 'AI-Powered Design', desc: 'Advanced AI analyzes your intent and automatically infers the perfect style, palette, and structure.' },
  { icon: '🌐', title: '3D by Default', desc: 'Every generated site includes immersive 3D scenes, particle fields, and real-time visual effects.' },
  { icon: '🎨', title: 'Premium UI Components', desc: 'Production-quality design system with animations, glass cards, and responsive layouts.' },
  { icon: '🎬', title: 'Cinematic Video Preview', desc: 'Auto-generate a full cinematic video walkthrough of your website — no editing required.' },
  { icon: '📦', title: 'Copy-Paste Code', desc: 'Every component generated with proper imports, props, and integrations wired up and ready.' },
  { icon: '🚀', title: 'Modern Tech Stack', desc: 'Built on the latest tools — React 18, Vite, Three.js, GSAP, Framer Motion, and Tailwind CSS.' },
]

export default function Home() {
  const featuresRef = useRef(null)
  const { isVisible: featuresVisible } = useScrollAnimation(featuresRef)

  return (
    <main className="relative overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* 3D Canvas */}
        <div className="absolute inset-0 z-0">
          <Suspense fallback={null}>
            <Canvas
              camera={{ position: [0, 0, 6], fov: 55 }}
              dpr={[1, 1.5]}
              gl={{ antialias: true, alpha: true }}
            >
              <HeroScene />
            </Canvas>
          </Suspense>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-[#0a0a14]" />
        <div className="absolute inset-0 z-10 bg-hero-mesh" />

        {/* Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 pt-28 pb-32">
          <motion.div
            variants={staggerContainer(0.12, 0.1)}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} className="mb-6">
              <Badge color="neon" dot>
                AI-Powered · 3D · Production-Ready
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl text-white leading-[0.92] mb-6"
            >
              Build 3D Websites
              <br />
              <span className="bg-gradient-to-r from-brand-400 via-[#00d4ff] to-[#bf5fff] bg-clip-text text-transparent">
                From Any Prompt
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg lg:text-xl text-white/50 max-w-2xl mb-10 leading-relaxed"
            >
              Describe your vision. The AI Architect generates a complete JSON blueprint,
              cinematic video script, and production-ready React + Three.js code — instantly.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <Link
                to="/builder"
                className="px-8 py-4 rounded-2xl text-base font-semibold text-white
                  bg-brand-500 hover:bg-brand-600
                  shadow-[0_0_30px_rgba(61,94,255,0.5)] hover:shadow-[0_0_50px_rgba(61,94,255,0.7)]
                  transition-all duration-200"
              >
                Open Builder
              </Link>
              <a
                href="#how-it-works"
                className="px-8 py-4 rounded-2xl text-base font-medium text-white/70 hover:text-white
                  bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.2]
                  transition-all duration-200"
              >
                How It Works
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5"
          >
            <span className="w-1 h-1.5 rounded-full bg-white/40" />
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <Badge color="blue" className="mb-4">How It Works</Badge>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-white">
              From Idea to Website
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto mt-4">
              Describe your vision in plain English. Our AI handles the rest.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { num: '01', icon: '✍️', color: '#3d5eff', title: 'Describe Your Idea', desc: 'Type anything — a business, an app, a brand. The AI understands your intent and style preferences.' },
              { num: '02', icon: '🤖', color: '#00d4ff', title: 'AI Designs Everything', desc: 'Layout, colors, typography, 3D elements, animations, sections — every design decision made for you.' },
              { num: '03', icon: '🚀', color: '#00ff88', title: 'Export & Deploy', desc: 'Get production-ready React + Three.js code with a live preview. Copy, deploy, and ship immediately.' },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                <GlassCard hover padding="p-6" glow={step.color} className="h-full">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                    style={{ background: step.color + '22', border: `1px solid ${step.color}44` }}
                  >
                    {step.icon}
                  </div>
                  <p className="font-mono text-2xs mb-1" style={{ color: step.color }}>{step.num}</p>
                  <h3 className="font-display text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section ref={featuresRef} className="py-24 px-6 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={featuresVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-4xl font-bold text-white mb-4">Everything Included</h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              A complete architecture for every generated website — no boilerplate, no glue code.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            animate={featuresVisible ? 'visible' : 'hidden'}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {FEATURES.map(f => (
              <motion.div key={f.title} variants={scaleIn}>
                <GlassCard hover padding="p-6" className="h-full">
                  <span className="text-2xl mb-3 block">{f.icon}</span>
                  <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Pricing Teaser ────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-12"
          >
            <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold mb-4
              bg-white/[0.05] border border-white/[0.1] text-white/50 uppercase tracking-widest">
              Subscription Plans
            </span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mb-4">
              Pick Your AI Engine
            </h2>
            <p className="text-white/40 text-base max-w-xl mx-auto">
              Three models. One platform. Every plan ships full React + Three.js code.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              { icon: '⚡', badge: 'GROQ', name: 'Starter', model: 'Llama 3.3 70B', price: '$9', color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)', stat: '2,600 tok/s' },
              { icon: '💎', badge: 'GEMINI', name: 'Growth', model: 'Gemini 2.5 Flash', price: '$29', color: '#10b981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)', stat: '1M ctx' },
              { icon: '🧠', badge: 'CLAUDE', name: 'Pro', model: 'Claude Sonnet 4.6', price: '$79', color: '#9333ea', bg: 'rgba(147,51,234,0.07)', border: 'rgba(147,51,234,0.2)', stat: '200K ctx' },
            ].map((tier, i) => (
              <motion.div
                key={tier.badge}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                <GlassCard hover padding="p-5" className="h-full"
                  glow={tier.color}>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg
                        text-[10px] font-mono font-semibold tracking-widest"
                      style={{ background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color }}
                    >
                      {tier.icon} {tier.badge}
                    </span>
                    <span className="font-display font-extrabold text-xl text-white">
                      {tier.price}<span className="text-white/30 text-xs font-normal">/mo</span>
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-white text-lg mb-0.5">{tier.name}</h3>
                  <p className="text-white/40 text-xs mb-3">{tier.model}</p>
                  <div className="flex items-center gap-1.5 text-xs font-mono"
                    style={{ color: tier.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: tier.color }} />
                    {tier.stat}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium
                text-white/70 hover:text-white bg-white/[0.05] hover:bg-white/[0.09]
                border border-white/[0.09] hover:border-white/[0.18] transition-all duration-200"
            >
              Compare all plans →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center mx-auto mb-8 text-3xl">
              ⚡
            </div>
            <h2 className="font-display text-5xl font-extrabold text-white mb-6">
              Start with a Prompt
            </h2>
            <p className="text-white/40 text-lg mb-10">
              No templates. No drag-and-drop. Just describe your dream website.
            </p>
            <Link
              to="/builder"
              className="inline-block px-10 py-5 rounded-2xl text-lg font-bold text-white
                bg-brand-500 hover:bg-brand-600
                shadow-[0_0_50px_rgba(61,94,255,0.5)] hover:shadow-[0_0_80px_rgba(61,94,255,0.7)]
                transition-all duration-300 animate-glow"
            >
              Open Builder →
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  )
}

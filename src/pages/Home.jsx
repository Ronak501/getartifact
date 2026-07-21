"use client"

import { Suspense, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from '@lib/router-shim'
import { motion } from 'framer-motion'
import HeroScene from '@3d/scenes/HeroScene'
import { PREBUILT_TEMPLATES } from '@data/prebuiltTemplates'

const FEATURED_IDS = ['vortexgg', 'neuralforge', 'cryptovault', 'luxevilla', 'nftforge', 'pulsegym']
const FEATURED = PREBUILT_TEMPLATES.filter(t => FEATURED_IDS.includes(t.id)).slice(0, 6)

const STEPS = [
  { num: '01', icon: '✍️', color: '#3d5eff', title: 'Describe your idea', desc: 'Type any business, app, or brand in plain English.' },
  { num: '02', icon: '◫', color: '#00d4ff', title: 'Generate in parallel', desc: 'The asset track creates a .glb model while the scene track writes the layout, lighting, and motion.' },
  { num: '03', icon: '↗', color: '#00ff88', title: 'Preview the assembled site', desc: 'The compiler injects the asset into a React Three Fiber project and opens a live sandbox preview.' },
]

const LOGOS = ['Vercel', 'Supabase', 'Stripe', 'Anthropic', 'Google', 'OpenAI']

export default function Home() {
  return (
    <main style={{ background: '#080810', color: '#f0f0ff', overflowX: 'hidden' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '7rem 5% 4rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

        {/* Background gradient orbs */}
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: '600px', height: '600px', background: 'radial-gradient(circle, #3d5eff18 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', right: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, #bf5fff12 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: '2rem' }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem', borderRadius: '50px',
            background: 'rgba(61,94,255,0.1)', border: '1px solid rgba(61,94,255,0.3)',
            color: '#7b9fff', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.05em',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3d5eff', animation: 'pulse 2s infinite' }} />
            Parallel 3D asset + interactive code generation
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            fontWeight: 900,
            lineHeight: 1.04,
            letterSpacing: '-0.03em',
            maxWidth: '860px',
            marginBottom: '1.4rem',
            fontFamily: 'var(--font-display, system-ui)',
          }}
        >
          Build Stunning 3D Websites
          <br />
          <span style={{ background: 'linear-gradient(135deg, #3d5eff 0%, #00d4ff 50%, #bf5fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            with AI in Seconds
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', maxWidth: '480px', lineHeight: 1.7, marginBottom: '2.5rem' }}
        >
          A clean pipeline for turning a product idea into a 3D asset,
          <br />a React scene, and a live preview.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Link to="/builder" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.9rem 2.2rem', borderRadius: '10px',
            background: '#3d5eff', color: '#fff', fontWeight: 700, fontSize: '0.95rem',
            textDecoration: 'none', boxShadow: '0 0 32px rgba(61,94,255,0.45)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#2b4bef'; e.currentTarget.style.boxShadow = '0 0 48px rgba(61,94,255,0.65)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#3d5eff'; e.currentTarget.style.boxShadow = '0 0 32px rgba(61,94,255,0.45)' }}
          >
            Start Building Free →
          </Link>
          <a href="#demo" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.9rem 2.2rem', borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)',
            border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: '0.95rem',
            textDecoration: 'none', backdropFilter: 'blur(8px)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
          >
            ▶ Watch Demo
          </a>
        </motion.div>

        {/* Trusted by logos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 0.9 }}
          style={{ marginTop: '4rem', display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Powered by</span>
          {LOGOS.map(l => (
            <span key={l} style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>{l}</span>
          ))}
        </motion.div>
      </section>

      {/* ── Browser Mockup — Large Interactive 3D Preview ─────────────────── */}
      <section id="demo" style={{ padding: '0 4% 8rem', position: 'relative' }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Glow behind mockup */}
          <div style={{
            position: 'absolute', left: '50%', top: '20%', transform: 'translate(-50%, -50%)',
            width: '80%', height: '60%', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(61,94,255,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Browser frame */}
          <div style={{
            maxWidth: '1100px', margin: '0 auto',
            borderRadius: '16px', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            background: '#0e0e1a',
          }}>
            {/* Browser chrome */}
            <div style={{
              padding: '0.9rem 1.2rem',
              background: '#14141f',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', gap: '0.8rem',
            }}>
              {/* Traffic lights */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#ff5f56', '#ffbd2e', '#27c93f'].map(c => (
                  <div key={c} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c }} />
                ))}
              </div>
              {/* Address bar */}
              <div style={{
                flex: 1, maxWidth: '420px', margin: '0 auto',
                background: 'rgba(255,255,255,0.06)', borderRadius: '6px',
                padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>🔒</span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>getartifact.dev/preview</span>
              </div>
              {/* Spacer for symmetry */}
              <div style={{ width: '60px' }} />
            </div>

            {/* Browser content — generated site mockup + 3D canvas */}
            <div style={{ position: 'relative', height: '580px', background: '#0a0a14', overflow: 'hidden' }}>

              {/* 3D Background scene */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Suspense fallback={null}>
                  <Canvas camera={{ position: [0, 0, 6], fov: 55 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
                    <HeroScene />
                  </Canvas>
                </Suspense>
              </div>

              {/* Dark overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,20,0.4) 0%, rgba(10,10,20,0.85) 100%)', zIndex: 1 }} />

              {/* Simulated website UI on top of 3D */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column' }}>

                {/* Sim navbar */}
                <div style={{
                  padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(12px)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'linear-gradient(135deg, #3d5eff, #bf5fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: 900 }}>N</div>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>NexusAI</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['Product', 'Pricing', 'Docs', 'Blog'].map(l => (
                      <span key={l} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{l}</span>
                    ))}
                  </div>
                  <div style={{ padding: '0.4rem 1rem', background: '#3d5eff', borderRadius: '6px', fontSize: '0.72rem', color: '#fff', fontWeight: 700 }}>Get Started</div>
                </div>

                {/* Sim hero content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 3rem' }}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                  >
                    <span style={{ display: 'inline-block', padding: '0.25rem 0.7rem', borderRadius: '4px', background: 'rgba(61,94,255,0.2)', border: '1px solid rgba(61,94,255,0.4)', color: '#7b9fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>AI Generated · Unique Every Time</span>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 3.2rem)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: '0.8rem' }}>
                      Intelligence That<br />
                      <span style={{ background: 'linear-gradient(135deg, #3d5eff, #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Moves at Light Speed</span>
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '400px', marginBottom: '1.5rem' }}>
                      Deploy AI infrastructure that adapts in real-time. Built for teams who need reliability, speed, and scale without compromise.
                    </p>
                    <div style={{ display: 'flex', gap: '0.7rem' }}>
                      <div style={{ padding: '0.6rem 1.4rem', background: '#3d5eff', borderRadius: '7px', fontSize: '0.78rem', color: '#fff', fontWeight: 700 }}>Start Free Trial</div>
                      <div style={{ padding: '0.6rem 1.4rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '7px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>Watch Demo →</div>
                    </div>
                  </motion.div>
                </div>

                {/* Sim feature strip at bottom */}
                <div style={{
                  padding: '0.8rem 2rem', background: 'rgba(10,10,20,0.7)', backdropFilter: 'blur(12px)',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', gap: '2rem',
                }}>
                  {[
                    { icon: '⚡', label: '< 10ms latency' },
                    { icon: '🔒', label: 'SOC2 Certified' },
                    { icon: '🌍', label: '12 Global Regions' },
                    { icon: '🤖', label: 'AI-Powered' },
                    { icon: '📊', label: 'Real-Time Analytics' },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                      <span>{f.icon}</span> {f.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 5%', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            <p style={{ color: '#3d5eff', fontSize: '0.78rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>How It Works</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>From idea to live site in 3 steps</h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                style={{
                  padding: '2rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'default',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = step.color + '44'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                {/* Corner glow */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: `radial-gradient(circle at 100% 0%, ${step.color}18, transparent)`, pointerEvents: 'none' }} />

                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{step.icon}</div>
                <div style={{ fontSize: '0.72rem', color: step.color, fontFamily: 'monospace', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.1em' }}>{step.num}</div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.6rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Template Gallery ──────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 0', borderTop: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto 3rem', padding: '0 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: '#3d5eff', fontSize: '0.78rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.8rem' }}>Ready-Made Templates</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>Launch instantly</h2>
          </div>
          <Link to="/templates" style={{ color: '#3d5eff', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            Browse all 23 →
          </Link>
        </div>

        {/* Horizontal scroll strip */}
        <div style={{ display: 'flex', gap: '1.2rem', padding: '0 5%', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {FEATURED.map((tpl, i) => (
            <HomeTemplateCard key={tpl.id} tpl={tpl} index={i} />
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section style={{ padding: '8rem 5%', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(61,94,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '1.2rem', lineHeight: 1.05 }}>
            Your next website<br />starts with a prompt.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
            No templates. No drag-and-drop. Just describe your idea.
          </p>
          <Link to="/builder" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '1rem 2.8rem', borderRadius: '12px',
            background: '#3d5eff', color: '#fff', fontWeight: 700, fontSize: '1rem',
            textDecoration: 'none', boxShadow: '0 0 48px rgba(61,94,255,0.5)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#2b4bef'; e.currentTarget.style.boxShadow = '0 0 72px rgba(61,94,255,0.7)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#3d5eff'; e.currentTarget.style.boxShadow = '0 0 48px rgba(61,94,255,0.5)' }}
          >
            Open Builder — It's Free →
          </Link>
        </motion.div>
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  )
}

/* ── Home template card (CSS-based, no WebGL) ─────────────────────────────── */
function HomeTemplateCard({ tpl, index }) {
  const [hovered, setHovered] = useState(false)
  const [c1, c2, c3] = tpl.preview_colors

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.5 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ flexShrink: 0, width: '260px', cursor: 'pointer', transition: 'transform 0.3s' }}
    >
      <Link to="/templates" style={{ textDecoration: 'none' }}>
        <div style={{
          borderRadius: '14px', overflow: 'hidden',
          border: hovered ? `1px solid ${c1}55` : '1px solid rgba(255,255,255,0.08)',
          transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
          boxShadow: hovered ? `0 16px 48px rgba(0,0,0,0.5), 0 0 32px ${c1}22` : '0 4px 16px rgba(0,0,0,0.3)',
          transition: 'all 0.3s',
        }}>
          {/* Preview area with CSS animation */}
          <div style={{
            height: '160px', position: 'relative', overflow: 'hidden',
            background: `linear-gradient(135deg, ${tpl.websiteBlueprint.color_palette.background} 0%, ${c1}22 100%)`,
          }}>
            {/* Animated blobs */}
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '100px', height: '100px', borderRadius: '50%',
              background: c1, opacity: hovered ? 0.45 : 0.25,
              filter: 'blur(30px)', transition: 'opacity 0.3s',
            }} />
            <div style={{
              position: 'absolute', bottom: '-15px', left: '-15px',
              width: '70px', height: '70px', borderRadius: '50%',
              background: c2, opacity: hovered ? 0.35 : 0.18,
              filter: 'blur(24px)', transition: 'opacity 0.3s',
            }} />

            {/* Sim website UI */}
            <div style={{ position: 'absolute', inset: 0, padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Sim navbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: `1px solid ${c1}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: c1 }} />
                  <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 700 }}>{tpl.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['', '', ''].map((_, i) => <div key={i} style={{ width: '20px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }} />)}
                </div>
              </div>
              {/* Sim headline */}
              <div style={{ width: '70%', height: '7px', borderRadius: '3px', background: 'rgba(255,255,255,0.6)' }} />
              <div style={{ width: '50%', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.3)' }} />
              {/* Sim CTA */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                <div style={{ width: '60px', height: '16px', borderRadius: '4px', background: c1 }} />
                <div style={{ width: '50px', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: `1px solid rgba(255,255,255,0.15)` }} />
              </div>
              {/* Sim feature cards */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                {[c1, c2, c3].map((c, i) => (
                  <div key={i} style={{ flex: 1, height: '32px', borderRadius: '5px', background: `${c}18`, border: `1px solid ${c}30` }} />
                ))}
              </div>
            </div>

            {/* Style badge */}
            <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: c1 + '25', border: `1px solid ${c1}40`, color: c1, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              {tpl.design_style}
            </div>
          </div>

          {/* Card info */}
          <div style={{ padding: '0.9rem 1rem', background: '#0f0f1a' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{tpl.name}</span>
              <span style={{ fontSize: '1rem' }}>{tpl.icon}</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, marginBottom: '0.7rem' }}>{tpl.description}</p>
            {/* Color swatches */}
            <div style={{ display: 'flex', gap: '5px' }}>
              {[c1, c2, c3].map((c, i) => (
                <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', background: c, border: '1.5px solid rgba(255,255,255,0.15)' }} />
              ))}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

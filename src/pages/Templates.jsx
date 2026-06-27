/**
 * Templates — Pre-built website template gallery.
 * Click "Use Template" to load it directly into the builder with no AI wait.
 *
 * CSS-only previews (no WebGL canvas) to avoid browser context limits.
 */

"use client"

import { useState } from 'react'
import { useNavigate } from '@lib/router-shim'
import { motion, AnimatePresence } from 'framer-motion'
import { PREBUILT_TEMPLATES, TEMPLATE_INDUSTRIES } from '@data/prebuiltTemplates'
import useBlueprintStore from '@store/blueprintStore'
import GlassCard from '@components/ui/GlassCard'

/* ─── CSS-only template preview (no WebGL) ────────────────────────────────── */
function TemplateCSSPreview({ tpl, hovered }) {
  const [c1, c2, c3] = tpl.preview_colors
  const bg = tpl.websiteBlueprint?.color_palette?.background ?? '#0a0a14'
  const sections = tpl.websiteBlueprint?.sections?.slice(0, 3) ?? []

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: bg,
      overflow: 'hidden',
    }}>
      {/* Animated gradient background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 30% 40%, ${c1}35 0%, transparent 60%),
                     radial-gradient(ellipse at 75% 70%, ${c2}28 0%, transparent 55%),
                     radial-gradient(ellipse at 50% 100%, ${c3 || c1}20 0%, transparent 50%)`,
      }} />

      {/* Floating blobs */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: '55%', height: '70%', borderRadius: '50%',
        background: c1 + '22', filter: 'blur(32px)',
        animation: 'float1 6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '5%',
        width: '40%', height: '55%', borderRadius: '50%',
        background: c2 + '1a', filter: 'blur(24px)',
        animation: 'float2 8s ease-in-out infinite',
      }} />

      {/* Simulated website UI */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        padding: '14px 14px 12px',
        gap: 8,
      }}>
        {/* Fake navbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 8px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: 40, height: 6, borderRadius: 3,
            background: `linear-gradient(90deg, ${c1}, ${c2})`,
          }} />
          <div style={{ display: 'flex', gap: 5 }}>
            {[28, 22, 20].map((w, i) => (
              <div key={i} style={{
                width: w, height: 4, borderRadius: 2,
                background: 'rgba(255,255,255,0.20)',
              }} />
            ))}
          </div>
          <div style={{
            width: 36, height: 16, borderRadius: 4,
            background: `linear-gradient(135deg, ${c1}, ${c3 || c2})`,
            boxShadow: `0 0 8px ${c1}60`,
          }} />
        </div>

        {/* Hero area */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 6,
          padding: '8px 12px',
          position: 'relative',
        }}>
          {/* Glow orb */}
          <div style={{
            position: 'absolute',
            width: 80, height: 80, borderRadius: '50%',
            background: `radial-gradient(circle, ${c1}30, transparent 70%)`,
            filter: 'blur(16px)',
          }} />
          <div style={{
            width: '70%', height: 7, borderRadius: 4,
            background: `linear-gradient(90deg, ${c1}, ${c2})`,
            boxShadow: `0 0 12px ${c1}50`,
          }} />
          <div style={{
            width: '55%', height: 5, borderRadius: 3,
            background: 'rgba(255,255,255,0.18)',
          }} />
          <div style={{
            width: '45%', height: 4, borderRadius: 3,
            background: 'rgba(255,255,255,0.10)',
          }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <div style={{
              width: 46, height: 14, borderRadius: 5,
              background: `linear-gradient(135deg, ${c1}, ${c2})`,
              boxShadow: `0 0 10px ${c1}55`,
            }} />
            <div style={{
              width: 38, height: 14, borderRadius: 5,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
            }} />
          </div>
        </div>

        {/* Section strips */}
        {sections.length > 0 && (
          <div style={{ display: 'flex', gap: 5 }}>
            {sections.map((s, i) => (
              <div key={i} style={{
                flex: 1, height: 20, borderRadius: 5,
                background: i === 0
                  ? `linear-gradient(135deg, ${c1}25, ${c2}20)`
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === 0 ? c1 + '35' : 'rgba(255,255,255,0.07)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: '55%', height: 3, borderRadius: 2,
                  background: i === 0 ? c1 + '90' : 'rgba(255,255,255,0.15)',
                }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hover prompt overlay */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 20,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '16px 20px',
            }}
          >
            <p style={{
              fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)',
              textAlign: 'center', lineHeight: 1.55, fontStyle: 'italic',
            }}>
              "{tpl.prompt}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Keyframe injection (once per page load) ─────────────────────────────── */
const KEYFRAMES = `
  @keyframes float1 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%      { transform: translate(-6px,10px) scale(1.06); }
  }
  @keyframes float2 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%      { transform: translate(8px,-8px) scale(0.94); }
  }
`
if (typeof document !== 'undefined' && !document.getElementById('tpl-kf')) {
  const s = document.createElement('style')
  s.id = 'tpl-kf'
  s.textContent = KEYFRAMES
  document.head.appendChild(s)
}

export default function Templates() {
  const [activeIndustry, setActiveIndustry] = useState('all')
  const [hoveredId, setHoveredId] = useState(null)
  const navigate = useNavigate()

  const filtered = activeIndustry === 'all'
    ? PREBUILT_TEMPLATES
    : PREBUILT_TEMPLATES.filter(t => t.industry === activeIndustry)

  return (
    <main className="min-h-screen bg-[#0a0a14] pt-20 pb-20 px-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
            bg-brand-500/10 border border-brand-500/25 text-brand-400 text-xs font-semibold
            tracking-wide mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Ready-to-use — no AI wait required
          </div>

          <h1 className="font-display font-extrabold text-5xl lg:text-6xl text-white mb-5 leading-tight">
            Pre-Built{' '}
            <span className="bg-gradient-to-r from-[#3d5eff] via-[#00d4ff] to-[#bf5fff]
              bg-clip-text text-transparent">
              Templates
            </span>
          </h1>
          <p className="text-white/45 text-lg max-w-2xl mx-auto leading-relaxed">
            10 unique design systems — each crafted for a specific industry.
            Click <span className="text-white/70 font-medium">Use Template</span> to
            instantly load it into the builder and customise with AI.
          </p>
        </motion.div>

        {/* ── Industry Filter ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.55 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          {TEMPLATE_INDUSTRIES.map(ind => (
            <button
              key={ind.key}
              onClick={() => setActiveIndustry(ind.key)}
              className={`
                px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${activeIndustry === ind.key
                  ? 'bg-brand-500 text-white shadow-[0_0_20px_rgba(61,94,255,0.45)]'
                  : 'bg-white/[0.05] text-white/50 hover:text-white hover:bg-white/[0.09] border border-white/[0.08]'}
              `}
            >
              {ind.label}
            </button>
          ))}
        </motion.div>

        {/* ── Template Grid ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndustry}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filtered.map((tpl, i) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                index={i}
                hovered={hoveredId === tpl.id}
                onHover={setHoveredId}
                navigate={navigate}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-24 text-white/25 text-sm">
            No templates for this industry yet. More coming soon.
          </div>
        )}

        {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 text-center"
        >
          <GlassCard padding="p-10" className="max-w-2xl mx-auto">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="font-display text-2xl font-bold text-white mb-3">
              Don't see your industry?
            </h3>
            <p className="text-white/40 text-sm mb-6 leading-relaxed">
              Describe any business in plain English and the AI will generate a
              completely unique design system — palette, layout, 3D objects, and live preview.
            </p>
            <button
              onClick={() => navigate('/builder')}
              className="px-8 py-3.5 rounded-xl text-sm font-bold text-white
                bg-brand-500 hover:bg-brand-600
                shadow-[0_0_28px_rgba(61,94,255,0.45)]
                transition-all duration-200"
            >
              Generate with AI →
            </button>
          </GlassCard>
        </motion.div>

      </div>
    </main>
  )
}

/* ─── Template card ──────────────────────────────────────────────────────────── */
function TemplateCard({ template: tpl, index, hovered, onHover, navigate }) {
  const { finishGeneration, setPrompt } = useBlueprintStore()

  const useTemplate = () => {
    const blueprint = {
      concept: {
        websiteName:  tpl.name,
        designStyle:  tpl.design_style,
        tagline:      tpl.tagline,
        businessType: tpl.websiteBlueprint.business_type,
      },
      palette: {
        primary:    tpl.websiteBlueprint.color_palette.primary,
        secondary:  tpl.websiteBlueprint.color_palette.secondary,
        accent:     tpl.websiteBlueprint.color_palette.accent,
        background: tpl.websiteBlueprint.color_palette.background,
        text:       tpl.websiteBlueprint.color_palette.text,
      },
      websiteBlueprint: tpl.websiteBlueprint,
      veoData: null,
      generatedCode: null,
    }

    const intent = {
      prompt:      tpl.prompt,
      websiteName: tpl.name,
      style:       tpl.design_style,
      palette:     blueprint.palette,
      pages:       ['Home'],
      threeObjects: ['particle-field'],
      brandPersonality: [tpl.design_style],
    }

    setPrompt(tpl.prompt)
    finishGeneration(blueprint, intent, tpl.websiteBlueprint, null)
    navigate('/builder')
  }

  const [c1, c2, c3] = tpl.preview_colors

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => onHover(tpl.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: hovered ? `1px solid rgba(255,255,255,0.18)` : '1px solid rgba(255,255,255,0.07)',
        background: '#0d0d1a',
        boxShadow: hovered
          ? `0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px ${c1}25, 0 0 40px ${c1}15`
          : '0 4px 24px rgba(0,0,0,0.35)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.28s cubic-bezier(0.22,1,0.36,1)',
      }}>

        {/* CSS-only preview — 220px tall, no WebGL */}
        <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
          <TemplateCSSPreview tpl={tpl} hovered={hovered} />

          {/* Design style badge */}
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 10,
          }}>
            <span style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 6,
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: c1 + '22',
              border: `1px solid ${c1}40`,
              color: c1,
            }}>
              {tpl.design_style}
            </span>
          </div>

          {/* Color palette dots */}
          <div style={{
            position: 'absolute', bottom: 12, right: 12, zIndex: 10,
            display: 'flex', gap: 5,
          }}>
            {tpl.preview_colors.map((col, i) => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: col,
                boxShadow: `0 0 6px ${col}80`,
                border: '1px solid rgba(255,255,255,0.25)',
              }} />
            ))}
          </div>

          {/* Bottom gradient fade into card body */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
            background: 'linear-gradient(to bottom, transparent, #0d0d1a)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Card body */}
        <div style={{ padding: '16px 18px 18px' }}>
          {/* Name + industry badge row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <h3 style={{
              margin: 0, fontSize: '1rem', fontWeight: 700,
              color: '#fff', lineHeight: 1.3,
              fontFamily: 'inherit',
            }}>
              {tpl.name}
            </h3>
            <IndustryBadge industry={tpl.industry} />
          </div>

          {/* Description */}
          <p style={{
            margin: '0 0 12px',
            fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)',
            lineHeight: 1.6,
          }}>
            {tpl.description}
          </p>

          {/* Section type pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
            {tpl.websiteBlueprint.sections.slice(0, 4).map(s => (
              <span key={s.id} style={{
                padding: '2px 8px',
                borderRadius: 5,
                fontSize: '0.62rem', fontWeight: 500,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'rgba(255,255,255,0.38)',
                textTransform: 'capitalize',
              }}>
                {s.type}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={useTemplate}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 10,
                border: 'none',
                fontSize: '0.75rem', fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${c1}, ${c3 || c2})`,
                boxShadow: `0 0 18px ${c1}45`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 28px ${c1}70` }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 18px ${c1}45` }}
            >
              Use Template
            </button>
            <button
              onClick={useTemplate}
              title="Open in builder"
              style={{
                padding: '9px 13px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: '0.8rem', fontWeight: 500,
                color: 'rgba(255,255,255,0.45)',
                background: 'rgba(255,255,255,0.04)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }}
            >
              ↗
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Industry badge ──────────────────────────────────────────────────────── */
const INDUSTRY_META = {
  restaurant: { label: 'Food',      color: '#f97316' },
  gaming:     { label: 'Gaming',    color: '#ff2d78' },
  health:     { label: 'Health',    color: '#0ea5e9' },
  agency:     { label: 'Agency',    color: '#ff6b00' },
  ecommerce:  { label: 'Fashion',   color: '#c9a84c' },
  travel:     { label: 'Travel',    color: '#38bdf8' },
  ai_saas:    { label: 'AI/SaaS',   color: '#00d4ff' },
  music:      { label: 'Music',     color: '#7c3aed' },
  education:  { label: 'EdTech',    color: '#f97316' },
  fintech:    { label: 'FinTech',   color: '#10b981' },
}

function IndustryBadge({ industry }) {
  const m = INDUSTRY_META[industry] ?? { label: industry, color: '#3d5eff' }
  return (
    <span className="flex-shrink-0 px-2 py-0.5 rounded-md text-2xs font-semibold"
      style={{ background: m.color + '18', color: m.color, border: `1px solid ${m.color}30` }}>
      {m.label}
    </span>
  )
}

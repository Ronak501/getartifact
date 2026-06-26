/**
 * Templates — Pre-built website template gallery.
 * Click "Use Template" to load it directly into the builder with no AI wait.
 */

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PREBUILT_TEMPLATES, TEMPLATE_INDUSTRIES } from '@data/prebuiltTemplates'
import useBlueprintStore, { PHASES, OUTPUT_TABS } from '@store/blueprintStore'
import GlassCard from '@components/ui/GlassCard'
import Badge from '@components/ui/Badge'

export default function Templates() {
  const [activeIndustry, setActiveIndustry] = useState('all')
  const [hoveredId, setHoveredId] = useState(null)
  const navigate = useNavigate()

  const filtered = activeIndustry === 'all'
    ? PREBUILT_TEMPLATES
    : PREBUILT_TEMPLATES.filter(t => t.industry === activeIndustry)

  return (
    <main className="min-h-screen bg-[#0a0a14] pt-24 pb-20 px-6">
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
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
    // Build a minimal blueprint object that satisfies the store
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
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      onMouseEnter={() => onHover(tpl.id)}
      onMouseLeave={() => onHover(null)}
      className="group"
    >
      <div className={`
        relative rounded-2xl overflow-hidden border transition-all duration-300
        ${hovered
          ? 'border-white/20 shadow-[0_8px_40px_rgba(0,0,0,0.6)] -translate-y-1'
          : 'border-white/[0.08]'}
        bg-white/[0.03] backdrop-blur-sm
      `}>

        {/* Color preview swatch */}
        <div className="relative h-36 overflow-hidden">
          {/* Gradient background from template palette */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${c1}22 0%, ${tpl.websiteBlueprint.color_palette.background} 60%)`,
            }}
          />
          {/* Blob decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-60 blur-2xl"
              style={{ background: c1 }}
            />
            <div
              className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-40 blur-2xl"
              style={{ background: c2 }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full opacity-20 blur-xl"
              style={{ background: c3 }}
            />
          </div>

          {/* Center icon + color dots */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="text-4xl drop-shadow-lg">{tpl.icon}</span>
            <div className="flex gap-2">
              {tpl.preview_colors.map((col, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full ring-1 ring-white/20"
                  style={{ background: col }}
                />
              ))}
            </div>
          </div>

          {/* Design style badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-lg text-2xs font-semibold"
              style={{
                background: c1 + '25',
                border: `1px solid ${c1}40`,
                color: c1,
              }}>
              {tpl.design_style}
            </span>
          </div>

          {/* Hover overlay with preview prompt */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
              >
                <p className="text-xs text-white/70 text-center px-4 leading-relaxed italic">
                  "{tpl.prompt}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card body */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-display font-bold text-white text-base leading-tight">
              {tpl.name}
            </h3>
            <IndustryBadge industry={tpl.industry} />
          </div>
          <p className="text-2xs text-white/38 leading-relaxed mb-4">
            {tpl.description}
          </p>

          {/* Section count pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tpl.websiteBlueprint.sections.slice(0, 4).map(s => (
              <span key={s.id}
                className="px-2 py-0.5 rounded-md text-2xs font-medium
                  bg-white/[0.05] border border-white/[0.08] text-white/40 capitalize">
                {s.type}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={useTemplate}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white
                transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${c1}, ${c2})`,
                boxShadow: `0 0 20px ${c1}40`,
              }}
            >
              Use Template
            </button>
            <button
              onClick={useTemplate}
              className="px-3 py-2.5 rounded-xl text-xs font-medium text-white/50
                hover:text-white border border-white/[0.10] hover:border-white/[0.20]
                bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200"
              title="Preview in builder"
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

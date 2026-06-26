import { useState } from 'react'
import { motion } from 'framer-motion'
import useBlueprintStore from '@store/blueprintStore'
import GlassCard from '@components/ui/GlassCard'
import Badge from '@components/ui/Badge'
import Button from '@components/ui/Button'
import { exportBlueprintJSON, copyToClipboard } from '@utils/exportUtils'

const SECTIONS = [
  { key: 'concept',     label: 'Concept',    icon: '💡' },
  { key: 'palette',     label: 'Palette',    icon: '🎨' },
  { key: 'typography',  label: 'Typography', icon: '🔤' },
  { key: 'pages',       label: 'Pages',      icon: '📄' },
  { key: 'components',  label: 'Components', icon: '🧩' },
  { key: 'seo',         label: 'SEO',        icon: '🔍' },
]

export default function BlueprintViewer() {
  const { blueprint } = useBlueprintStore()
  const [activeSection, setActiveSection] = useState('concept')
  const [copied, setCopied] = useState(false)

  if (!blueprint) return <EmptyState />

  const handleCopy = async () => {
    await copyToClipboard(JSON.stringify(blueprint, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">{blueprint.concept.websiteName}</h3>
          <Badge color="neon">{blueprint.concept.designStyle}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy JSON'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportBlueprintJSON(blueprint)}>
            Export
          </Button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 flex-wrap flex-shrink-0">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${activeSection === s.key
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}
            `}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="flex-1 overflow-auto">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {activeSection === 'concept'    && <ConceptSection    bp={blueprint} />}
          {activeSection === 'palette'    && <PaletteSection    bp={blueprint} />}
          {activeSection === 'typography' && <TypographySection bp={blueprint} />}
          {activeSection === 'pages'      && <PagesSection      bp={blueprint} />}
          {activeSection === 'components' && <ComponentsSection bp={blueprint} />}
          {activeSection === 'seo'        && <SeoSection        bp={blueprint} />}
        </motion.div>
      </div>
    </div>
  )
}

// ─── Sub-sections ────────────────────────────────────────────────────────────

function ConceptSection({ bp }) {
  const { concept } = bp
  const rows = [
    ['Name',        concept.websiteName],
    ['Tagline',     concept.tagline],
    ['Type',        concept.businessType],
    ['Audience',    concept.targetAudience],
    ['USP',         concept.uniqueSellingProposition],
    ['Style',       concept.designStyle],
    ['Personality', concept.brandPersonality?.join(', ')],
  ]
  return (
    <GlassCard padding="p-5">
      <dl className="grid grid-cols-1 gap-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-2xs text-white/30 uppercase tracking-widest font-medium">{k}</dt>
            <dd className="text-sm text-white/90 mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>
    </GlassCard>
  )
}

function PaletteSection({ bp }) {
  const colors = Object.entries(bp.palette)
  return (
    <GlassCard padding="p-5">
      <div className="grid grid-cols-2 gap-3">
        {colors.map(([key, hex]) => (
          <div key={key} className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl border border-white/10 flex-shrink-0"
              style={{ background: hex }}
            />
            <div>
              <p className="text-2xs text-white/30 uppercase tracking-widest">{key}</p>
              <p className="text-xs text-white/80 font-mono">{hex}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

function TypographySection({ bp }) {
  const { typography } = bp
  return (
    <GlassCard padding="p-5" className="flex flex-col gap-4">
      <div>
        <p className="text-2xs text-white/30 uppercase tracking-widest mb-1">Display Font</p>
        <p className="text-3xl font-bold text-white" style={{ fontFamily: typography.displayFont }}>
          {typography.displayFont}
        </p>
      </div>
      <div>
        <p className="text-2xs text-white/30 uppercase tracking-widest mb-1">Body Font</p>
        <p className="text-lg text-white/80" style={{ fontFamily: typography.bodyFont }}>
          {typography.bodyFont} — The quick brown fox
        </p>
      </div>
      <div>
        <p className="text-2xs text-white/30 uppercase tracking-widest mb-1">Mono Font</p>
        <p className="text-sm text-white/60 font-mono">{typography.monoFont}</p>
      </div>
    </GlassCard>
  )
}

function PagesSection({ bp }) {
  return (
    <div className="flex flex-col gap-3">
      {bp.pages.map(page => (
        <GlassCard key={page.name} padding="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{page.name}</span>
              <Badge color="white">{page.path}</Badge>
            </div>
            <Badge color="blue">{page.sections?.length ?? 0} sections</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {page.sections?.map(s => (
              <div key={s.id} className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07]">
                <p className="text-xs text-white/60">{s.name}</p>
                {s.threeObject && (
                  <p className="text-2xs text-brand-400/70 font-mono">{s.threeObject}</p>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  )
}

function ComponentsSection({ bp }) {
  const categories = [
    { label: 'Layout',    items: bp.components.layout,   color: 'blue' },
    { label: 'Sections',  items: bp.components.sections, color: 'purple' },
    { label: '3D Objects',items: bp.components.threeD,   color: 'neon' },
    { label: 'Pages',     items: bp.components.pages,    color: 'green' },
  ]
  return (
    <div className="grid grid-cols-1 gap-3">
      {categories.map(cat => (
        <GlassCard key={cat.label} padding="p-4">
          <p className="text-2xs text-white/30 uppercase tracking-widest font-medium mb-2">{cat.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {cat.items.map(item => (
              <Badge key={item} color={cat.color}>{item}</Badge>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  )
}

function SeoSection({ bp }) {
  const { seo } = bp
  return (
    <GlassCard padding="p-5" className="flex flex-col gap-4">
      <div>
        <p className="text-2xs text-white/30 uppercase tracking-widest mb-1">Title</p>
        <p className="text-sm text-white">{seo.title}</p>
      </div>
      <div>
        <p className="text-2xs text-white/30 uppercase tracking-widest mb-1">Description</p>
        <p className="text-sm text-white/70">{seo.description}</p>
      </div>
      <div>
        <p className="text-2xs text-white/30 uppercase tracking-widest mb-2">Keywords</p>
        <div className="flex flex-wrap gap-1.5">
          {seo.keywords?.map(k => <Badge key={k} color="white">{k}</Badge>)}
        </div>
      </div>
    </GlassCard>
  )
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-center py-16">
      <div>
        <div className="text-4xl mb-4">📋</div>
        <p className="text-white/50 text-sm">Blueprint will appear here after generation</p>
      </div>
    </div>
  )
}

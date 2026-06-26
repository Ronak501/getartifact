/**
 * CodeAndPreview — split-pane panel showing:
 *   Left  : JSON website blueprint (syntax-highlighted, copyable)
 *   Right : Live rendered website preview (scrollable browser mockup)
 *
 * Has three layout modes: Split | Code only | Preview only
 */

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import useBlueprintStore from '@store/blueprintStore'
import LivePreview  from '@components/preview/LivePreview'
import Button       from '@components/ui/Button'
import Badge        from '@components/ui/Badge'
import { copyToClipboard, exportBlueprintJSON } from '@utils/exportUtils'

const LAYOUT = { SPLIT: 'split', CODE: 'code', PREVIEW: 'preview' }

const CODE_THEME = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'transparent', margin: 0, padding: 0, fontSize: '0.7rem', lineHeight: '1.65',
  },
  'code[class*="language-"]': { ...oneDark['code[class*="language-"]'], background: 'transparent', fontSize: '0.7rem' },
}

export default function CodeAndPreview() {
  const { blueprint } = useBlueprintStore()
  const websiteBlueprint = blueprint?.websiteBlueprint ?? null

  const [layout,  setLayout]  = useState(LAYOUT.SPLIT)
  const [copied,  setCopied]  = useState(false)
  const [jsonTab, setJsonTab] = useState('full')   // 'full' | 'hero' | 'sections' | 'palette'

  if (!blueprint) return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <span className="text-4xl">🖥️</span>
      <p className="text-white/30 text-sm">Generate a website blueprint to see Code & Preview</p>
    </div>
  )

  const previewData = websiteBlueprint ?? buildFallbackPreview(blueprint)

  const handleCopy = async () => {
    await copyToClipboard(JSON.stringify(previewData, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const jsonSnippets = {
    full:     previewData,
    hero:     { hero: previewData.hero, color_palette: previewData.color_palette },
    sections: { sections: previewData.sections },
    palette:  { color_palette: previewData.color_palette, typography: previewData.typography, animations: previewData.animations },
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-3">
        {/* Layout switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.07]">
          {[
            { id: LAYOUT.CODE,    icon: '{ }',  label: 'Code' },
            { id: LAYOUT.SPLIT,   icon: '⬛⬜', label: 'Split' },
            { id: LAYOUT.PREVIEW, icon: '🖥️',  label: 'Preview' },
          ].map(l => (
            <button
              key={l.id}
              onClick={() => setLayout(l.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                layout === l.id ? 'bg-white/[0.10] text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <span className="mr-1">{l.icon}</span>{l.label}
            </button>
          ))}
        </div>

        {/* Info + actions */}
        <div className="flex items-center gap-2">
          {previewData?.website_name && (
            <Badge color="blue">{previewData.website_name}</Badge>
          )}
          {previewData?.design_style && (
            <Badge color="purple">{previewData.design_style}</Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy JSON'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportBlueprintJSON(previewData)}>
            Export
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/[0.08]">
        <div className="h-full flex" style={{ display: 'flex' }}>
          {/* ── Code pane ─────────────────────────────────────────────── */}
          <AnimatePresence>
            {(layout === LAYOUT.CODE || layout === LAYOUT.SPLIT) && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: layout === LAYOUT.CODE ? '100%' : '42%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col overflow-hidden"
                style={{ borderRight: layout === LAYOUT.SPLIT ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
              >
                {/* Code header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] bg-white/[0.02] flex-shrink-0">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/60" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <span className="w-3 h-3 rounded-full bg-green-500/60" />
                    <span className="text-2xs text-white/30 font-mono ml-2">website-blueprint.json</span>
                  </div>
                  {/* JSON section tabs */}
                  <div className="flex gap-1">
                    {[
                      { key: 'full', label: 'Full' },
                      { key: 'palette', label: 'Style' },
                      { key: 'hero', label: 'Hero' },
                      { key: 'sections', label: 'Sections' },
                    ].map(t => (
                      <button
                        key={t.key}
                        onClick={() => setJsonTab(t.key)}
                        className={`px-2 py-0.5 rounded text-2xs transition-colors ${
                          jsonTab === t.key ? 'bg-brand-500/20 text-brand-300' : 'text-white/25 hover:text-white/50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code body */}
                <div className="flex-1 overflow-auto p-3 scrollbar-hidden">
                  <SyntaxHighlighter
                    language="json"
                    style={CODE_THEME}
                    showLineNumbers
                    lineNumberStyle={{ color: 'rgba(255,255,255,0.10)', fontSize: '0.6rem', minWidth: '2rem' }}
                    wrapLines
                  >
                    {JSON.stringify(jsonSnippets[jsonTab], null, 2)}
                  </SyntaxHighlighter>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Preview pane ───────────────────────────────────────────── */}
          <AnimatePresence>
            {(layout === LAYOUT.PREVIEW || layout === LAYOUT.SPLIT) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, flex: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col overflow-hidden"
                style={{ minWidth: 0 }}
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/[0.07] bg-[#0f0f1a] flex-shrink-0">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/60" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <span className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex-1 mx-2">
                    <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1">
                      <span className="text-green-400/60" style={{ fontSize: 9 }}>🔒</span>
                      <span className="text-2xs text-white/30 font-mono">
                        {previewData?.website_name?.toLowerCase().replace(/\s+/g, '') ?? 'preview'}.vercel.app
                      </span>
                    </div>
                  </div>
                  {/* Color swatches */}
                  <div className="flex gap-1.5 items-center">
                    {Object.values(previewData?.color_palette ?? {}).slice(0, 4).map((hex, i) => (
                      <div key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ background: hex }} title={hex} />
                    ))}
                  </div>
                </div>

                {/* Rendered website */}
                <div className="flex-1 overflow-auto scrollbar-hidden bg-[#050508]">
                  <LivePreview blueprint={previewData} scale={layout === LAYOUT.PREVIEW ? 0.82 : 0.68} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between text-2xs text-white/20 flex-shrink-0">
        <span>
          {previewData?.sections?.length ?? 0} sections · {previewData?.navbar?.links?.length ?? 0} nav links
        </span>
        <span className="font-mono">
          {JSON.stringify(previewData).length.toLocaleString()} chars
        </span>
      </div>
    </div>
  )
}

// ─── Build a preview-compatible object from the architecture blueprint ─────────

function buildFallbackPreview(bp) {
  const p = bp.palette ?? {}
  const c = bp.concept ?? {}

  return {
    website_name:  c.websiteName ?? 'Preview',
    business_type: c.businessType ?? 'Technology',
    design_style:  c.designStyle ?? 'Futuristic',
    color_palette: {
      primary:    p.primary    ?? '#3d5eff',
      secondary:  p.secondary  ?? '#00d4ff',
      accent:     p.accent     ?? '#bf5fff',
      background: p.background ?? '#0a0a14',
      text:       p.text       ?? '#f0f0ff',
    },
    typography: {
      heading_font: bp.typography?.displayFont ?? 'Syne',
      body_font:    bp.typography?.bodyFont    ?? 'Inter',
    },
    navbar: {
      logo:  c.websiteName ?? 'Brand',
      links: bp.pages?.map(p => p.name).slice(0, 4) ?? ['Features', 'Pricing', 'About', 'Contact'],
    },
    hero: {
      headline:        c.tagline ?? c.websiteName ?? 'The Future is Now',
      subheadline:     c.uniqueSellingProposition ?? '',
      cta_primary:     'Get Started',
      cta_secondary:   'Watch Demo',
      background_type: 'gradient_mesh',
      animation:       'particle_float',
      three_d_object:  { type: 'neural_network', material: 'glass', animation: 'slow_rotation' },
    },
    sections: bp.pages?.[0]?.sections?.slice(0, 4).map(s => ({
      id:       s.id,
      type:     mapSectionType(s.id),
      title:    s.content?.heading ?? s.name,
      subtitle: s.purpose ?? '',
      content:  generateSectionContent(s.id),
      animation: s.animation ?? 'slide_up',
      three_d_element: { type: '', material: '', animation: '' },
    })) ?? [],
    footer: {
      tagline: c.tagline ?? '',
      text:    `© 2025 ${c.websiteName}. All rights reserved.`,
      links:   ['Privacy', 'Terms', 'Contact'],
    },
    animations: { scroll_effect: 'parallax', page_transition: 'fade', hover_effect: 'scale' },
    three_js: { camera: { position: [0, 0, 5] }, lighting: { type: 'point', intensity: 2 }, objects: [] },
  }
}

function mapSectionType(id) {
  if (id.includes('feature')) return 'features'
  if (id.includes('test'))    return 'testimonials'
  if (id.includes('pric'))    return 'pricing'
  if (id.includes('stat'))    return 'stats'
  if (id.includes('cta'))     return 'cta'
  if (id.includes('faq'))     return 'faq'
  return 'features'
}

function generateSectionContent(id) {
  if (id.includes('stat')) return [
    { value: '50K+', label: 'Users' }, { value: '99.9%', label: 'Uptime' },
    { value: '10B+', label: 'API Calls' }, { value: '<10ms', label: 'Latency' },
  ]
  if (id.includes('cta')) return [{ cta_primary: 'Get Started Free', cta_secondary: 'Learn More' }]
  return [
    { icon: '⚡', title: 'Lightning Fast',      description: 'Built for speed and scale from the ground up.' },
    { icon: '🔒', title: 'Secure by Default',    description: 'End-to-end encryption with zero-trust architecture.' },
    { icon: '🌐', title: 'Global Infrastructure', description: 'Deploy to 32 regions with automatic failover.' },
  ]
}

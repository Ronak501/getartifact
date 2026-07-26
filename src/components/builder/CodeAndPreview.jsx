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

  const basePreview = websiteBlueprint ?? buildFromVeoData(blueprint) ?? buildFallbackPreview(blueprint)
  const previewData = {
    ...basePreview,
    modelAsset: blueprint.modelAsset ?? basePreview.modelAsset ?? null,
    generatedCode: blueprint.generatedCode ?? basePreview.generatedCode ?? null,
    model_url: blueprint.model_url ?? basePreview.model_url ?? null,
  }

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
                <div data-preview-scroll className="flex-1 overflow-auto scrollbar-hidden bg-[#050508]">
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

// ─── Build preview from video-first (veoData) blueprint shape ────────────────

function buildFromVeoData(bp) {
  const veo = bp?.veoData
  if (!veo) return null

  const palette = veo.color_palette ?? []
  const primary   = palette[0] ?? '#6366f1'
  const secondary = palette[1] ?? '#a78bfa'
  const accent    = palette[2] ?? '#f59e0b'
  const bg        = palette[3] ?? '#0a0a0f'

  // Parse typography hint e.g. "Syne / Inter"
  const typoHints = (veo.typography ?? '').split('/')
  const headingFont = typoHints[0]?.trim() || 'Syne'
  const bodyFont    = typoHints[1]?.trim() || 'Inter'

  const businessType = (veo.business_type ?? '').toLowerCase()

  // Industry-specific nav links
  const navLinks =
    /restaurant|food|dining/.test(businessType) ? ['Menu', 'About', 'Reservations', 'Gallery'] :
    /gaming|esport/.test(businessType)           ? ['Games', 'Tournaments', 'Leaderboard', 'Store'] :
    /fashion|luxury/.test(businessType)          ? ['Collections', 'Lookbook', 'About', 'Store'] :
    /fitness|gym/.test(businessType)             ? ['Programs', 'Trainers', 'Schedule', 'Pricing'] :
    /music|event/.test(businessType)             ? ['Shows', 'Artists', 'Music', 'Tickets'] :
    /finance|crypto/.test(businessType)          ? ['Products', 'Markets', 'Dashboard', 'About'] :
    /travel|hotel/.test(businessType)            ? ['Destinations', 'Hotels', 'Experiences', 'Book'] :
                                                   ['Product', 'Pricing', 'Docs', 'Blog']

  // Extract hero headline from the veo_prompt
  const promptText = veo.veo_prompt ?? ''
  const headlineMatch = promptText.match(/headline[^"]*"([^"]{10,60})"/i)
  const headline = headlineMatch?.[1] ?? veo.website_name ?? 'A New Experience'

  return {
    website_name:  veo.website_name ?? 'Brand',
    business_type: veo.business_type ?? 'Platform',
    color_palette: { primary, secondary, accent, background: bg, text: isLightBg(bg) ? '#111' : '#f0f0f0' },
    typography:    { heading_font: headingFont, body_font: bodyFont },
    navbar:        { logo: veo.website_name ?? 'Brand', links: navLinks },
    hero: {
      headline,
      subheadline:  `The future of ${veo.business_type ?? 'your industry'}.`,
      cta_primary:  'Get Started',
      cta_secondary: 'Watch Demo',
      background_type: 'gradient_mesh',
      animation: (veo.motion_effects?.[0] ?? 'particle_float'),
      three_d_object: { type: veo['3d_elements']?.[0] ?? 'floating-sphere', material: 'glass', animation: 'slow_rotation' },
    },
    sections: [
      {
        id: 'features', type: 'features',
        title: `Why ${veo.website_name ?? 'Us'}`,
        subtitle: veo.brand_personality ?? 'Built different.',
        content: generateSectionContent('features', veo.business_type ?? veo.website_name ?? ''),
        animation: 'slide_up',
        three_d_element: { type: '', material: '', animation: '' },
      },
      {
        id: 'stats', type: 'stats',
        title: 'By the Numbers',
        subtitle: '',
        content: generateSectionContent('stats', veo.business_type ?? veo.website_name ?? ''),
        animation: 'count_up',
        three_d_element: { type: '', material: '', animation: '' },
      },
    ],
    footer: {
      tagline: `The future of ${veo.business_type ?? 'everything'}.`,
      text:    `© 2026 ${veo.website_name ?? 'Brand'}. All rights reserved.`,
      links:   ['Privacy', 'Terms', 'Contact'],
    },
  }
}

function isLightBg(hex) {
  const h = (hex ?? '#0a0a14').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
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
      background_type: 'radial',
      animation:       'particle_float',
      three_d_object:  {
        type: bp.pages?.[0]?.sections?.[0]?.threeObject ?? detect3DTypeFromText(bp.meta?.prompt ?? c.websiteName ?? ''),
        material: 'glass',
        animation: 'slow_rotation'
      },
    },
    sections: (bp.pages?.[0]?.sections ?? []).slice(0, 4).map(s => {
      const id = s?.id ?? s?.type ?? s?.name ?? ''
      let extractedContent = null
      if (s?.content) {
        if (Array.isArray(s.content)) {
          extractedContent = s.content
        } else if (typeof s.content === 'object') {
          if (Array.isArray(s.content.features)) extractedContent = s.content.features
          else if (Array.isArray(s.content.items)) extractedContent = s.content.items
          else if (Array.isArray(s.content.testimonials)) extractedContent = s.content.testimonials
          else if (Array.isArray(s.content.stats)) extractedContent = s.content.stats
          else if (s.content.title || s.content.heading || s.content.description) extractedContent = [s.content]
        }
      }
      return {
        id,
        type:     mapSectionType(id),
        title:    s?.content?.heading ?? s?.name ?? '',
        subtitle: s?.purpose ?? '',
        content:  extractedContent || generateSectionContent(id, bp.meta?.prompt ?? c.websiteName ?? ''),
        animation: s?.animation ?? 'slide_up',
        three_d_element: { type: '', material: '', animation: '' },
      }
    }),
    footer: {
      tagline: c.tagline ?? '',
      text:    `© 2026 ${c.websiteName ?? 'Brand'}. All rights reserved.`,
      links:   ['Privacy', 'Terms', 'Contact'],
    },
    animations: { scroll_effect: 'parallax', page_transition: 'fade', hover_effect: 'scale' },
    three_js: { camera: { position: [0, 0, 5] }, lighting: { type: 'point', intensity: 2 }, objects: [] },
  }
}

function detect3DTypeFromText(text) {
  const t = (text ?? '').toLowerCase()
  if (/spider|marvel|hero|comic|avenger|batman|super/i.test(t)) return 'spiderman'
  if (/airpod|earbud|headphone|audio|sound|music|podcast|speaker/i.test(t)) return 'airpods'
  if (/car|auto|racing|vehicle|drive|motor|speed/i.test(t)) return 'car'
  if (/watch|time|chronograph|rolex|timepiece/i.test(t)) return 'watch'
  if (/food|bakery|coffee|restaurant|cake|pizza/i.test(t)) return 'morph'
  if (/crypto|nft|blockchain|web3|token/i.test(t)) return 'crystal'
  if (/gym|fitness|sport|health|workout/i.test(t)) return 'torus'
  if (/space|planet|earth|cosmos|travel/i.test(t)) return 'planet'
  if (/bio|med|doctor|gene|dna|health/i.test(t)) return 'dna'
  if (/hologram|wireframe|cyber|security/i.test(t)) return 'hologram'
  return 'orbital'
}

function mapSectionType(id) {
  const s = (id ?? '').toLowerCase()
  if (s.includes('feature')) return 'features'
  if (s.includes('test'))    return 'testimonials'
  if (s.includes('pric'))    return 'pricing'
  if (s.includes('stat'))    return 'stats'
  if (s.includes('cta'))     return 'cta'
  if (s.includes('faq'))     return 'faq'
  return 'features'
}

function generateSectionContent(id, prompt) {
  const s = (id ?? '').toLowerCase()
  const p = (prompt ?? '').toLowerCase()

  if (s.includes('stat')) {
    if (/food|bakery|coffee|restaurant/i.test(p)) return [
      { value: '15K+', label: 'Happy Guests' }, { value: '100%', label: 'Organic Ingredients' },
      { value: 'Daily', label: 'Fresh Baked' }, { value: '4.9★', label: 'Customer Rating' }
    ]
    if (/crypto|web3|defi/i.test(p)) return [
      { value: '$4.2B', label: 'Value Locked' }, { value: '350K+', label: 'Active Wallets' },
      { value: '0.01s', label: 'Block Speed' }, { value: '$0', label: 'Gas Failures' }
    ]
    return [
      { value: '50K+', label: 'Active Users' }, { value: '99.9%', label: 'Uptime SLA' },
      { value: '10B+', label: 'Operations' }, { value: '<10ms', label: 'Avg Latency' }
    ]
  }
  if (s.includes('cta')) return [{ cta_primary: 'Get Started Now', cta_secondary: 'Learn More' }]

  if (/food|bakery|coffee|restaurant/i.test(p)) return [
    { icon: '☕', title: 'Specialty Roasts', description: 'Ethically sourced beans from organic high-altitude farms.' },
    { icon: '🥐', title: 'Fresh Pastries', description: 'Baked fresh every morning using artisanal recipes.' },
    { icon: '🌿', title: '100% Organic', description: 'No artificial additives, preservatives, or refined sugars.' }
  ]
  if (/crypto|web3|defi/i.test(p)) return [
    { icon: '💎', title: 'Zero-Gas Swaps', description: 'Instant liquidity execution with optimized cryptographic routing.' },
    { icon: '🛡️', title: 'Audited Security', description: 'Multi-sig vault protection verified by top security firms.' },
    { icon: '⚡', title: 'Cross-Chain Bridge', description: 'Seamless asset transfer across 15+ decentralized networks.' }
  ]
  if (/gym|fitness|sport|workout/i.test(p)) return [
    { icon: '🔥', title: 'HIIT Conditioning', description: 'High-intensity sessions designed for maximum metabolic efficiency.' },
    { icon: '💪', title: 'Strength & Power', description: 'Elite lifting coaching and functional hypertrophy training.' },
    { icon: '🧘', title: 'Active Recovery', description: 'Guided mobility, cryotherapy, and deep tissue restoration.' }
  ]

  return [
    { icon: '⚡', title: 'Intelligent Speed', description: 'Engineered for sub-100ms response times and global scale.' },
    { icon: '🔒', title: 'Secure Architecture', description: 'End-to-end encryption with zero-trust security by default.' },
    { icon: '🌐', title: 'Universal Sync', description: 'Connects seamlessly with your existing tools and workflows.' }
  ]
}

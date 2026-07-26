/**
 * LivePreview — renders a website blueprint JSON as a live animated website.
 *
 * Variation engine:
 *  - 4 hero layouts  : split | centered | magazine | minimal
 *  - 6 3D CSS objects: orbital | crystal | neural | dna | particles | planet
 *  - 3 backgrounds   : blobs | radial | editorial
 *  - light/dark theme detection from palette
 */

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Gltf, Float, Center } from '@react-three/drei'
import PreviewSection from './PreviewSection'

/* ─── CSS keyframes ────────────────────────────────────────────────────────── */
const ANIM_CSS = `
@keyframes lp-float  { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-18px) rotate(3deg)} }
@keyframes lp-float2 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
@keyframes lp-spin   { to{transform:rotate(360deg)} }
@keyframes lp-spin-r { to{transform:rotate(-360deg)} }
@keyframes lp-pulse  { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.95;transform:scale(1.14)} }
@keyframes lp-blob   { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%;transform:translate(0,0) scale(1)}
                        50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%;transform:translate(-14px,18px) scale(1.04)} }
@keyframes lp-blob2  { 0%,100%{border-radius:40% 60% 50% 50%/50% 40% 60% 50%;transform:translate(0,0)}
                        50%{border-radius:60% 40% 40% 60%/40% 60% 60% 40%;transform:translate(18px,-12px)} }
@keyframes lp-grid-p { 0%,100%{opacity:.04} 50%{opacity:.10} }
@keyframes lp-shimmer{ 0%{transform:translateX(-200%) skewX(-20deg)} 100%{transform:translateX(200%) skewX(-20deg)} }
@keyframes lp-part   { 0%{opacity:.85;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--ex),var(--ey)) scale(0)} }
@keyframes lp-orbit0 { from{transform:rotate(0deg)   translateX(var(--r)) rotate(0deg)}   to{transform:rotate(360deg)  translateX(var(--r)) rotate(-360deg)} }
@keyframes lp-orbit1 { from{transform:rotate(120deg) translateX(var(--r)) rotate(-120deg)} to{transform:rotate(480deg)  translateX(var(--r)) rotate(-480deg)} }
@keyframes lp-orbit2 { from{transform:rotate(240deg) translateX(var(--r)) rotate(-240deg)} to{transform:rotate(600deg)  translateX(var(--r)) rotate(-600deg)} }
@keyframes lp-ring0  { from{transform:rotateX(72deg) rotateZ(0deg)}  to{transform:rotateX(72deg) rotateZ(360deg)} }
@keyframes lp-ring1  { from{transform:rotateX(72deg) rotateY(60deg)  rotateZ(0deg)}  to{transform:rotateX(72deg) rotateY(60deg) rotateZ(-360deg)} }
@keyframes lp-ring2  { from{transform:rotateX(72deg) rotateY(-60deg) rotateZ(0deg)}  to{transform:rotateX(72deg) rotateY(-60deg) rotateZ(360deg)} }
@keyframes lp-outer  { from{transform:rotateY(0deg) rotateX(12deg)}  to{transform:rotateY(360deg) rotateX(12deg)} }
@keyframes lp-node   { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.25)} }
@keyframes lp-line   { 0%,100%{opacity:.15} 50%{opacity:.55} }
@keyframes lp-dna-a  { from{transform:rotateY(0deg)}   to{transform:rotateY(360deg)} }
@keyframes lp-cryst  { from{transform:rotateY(0deg) rotateX(20deg)} to{transform:rotateY(360deg) rotateX(20deg)} }
@keyframes lp-planet { from{transform:rotateZ(0deg)}   to{transform:rotateZ(360deg)} }
@keyframes lp-twinkle{ 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
@keyframes lp-holo  { 0%,100%{opacity:.6;filter:hue-rotate(0deg)} 50%{opacity:1;filter:hue-rotate(180deg)} }
@keyframes lp-scan  { 0%{top:-10%} 100%{top:110%} }
@keyframes lp-wire  { from{transform:rotateY(0deg) rotateX(25deg)} to{transform:rotateY(360deg) rotateX(25deg)} }
@keyframes lp-morph { 0%,100%{border-radius:60% 40% 50% 50%/40% 60% 50% 60%;transform:rotate(0deg) scale(1)}
                       33%{border-radius:40% 60% 60% 40%/50% 30% 70% 50%;transform:rotate(120deg) scale(1.08)}
                       66%{border-radius:50% 50% 40% 60%/60% 40% 60% 40%;transform:rotate(240deg) scale(0.96)} }
@keyframes lp-rain  { 0%{transform:translateY(-100%);opacity:0} 10%{opacity:.8} 90%{opacity:.6} 100%{transform:translateY(100vh);opacity:0} }
@keyframes lp-vortex{ from{transform:rotateZ(0deg)} to{transform:rotateZ(360deg)} }
`

export function injectLPCss() {
  if (typeof document === 'undefined' || document.getElementById('lp-anim')) return
  const el = document.createElement('style')
  el.id = 'lp-anim'
  el.textContent = ANIM_CSS
  document.head.appendChild(el)
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function isLightColor(hex = '#0a0a14') {
  try {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 140
  } catch { return false }
}

function pickHeroLayout(blueprint) {
  const fullText = JSON.stringify(blueprint || {}).toLowerCase()
  const explicit = (blueprint?.creative_concept?.layout_archetype ?? blueprint?.hero?.layout ?? blueprint?.heroLayout ?? '').toLowerCase()
  if (explicit.includes('mag') || explicit.includes('edit')) return 'magazine'
  if (explicit.includes('cent') || explicit.includes('stack')) return 'centered'
  if (explicit.includes('min') || explicit.includes('clean')) return 'minimal'
  if (explicit.includes('bento') || explicit.includes('grid')) return 'bento'
  if (explicit.includes('cine') || explicit.includes('full') || explicit.includes('immer')) return 'cinematic'
  if (explicit.includes('split')) return 'split'

  if (/magazine|editorial|fashion|vogue|bold|art|creative|studio|agency|trend/i.test(fullText)) return 'magazine'
  if (/bento|grid|saas|dashboard|platform|metric|analytics|cloud|infra|ai tool/i.test(fullText)) return 'bento'
  if (/cinematic|immersive|movie|film|game|gaming|space|vr|ar|metaverse/i.test(fullText)) return 'cinematic'
  if (/center|heroic|monumental|stacked|centered|super|collect|hero|epic|launch/i.test(fullText)) return 'centered'
  if (/minimal|luxury|clean|swiss|scandinavian|architect|watch|time|jewel|wealth|finance/i.test(fullText)) return 'minimal'

  const seed = (blueprint?.website_name || blueprint?.creative_concept?.website_name || blueprint?.meta?.prompt || 'default')
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const layouts = ['split', 'centered', 'magazine', 'minimal', 'bento', 'cinematic']
  return layouts[hash % layouts.length]
}

function pick3DType(blueprint) {
  const fullText = [
    blueprint?.meta?.prompt,
    blueprint?.prompt,
    blueprint?.website_name,
    blueprint?.creative_concept?.website_name,
    blueprint?.business_type,
    blueprint?.hero?.headline,
    blueprint?.hero?.subheadline,
    blueprint?.cinematic_3d_scene?.main_3d_subject,
    blueprint?.hero?.['3d_integration'],
    blueprint?.hero?.three_d_object?.type,
    JSON.stringify(blueprint || {})
  ].filter(Boolean).join(' ').toLowerCase()

  if (/burger|food|pizza|bakery|cake|coffee|restaurant|drink|eat|cafe|kitchen|gourmet|culinary|savor|menu|dining|chef|taste|meal|dish|recipe|cooking|bistro|snack|beverage|wine|brew/i.test(fullText)) return 'food'
  if (/spider|marvel|hero|comic|avenger|batman|super|collectible|action figure/i.test(fullText)) return 'spiderman'
  if (/airpod|earbud|headphone|audio|sound|music|podcast|speaker|acoustic/i.test(fullText)) return 'airpods'
  if (/car|auto|racing|vehicle|drive|motor|speed|tesla|ferrari|porsche/i.test(fullText)) return 'car'
  if (/watch|time|chronograph|rolex|timepiece|luxury/i.test(fullText)) return 'watch'
  if (/shoe|sneaker|nike|adidas|footwear|boot|sandal|jordans/i.test(fullText)) return 'sneaker'
  if (/game|gaming|console|station|esport|controller|ps5|xbox|nintendo|play/i.test(fullText)) return 'gaming'
  if (/crypto|coin|bitcoin|nft|finance|trading|money|bank|wealth|token|blockchain|solana|ethereum/i.test(fullText)) return 'crypto'
  if (/gym|fitness|workout|sport|bodybuilding|train|muscle|yoga|health club/i.test(fullText)) return 'fitness'
  if (/house|estate|building|architect|home|construction|property|realty|condo/i.test(fullText)) return 'realestate'
  if (/robot|cyborg|android|mech|bot|ai agent|artificial intelligence/i.test(fullText)) return 'robot'
  if (/travel|tour|vacation|hotel|resort|flight|trip|journey|destination|adventure|voyage|explore|passport|cruise|tourism/i.test(fullText)) return 'travel'
  if (/fashion|cloth|wear|style|apparel|dress|boutique|vogue|shirt|outfit|beauty|cosmetic|makeup|spa|salon|skin|hair|jewelry/i.test(fullText)) return 'beauty'
  if (/pet|dog|cat|animal|vet|puppy|kitten|hound|paw|bird|aquarium|zoo|wildlife/i.test(fullText)) return 'pet'
  if (/eco|green|solar|energy|plant|nature|tree|forest|leaf|environment|renew|clean energy|sustain|garden|earth/i.test(fullText)) return 'eco'
  if (/edu|school|learn|course|study|book|read|academy|student|teach|tutor|class|college|university|library|knowledge|degree/i.test(fullText)) return 'education'
  if (/law|legal|attorney|lawyer|court|justice|finance|invest|wealth|bank|money|capital|consult|firm|corporate|business|trade|stock/i.test(fullText)) return 'legal'
  if (/crystal|gem|diamond|facet|jewel|sapphire|ruby/i.test(fullText)) return 'crystal'
  if (/neural|network|brain|node|synapse|graph|intelligence|data science/i.test(fullText)) return 'neural'
  if (/dna|helix|cell|bio|protein|gene|molecule|medical|pharma|biotech|doctor/i.test(fullText)) return 'dna'
  if (/particle|dust|cloud|scatter|field|star|cosmos|space|astronomy/i.test(fullText)) return 'particles'
  if (/planet|globe|earth|sphere|world|moon|galaxy|solar|universe/i.test(fullText)) return 'planet'
  if (/torus|knot|twist|ribbon|coil|loop/i.test(fullText)) return 'torus'
  if (/holo|hologram|wireframe|projection|tech|futurist|cyber|metaverse/i.test(fullText)) return 'hologram'
  if (/warp|vortex|tunnel|portal|wormhole|dimension/i.test(fullText)) return 'warp'
  if (/morph|blob|liquid|fluid|plasma|glass|water|ocean/i.test(fullText)) return 'morph'
  if (/matrix|code|rain|cascade|terminal|software|developer|coding|web|app/i.test(fullText)) return 'matrix'
  if (/icosa|polyhedron|prism|geometry/i.test(fullText)) return 'icosa'

  const seed = (blueprint?.website_name || blueprint?.creative_concept?.website_name || blueprint?.meta?.prompt || 'default')
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const choices = ['crystal', 'neural', 'planet', 'torus', 'hologram', 'warp', 'matrix', 'icosa', 'orbital', 'particles', 'dna', 'morph', 'robot', 'travel', 'beauty', 'pet', 'eco', 'education', 'legal']
  return choices[hash % choices.length]
}

function pickBgStyle(blueprint) {
  const style = (
    blueprint.design_system?.ui_style?.background_style ??
    blueprint.creative_concept?.visual_signature ??
    blueprint.design_style ?? ''
  ).toLowerCase()
  if (/editorial|magazine|brutalist|minimal|swiss|clean|white|light/i.test(style)) return 'editorial'
  if (/luxury|elegant|premium|architectural/i.test(style)) return 'radial'
  return 'blobs'
}

/* ─── Root component ──────────────────────────────────────────────────────── */
export default function LivePreview({ blueprint, scale = 0.72 }) {
  useEffect(injectLPCss, [])
  if (!blueprint) return <PreviewEmpty />

  const p = blueprint.design_system?.color_palette ?? blueprint.color_palette ?? {
    background: '#0a0a14', text: '#f0f0ff', primary: '#3d5eff', secondary: '#00d4ff', accent: '#bf5fff',
  }
  const typography  = blueprint.design_system?.typography ?? blueprint.typography
  const websiteName = blueprint.creative_concept?.website_name ?? blueprint.website_name ?? 'Website'
  const hero        = blueprint.hero
  const sections    = blueprint.sections
  const navbar      = blueprint.navbar ?? { logo: websiteName, links: ['Home', 'Features', 'About', 'Contact'] }
  const footer      = blueprint.footer ?? {
    tagline: blueprint.creative_concept?.design_big_idea ?? '',
    text: `© 2026 ${websiteName}. All rights reserved.`,
    links: ['Privacy', 'Terms', 'Contact'],
  }

  const light      = isLightColor(p.background)
  const heroLayout = pickHeroLayout(blueprint)
  const objType    = pick3DType(blueprint)
  const bgStyle    = pickBgStyle(blueprint)
  const modelUrl   = blueprint.modelAsset?.modelUrl ?? blueprint.generatedCode?.modelUrl ?? blueprint.model_url ?? null

  return (
    <div style={{
      background: p.background, color: p.text,
      fontFamily: `${typography?.body_font ?? 'Inter'}, system-ui, sans-serif`,
      minHeight: '100%', overflowX: 'hidden', position: 'relative',
    }}>
      <PreviewNavbar navbar={navbar} palette={p} scale={scale} typography={typography} light={light} />
      <PreviewHero
        hero={hero} palette={p} scale={scale} typography={typography}
        websiteName={websiteName} heroLayout={heroLayout} objType={objType} bgStyle={bgStyle} light={light} modelUrl={modelUrl}
      />
      <PreviewScrollChapter palette={p} scale={scale} objType={objType} websiteName={websiteName} modelUrl={modelUrl} />
      {sections?.map((s, idx) => (
        <PreviewSection key={s.id || `sec-${idx}`} section={s} palette={p} scale={scale} light={light} />
      ))}
      <PreviewFooter footer={footer} palette={p} scale={scale} websiteName={websiteName} light={light} />
    </div>
  )
}

/* ─── Navbar ──────────────────────────────────────────────────────────────── */
function PreviewNavbar({ navbar, palette, scale, typography, light }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      padding: `${14 * scale}px ${32 * scale}px`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: light
        ? palette.background + 'f0'
        : palette.background + 'dd',
      backdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${light ? 'rgba(0,0,0,0.08)' : palette.primary + '28'}`,
      boxShadow: light
        ? '0 1px 0 rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)'
        : `0 1px 0 ${palette.primary}12, 0 4px 30px rgba(0,0,0,0.25)`,
    }}>
      <div style={{
        fontFamily: `${typography?.heading_font ?? 'Syne'}, sans-serif`,
        fontSize: 16 * scale, fontWeight: 800, color: palette.text,
        display: 'flex', alignItems: 'center', gap: 8 * scale,
      }}>
        <div style={{
          width: 30 * scale, height: 30 * scale, borderRadius: 8,
          background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14 * scale, color: '#fff', fontWeight: 900,
          boxShadow: light ? `0 2px 10px ${palette.primary}40` : `0 0 28px ${palette.primary}65`,
        }}>
          {(navbar?.logo ?? 'A')[0]}
        </div>
        {navbar?.logo}
      </div>

      <div style={{ display: 'flex', gap: 22 * scale }}>
        {navbar?.links?.slice(0, 4).map((link, idx) => (
          <span key={link || idx} style={{
            fontSize: 13 * scale, color: palette.text + '80',
            cursor: 'pointer', fontWeight: 500,
          }}>{link}</span>
        ))}
      </div>

      <button style={{
        padding: `${8 * scale}px ${18 * scale}px`, borderRadius: 9,
        fontSize: 12 * scale, fontWeight: 700, border: 'none', cursor: 'pointer',
        background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
        color: '#fff',
        boxShadow: light ? `0 2px 12px ${palette.primary}50` : `0 0 28px ${palette.primary}65`,
      }}>
        Get Started
      </button>
    </nav>
  )
}

/* ─── Hero dispatcher ─────────────────────────────────────────────────────── */
function PreviewHero({ hero, palette, scale, typography, websiteName, heroLayout, objType, bgStyle, light, modelUrl }) {
  const props = { hero, palette, scale, typography, websiteName, objType, bgStyle, light, modelUrl }
  if (heroLayout === 'magazine')  return <HeroMagazine  {...props} />
  if (heroLayout === 'centered')  return <HeroCentered  {...props} />
  if (heroLayout === 'minimal')   return <HeroMinimal   {...props} />
  if (heroLayout === 'bento')     return <HeroBento     {...props} />
  if (heroLayout === 'cinematic') return <HeroCinematic {...props} />
  return <HeroSplit {...props} />
}

/* ─── Hero: Split (text left, 3D right) ──────────────────────────────────── */
function HeroSplit({ hero, palette, scale, typography, websiteName, objType, bgStyle, light, modelUrl }) {
  const ref  = useRef(null)
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })
  const onMove = useCallback(e => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height })
  }, [])
  const px = (mouse.x - 0.5) * 30
  const py = (mouse.y - 0.5) * 20

  return (
    <section ref={ref} onMouseMove={onMove} style={{
      position: 'relative', overflow: 'hidden',
      minHeight: `${520 * scale}px`,
      display: 'flex', alignItems: 'center',
      padding: `${100 * scale}px ${48 * scale}px ${80 * scale}px`,
    }}>
      <HeroBg palette={palette} scale={scale} bgStyle={bgStyle} light={light} />
      <FloatingParticles palette={palette} scale={scale} light={light} />

      {/* Text */}
      <div style={{
        position: 'relative', zIndex: 10, flex: 1, maxWidth: '54%',
        transform: `translate(${px * 0.3}px, ${py * 0.2}px)`,
        transition: 'transform 0.1s ease-out',
      }}>
        <HeroBadge websiteName={websiteName} palette={palette} scale={scale} />
        <HeroHeadline hero={hero} palette={palette} scale={scale} typography={typography} />
        <HeroSub hero={hero} palette={palette} scale={scale} />
        <HeroCTAs hero={hero} palette={palette} scale={scale} />
      </div>

      {/* 3D Object */}
      <motion.div
        initial={{ opacity: 0, scale: 0.65, x: 40 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 0.28, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', flexShrink: 0,
          width: 220 * scale, height: 220 * scale,
          transform: `translate(${-px * 0.5}px, ${-py * 0.4}px)`,
          transition: 'transform 0.1s ease-out',
        }}>
        <GeneratedWebGLScene palette={palette} size={220 * scale} objType={objType} modelUrl={modelUrl} />
      </motion.div>
    </section>
  )
}

/* ─── Hero: Centered (large centered text, 3D above) ─────────────────────── */
function HeroCentered({ hero, palette, scale, typography, websiteName, objType, bgStyle, light, modelUrl }) {
  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      minHeight: `${560 * scale}px`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: `${80 * scale}px ${48 * scale}px ${80 * scale}px`,
      textAlign: 'center',
    }}>
      <HeroBg palette={palette} scale={scale} bgStyle={bgStyle} light={light} />
      <FloatingParticles palette={palette} scale={scale} light={light} />

      {/* 3D object floats above text */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.7 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', zIndex: 10, marginBottom: 24 * scale }}>
        <GeneratedWebGLScene palette={palette} size={160 * scale} objType={objType} modelUrl={modelUrl} />
      </motion.div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 700 * scale }}>
        <HeroBadge websiteName={websiteName} palette={palette} scale={scale} center />
        <HeroHeadline hero={hero} palette={palette} scale={scale} typography={typography} large center />
        <HeroSub hero={hero} palette={palette} scale={scale} center />
        <HeroCTAs hero={hero} palette={palette} scale={scale} center />
      </div>
    </section>
  )
}

/* ─── Hero: Magazine (oversized headline, accent bar) ────────────────────── */
function HeroMagazine({ hero, palette, scale, typography, websiteName, objType, bgStyle, light, modelUrl }) {
  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      minHeight: `${500 * scale}px`,
      padding: `${80 * scale}px ${48 * scale}px ${60 * scale}px`,
    }}>
      {/* Accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 4 * scale,
        background: `linear-gradient(90deg, ${palette.primary}, ${palette.accent}, ${palette.secondary})`,
      }} />

      <HeroBg palette={palette} scale={scale} bgStyle="editorial" light={light} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 40 * scale, position: 'relative', zIndex: 10 }}>
        {/* Left: text block */}
        <div style={{ flex: 1 }}>
          {/* Category label */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            style={{
              fontSize: 10 * scale, fontWeight: 800, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: palette.primary,
              marginBottom: 16 * scale,
              display: 'flex', alignItems: 'center', gap: 8 * scale,
            }}>
            <div style={{ width: 24 * scale, height: 2 * scale, background: palette.primary }} />
            {websiteName}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: `${typography?.heading_font ?? 'Syne'}, sans-serif`,
              fontSize: 52 * scale, fontWeight: 900, lineHeight: 1.0,
              marginBottom: 20 * scale, color: palette.text,
              letterSpacing: '-0.02em',
            }}>
            {hero?.headline}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            style={{
              fontSize: 14 * scale, color: palette.text + '88',
              maxWidth: 440, lineHeight: 1.7, marginBottom: 30 * scale,
              borderLeft: `3px solid ${palette.primary}`,
              paddingLeft: 14 * scale,
            }}>
            {hero?.subheadline}
          </motion.p>

          <HeroCTAs hero={hero} palette={palette} scale={scale} />
        </div>

        {/* Right: 3D object, takes full height */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ flexShrink: 0, alignSelf: 'center' }}>
          <GeneratedWebGLScene palette={palette} size={200 * scale} objType={objType} modelUrl={modelUrl} />
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Hero: Minimal (typography-first, subtle 3D) ────────────────────────── */
function HeroMinimal({ hero, palette, scale, typography, websiteName, objType, bgStyle, light, modelUrl }) {
  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      minHeight: `${480 * scale}px`,
      display: 'flex', alignItems: 'center',
      padding: `${100 * scale}px ${48 * scale}px ${80 * scale}px`,
    }}>
      {/* Clean background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: light
          ? `linear-gradient(135deg, ${palette.background} 60%, ${palette.primary}08 100%)`
          : `linear-gradient(135deg, ${palette.background} 60%, ${palette.primary}10 100%)`,
      }} />
      {/* Subtle rule lines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: light
          ? `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)`
          : `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)`,
        backgroundSize: `100% ${60 * scale}px`,
      }} />

      <div style={{ position: 'relative', zIndex: 10, flex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          style={{
            fontSize: 11 * scale, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: palette.primary,
            marginBottom: 20 * scale,
          }}>
          {websiteName}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: `${typography?.heading_font ?? 'Syne'}, sans-serif`,
            fontSize: 58 * scale, fontWeight: 900, lineHeight: 1.0,
            marginBottom: 24 * scale, color: palette.text,
            letterSpacing: '-0.03em', maxWidth: '70%',
          }}>
          {hero?.headline}
        </motion.h1>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32 * scale }}>
          <div style={{ flex: 1 }}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{
                fontSize: 14 * scale, color: palette.text + '75',
                maxWidth: 400, lineHeight: 1.75, marginBottom: 32 * scale,
              }}>
              {hero?.subheadline}
            </motion.p>
            <HeroCTAs hero={hero} palette={palette} scale={scale} minimal light={light} />
          </div>

          {/* Small 3D accent */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.5, duration: 1 }}
            style={{ flexShrink: 0, alignSelf: 'center', opacity: 0.6 }}>
            <GeneratedWebGLScene palette={palette} size={130 * scale} objType={objType} modelUrl={modelUrl} />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─── Hero: Bento Grid (modern asymmetric bento layout) ──────────────────── */
function HeroBento({ hero, palette, scale, typography, websiteName, objType, bgStyle, light, modelUrl }) {
  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      minHeight: `${600 * scale}px`,
      padding: `${60 * scale}px ${36 * scale}px ${60 * scale}px`,
    }}>
      <HeroBg palette={palette} scale={scale} bgStyle="particles" light={light} />
      
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1100 * scale, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 36 * scale }}>
          <HeroBadge websiteName={websiteName} palette={palette} scale={scale} center />
          <HeroHeadline hero={hero} palette={palette} scale={scale} typography={typography} center />
        </motion.div>

        {/* Bento Grid Container */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 20 * scale,
          alignItems: 'stretch',
        }}>
          {/* Main Left Bento Box: Subheadline + CTAs + Live Stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            style={{
              background: light ? '#ffffffdf' : '#10101edf',
              border: `1px solid ${palette.primary}35`,
              borderRadius: 24 * scale,
              padding: 32 * scale,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              boxShadow: `0 20px 50px ${palette.primary}15`,
              backdropFilter: 'blur(16px)',
            }}>
            <div>
              <div style={{ color: palette.accent, fontSize: 11 * scale, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 * scale, textTransform: 'uppercase' }}>
                ✦ Next-Gen Architecture
              </div>
              <p style={{ fontSize: 16 * scale, color: palette.text + 'cc', lineHeight: 1.6, marginBottom: 28 * scale }}>
                {hero?.subheadline}
              </p>
            </div>
            <div>
              <HeroCTAs hero={hero} palette={palette} scale={scale} />
              <div style={{ display: 'flex', gap: 24 * scale, marginTop: 28 * scale, paddingTop: 20 * scale, borderTop: `1px solid ${palette.primary}20` }}>
                <div>
                  <div style={{ fontSize: 20 * scale, fontWeight: 800, color: palette.text }}>99.9%</div>
                  <div style={{ fontSize: 11 * scale, color: palette.text + '60' }}>Precision Score</div>
                </div>
                <div>
                  <div style={{ fontSize: 20 * scale, fontWeight: 800, color: palette.text }}>4.9 ★</div>
                  <div style={{ fontSize: 11 * scale, color: palette.text + '60' }}>User Rating</div>
                </div>
                <div>
                  <div style={{ fontSize: 20 * scale, fontWeight: 800, color: palette.primary }}>24/7</div>
                  <div style={{ fontSize: 11 * scale, color: palette.text + '60' }}>Active Support</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Bento Box: Dedicated 3D Interactive Canvas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            style={{
              background: `radial-gradient(circle at 50% 50%, ${palette.primary}25, ${light ? '#f5f5fa' : '#080811'})`,
              border: `1px solid ${palette.secondary}40`,
              borderRadius: 24 * scale,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden', minHeight: 340 * scale,
              boxShadow: `0 20px 50px ${palette.secondary}15`,
            }}>
            <div style={{ position: 'absolute', top: 16 * scale, right: 16 * scale, background: palette.primary + '20', border: `1px solid ${palette.primary}50`, padding: `4px ${10 * scale}px`, borderRadius: 12, fontSize: 10 * scale, color: palette.primary, fontWeight: 600 }}>
              🔴 Live WebGL 3D
            </div>
            <GeneratedWebGLScene palette={palette} size={280 * scale} objType={objType} modelUrl={modelUrl} />
            <div style={{ position: 'absolute', bottom: 16 * scale, fontSize: 11 * scale, color: palette.text + '50', letterSpacing: '0.05em' }}>
              ✦ Interactive Orbit & Rotate ✦
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─── Hero: Cinematic Fullstage (immersive backdrop 3D scene + floating glass UI) ─ */
function HeroCinematic({ hero, palette, scale, typography, websiteName, objType, bgStyle, light, modelUrl }) {
  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      minHeight: `${640 * scale}px`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: `${60 * scale}px ${32 * scale}px`,
    }}>
      <HeroBg palette={palette} scale={scale} bgStyle="dark-space" light={light} />
      
      {/* Massive Backdrop 3D Scene */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85, zIndex: 1 }}>
        <GeneratedWebGLScene palette={palette} size={520 * scale} objType={objType} modelUrl={modelUrl} />
      </div>

      {/* Floating Glassmorphism Foreground Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', zIndex: 10,
          background: light ? 'rgba(255, 255, 255, 0.85)' : 'rgba(12, 12, 22, 0.78)',
          border: `1px solid ${palette.primary}50`,
          borderRadius: 32 * scale,
          padding: `${48 * scale}px ${56 * scale}px`,
          maxWidth: 720 * scale,
          textAlign: 'center',
          boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 40px ${palette.primary}25`,
          backdropFilter: 'blur(20px)',
        }}>
        <HeroBadge websiteName={websiteName} palette={palette} scale={scale} center />
        <HeroHeadline hero={hero} palette={palette} scale={scale} typography={typography} center />
        <HeroSub hero={hero} palette={palette} scale={scale} center />
        <HeroCTAs hero={hero} palette={palette} scale={scale} center />
      </motion.div>
    </section>
  )
}

/* ─── Shared hero sub-components ──────────────────────────────────────────── */
function HeroBadge({ websiteName, palette, scale, center }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.08, duration: 0.55 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: `${5 * scale}px ${14 * scale}px`,
        borderRadius: 30, marginBottom: 22 * scale,
        background: palette.primary + '1a',
        border: `1px solid ${palette.primary}42`,
        fontSize: 11 * scale, fontWeight: 600, color: palette.secondary,
        boxShadow: `0 0 22px ${palette.primary}22`,
        ...(center ? { margin: `0 auto ${22 * scale}px`, display: 'inline-flex' } : {}),
      }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: palette.secondary, display: 'inline-block',
        animation: 'lp-pulse 2s ease-in-out infinite',
      }} />
      {websiteName ?? 'New Release'}
    </motion.div>
  )
}

function HeroHeadline({ hero, palette, scale, typography, large, center }) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 34 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{
        fontFamily: `${typography?.heading_font ?? 'Syne'}, sans-serif`,
        fontSize: (large ? 56 : 48) * scale, fontWeight: 900, lineHeight: 1.02,
        marginBottom: 18 * scale, color: palette.text,
        textShadow: `0 0 80px ${palette.primary}38`,
        ...(center ? { textAlign: 'center' } : {}),
      }}>
      {hero?.headline}
    </motion.h1>
  )
}

function HeroSub({ hero, palette, scale, center }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32, duration: 0.7 }}
      style={{
        fontSize: 15 * scale, color: palette.text + 'aa',
        maxWidth: center ? 520 : 460, lineHeight: 1.72, marginBottom: 34 * scale,
        ...(center ? { textAlign: 'center', margin: `0 auto ${34 * scale}px` } : {}),
      }}>
      {hero?.subheadline}
    </motion.p>
  )
}

function HeroCTAs({ hero, palette, scale, center, minimal, light }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.48, duration: 0.65 }}
      style={{
        display: 'flex', gap: 12 * scale, flexWrap: 'wrap',
        ...(center ? { justifyContent: 'center' } : {}),
      }}>
      <button style={{
        padding: `${13 * scale}px ${26 * scale}px`,
        borderRadius: minimal ? 4 : 12,
        fontSize: 14 * scale, fontWeight: 700, cursor: 'pointer', border: 'none',
        background: minimal
          ? palette.primary
          : `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
        color: '#fff',
        boxShadow: minimal
          ? `0 2px 14px ${palette.primary}45`
          : `0 0 42px ${palette.primary}58, 0 6px 22px rgba(0,0,0,0.3)`,
        letterSpacing: minimal ? '0.04em' : 0,
      }}>
        {hero?.primary_cta ?? hero?.cta_primary ?? 'Get Started'}
      </button>

      {(hero?.secondary_cta ?? hero?.cta_secondary) && (
        <button style={{
          padding: `${13 * scale}px ${26 * scale}px`,
          borderRadius: minimal ? 4 : 12,
          fontSize: 14 * scale, fontWeight: 600, cursor: 'pointer',
          background: minimal ? 'transparent' : 'rgba(255,255,255,0.05)',
          color: palette.text,
          border: minimal
            ? `1.5px solid ${light ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)'}`
            : `1px solid ${palette.primary}32`,
          backdropFilter: minimal ? 'none' : 'blur(10px)',
        }}>
          {hero?.secondary_cta ?? hero?.cta_secondary}
        </button>
      )}
    </motion.div>
  )
}

/* ─── Hero Backgrounds ────────────────────────────────────────────────────── */
function HeroBg({ palette, scale, bgStyle, light }) {
  if (bgStyle === 'editorial') {
    return (
      <>
        {/* Clean editorial: just a subtle diagonal tint */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: light
            ? `linear-gradient(135deg, ${palette.background} 55%, ${palette.primary}0c 100%)`
            : `linear-gradient(135deg, ${palette.background} 55%, ${palette.primary}12 100%)`,
        }} />
        {/* Horizontal rule grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: light
            ? `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)`
            : `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: `100% ${48 * scale}px`,
        }} />
      </>
    )
  }

  if (bgStyle === 'radial') {
    return (
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: light
          ? `radial-gradient(ellipse at 40% 50%, ${palette.primary}12 0%, transparent 65%)`
          : `radial-gradient(ellipse at 40% 50%, ${palette.primary}22 0%, transparent 65%)`,
      }} />
    )
  }

  // blobs (default dark theme)
  return (
    <>
      <div style={{
        position: 'absolute', top: '8%', left: '18%',
        width: 360 * scale, height: 360 * scale,
        background: palette.primary + '18', filter: `blur(${68 * scale}px)`,
        borderRadius: '50%', animation: 'lp-blob 9s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '25%', right: '8%',
        width: 270 * scale, height: 270 * scale,
        background: palette.accent + '14', filter: `blur(${54 * scale}px)`,
        borderRadius: '50%', animation: 'lp-blob2 12s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-5%', left: '45%',
        width: 190 * scale, height: 190 * scale,
        background: palette.secondary + '10', filter: `blur(${42 * scale}px)`,
        borderRadius: '50%', animation: 'lp-blob 15s ease-in-out infinite reverse',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)
        `,
        backgroundSize: `${42 * scale}px ${42 * scale}px`,
        animation: 'lp-grid-p 5s ease-in-out infinite',
        maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
      }} />
    </>
  )
}

/* ─── 3D Scene dispatcher ─────────────────────────────────────────────────── */
function GeneratedWebGLScene({ palette, size, objType, modelUrl }) {
  return (
    <div style={{ width: size, height: size, filter: `drop-shadow(0 0 ${size * 0.12}px ${palette.primary}88)` }}>
      <Canvas camera={{ position: [0, 0, 5.4], fov: 46 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <pointLight position={[4, 4, 5]} intensity={25} color={palette.primary} />
        <pointLight position={[-4, -2, 3]} intensity={18} color={palette.secondary} />
        <pointLight position={[0, -4, 2]} intensity={12} color={palette.accent} />
        {modelUrl ? (
          <Suspense fallback={<GeneratedWebGLObject palette={palette} objType={objType} />}>
            <ExternalGLTFModel url={modelUrl} />
          </Suspense>
        ) : (
          <GeneratedWebGLObject palette={palette} objType={objType} />
        )}
      </Canvas>
    </div>
  )
}

function ExternalGLTFModel({ url }) {
  const groupRef = useRef(null)
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.35
    }
  })
  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <Center>
        <group ref={groupRef} scale={1.8}>
          <Gltf src={url} />
        </group>
      </Center>
    </Float>
  )
}

function GeneratedWebGLObject({ palette, objType }) {
  const groupRef = useRef(null)
  const orbitRef = useRef(null)

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.38 + pointer.x * 0.35
      groupRef.current.rotation.x = Math.sin(t * 0.55) * 0.18 + pointer.y * 0.18
      groupRef.current.position.y = Math.sin(t * 1.1) * 0.18
    }
    if (orbitRef.current) orbitRef.current.rotation.z = -t * 0.55
  })

  // ── 1. AirPods / Headphone / Audio Capsule ────────────────────────────────
  if (objType === 'airpods' || objType === 'audio') {
    return (
      <group ref={groupRef}>
        {/* Main Earbud Head */}
        <mesh position={[0, 0.4, 0]} rotation={[0.2, 0, 0]}>
          <sphereGeometry args={[0.7, 32, 32]} />
          <meshPhysicalMaterial color="#ffffff" metalness={0.9} roughness={0.15} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
        {/* Earbud Stem */}
        <mesh position={[0, -0.5, 0.1]} rotation={[0.1, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.22, 1.4, 32]} />
          <meshPhysicalMaterial color="#f0f0f5" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Speaker Acoustic Mesh Dark Core */}
        <mesh position={[0, 0.5, 0.65]} rotation={[1.3, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 32]} />
          <meshStandardMaterial color="#111111" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Pulsating Audio Equalizer Rings */}
        {[1.3, 1.8, 2.3].map((radius, idx) => (
          <mesh key={idx} rotation={[1.5, 0, 0]} ref={idx === 0 ? orbitRef : null}>
            <torusGeometry args={[radius, 0.03, 16, 64]} />
            <meshStandardMaterial color={idx === 0 ? palette.primary : idx === 1 ? palette.secondary : palette.accent} emissive={idx === 0 ? palette.primary : palette.accent} emissiveIntensity={2} transparent opacity={0.7 - idx * 0.2} />
          </mesh>
        ))}
      </group>
    )
  }

  // ── 2. Spiderman / Superhero Web Orb ──────────────────────────────────────
  if (objType === 'spiderman' || objType === 'superhero') {
    return (
      <group ref={groupRef}>
        {/* Crimson Core Orb */}
        <mesh scale={1.2}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshPhysicalMaterial color="#e60026" emissive="#750012" emissiveIntensity={0.6} metalness={0.6} roughness={0.2} clearcoat={1} />
        </mesh>
        {/* Cobalt Blue Spider-Web Lattice Wireframe */}
        <mesh scale={1.28}>
          <dodecahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color="#0055ff" emissive="#0088ff" emissiveIntensity={2.5} wireframe transparent opacity={0.9} />
        </mesh>
        {/* Outer Cyber Web Rings */}
        <mesh rotation={[0.7, 0.3, 0]} scale={1.6}>
          <torusGeometry args={[1, 0.02, 16, 64]} />
          <meshStandardMaterial color="#ff003c" emissive="#ff003c" emissiveIntensity={3} />
        </mesh>
        <group ref={orbitRef}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => {
            const angle = (idx / 8) * Math.PI * 2
            return (
              <mesh key={idx} position={[Math.cos(angle) * 1.8, Math.sin(angle) * 1.8, (idx % 2 ? 0.4 : -0.4)]}>
                <octahedronGeometry args={[0.15, 0]} />
                <meshStandardMaterial color={idx % 2 ? "#e60026" : "#0088ff"} emissive={idx % 2 ? "#e60026" : "#0088ff"} emissiveIntensity={3} />
              </mesh>
            )
          })}
        </group>
      </group>
    )
  }

  // ── 3. Cyber Automotive / Car Chassis ─────────────────────────────────────
  if (objType === 'car' || objType === 'racing') {
    return (
      <group ref={groupRef}>
        {/* Main Aerodynamic Chassis */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[2.2, 0.5, 1.1]} />
          <meshPhysicalMaterial color={palette.primary} metalness={0.9} roughness={0.1} clearcoat={1} />
        </mesh>
        {/* Glass Cockpit Canopy */}
        <mesh position={[0.1, 0.55, 0]}>
          <boxGeometry args={[1.2, 0.35, 0.85]} />
          <meshPhysicalMaterial color="#111122" transmission={0.6} opacity={0.8} transparent roughness={0.1} />
        </mesh>
        {/* 4 Neon Glowing Wheels */}
        {[[-0.75, -0.15, 0.55], [0.75, -0.15, 0.55], [-0.75, -0.15, -0.55], [0.75, -0.15, -0.55]].map((pos, idx) => (
          <mesh key={idx} position={pos} rotation={[1.57, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.25, 32]} />
            <meshStandardMaterial color="#111" metalness={0.8} roughness={0.5} />
            <mesh position={[0, 0, 0]}>
              <torusGeometry args={[0.25, 0.04, 16, 32]} />
              <meshStandardMaterial color={palette.secondary} emissive={palette.secondary} emissiveIntensity={3} />
            </mesh>
          </mesh>
        ))}
      </group>
    )
  }

  // ── 4. Luxury Chronometer / Watch Dial ────────────────────────────────────
  if (objType === 'watch' || objType === 'timepiece') {
    return (
      <group ref={groupRef}>
        {/* Outer Bezel Ring */}
        <mesh rotation={[1.57, 0, 0]}>
          <cylinderGeometry args={[1.4, 1.4, 0.2, 64]} />
          <meshPhysicalMaterial color="#e5c158" metalness={0.95} roughness={0.1} />
        </mesh>
        {/* Dial Face */}
        <mesh position={[0, 0, 0.1]} rotation={[1.57, 0, 0]}>
          <cylinderGeometry args={[1.25, 1.25, 0.05, 64]} />
          <meshStandardMaterial color="#0b0b12" roughness={0.8} />
        </mesh>
        {/* Rotating Internal Gears */}
        <group ref={orbitRef} position={[0, 0, 0.15]}>
          <mesh rotation={[0, 0, 0.5]}>
            <torusGeometry args={[0.7, 0.05, 16, 6]} />
            <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={1.5} wireframe />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.08, 1.1, 0.04]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
          </mesh>
        </group>
      </group>
    )
  }

  // ── 5. Gourmet Burger / Food Stack ────────────────────────────────────────
  if (objType === 'food' || objType === 'burger') {
    return (
      <group ref={groupRef}>
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.9, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#d98c3a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.35, 0]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.95, 0.9, 0.1, 16]} />
          <meshStandardMaterial color="#4caf50" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 0.15, 32]} />
          <meshStandardMaterial color="#e53935" roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.05, 0]} rotation={[0, 0.8, 0]}>
          <boxGeometry args={[1.3, 0.08, 1.3]} />
          <meshStandardMaterial color="#ffd54f" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 0.28, 32]} />
          <meshStandardMaterial color="#5d4037" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.55, 0]}>
          <cylinderGeometry args={[0.85, 0.75, 0.3, 32]} />
          <meshStandardMaterial color="#d98c3a" roughness={0.6} />
        </mesh>
        <group ref={orbitRef}>
          {[0, 1, 2, 3].map((idx) => (
            <mesh key={idx} position={[Math.cos(idx * 1.5) * 1.5, Math.sin(idx) * 0.8, Math.sin(idx * 1.5) * 1.5]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={2} />
            </mesh>
          ))}
        </group>
      </group>
    )
  }

  // ── 6. Futuristic Cyber Console / Laptop / PC ─────────────────────────────
  if (objType === 'gaming' || objType === 'game') {
    return (
      <group ref={groupRef}>
        <mesh position={[0, -0.3, 0]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[2.2, 0.25, 1.4]} />
          <meshPhysicalMaterial color="#14141c" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.5, -0.5]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[2.0, 1.2, 0.08]} />
          <meshStandardMaterial color="#0a0a14" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.5, -0.45]} rotation={[-0.2, 0, 0]}>
          <planeGeometry args={[1.8, 1.0]} />
          <meshStandardMaterial color={palette.primary} emissive={palette.primary} emissiveIntensity={2.5} />
        </mesh>
        <mesh rotation={[1.2, 0.5, 0]} ref={orbitRef}>
          <torusGeometry args={[1.6, 0.04, 16, 64]} />
          <meshStandardMaterial color={palette.secondary} emissive={palette.secondary} emissiveIntensity={3} />
        </mesh>
      </group>
    )
  }

  // ── 7. Crypto Token / Wealth Ring ─────────────────────────────────────────
  if (objType === 'crypto' || objType === 'finance') {
    return (
      <group ref={groupRef}>
        <mesh rotation={[1.57, 0, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.18, 64]} />
          <meshPhysicalMaterial color="#f7931a" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0, 0.1]} rotation={[1.57, 0, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 0.05, 6]} />
          <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={1.5} />
        </mesh>
        <group ref={orbitRef}>
          {[1.5, 1.8].map((r, idx) => (
            <mesh key={idx} rotation={[idx, idx * 0.5, 0]}>
              <torusGeometry args={[r, 0.03, 16, 64]} />
              <meshStandardMaterial color={palette.secondary} emissive={palette.secondary} emissiveIntensity={2} />
            </mesh>
          ))}
        </group>
      </group>
    )
  }

  // ── 8. Architectural Skyscraper / Real Estate Pyramid ─────────────────────
  if (objType === 'realestate' || objType === 'house') {
    return (
      <group ref={groupRef}>
        {[-0.5, 0, 0.5].map((x, idx) => (
          <mesh key={idx} position={[x * 0.8, (idx - 1) * 0.3, 0]}>
            <boxGeometry args={[0.6, 2.2 + idx * 0.5, 0.6]} />
            <meshPhysicalMaterial color={idx === 1 ? palette.primary : '#222230'} metalness={0.8} roughness={0.2} transmission={idx === 1 ? 0.4 : 0} />
          </mesh>
        ))}
        <mesh rotation={[1.5, 0, 0]} ref={orbitRef}>
          <torusGeometry args={[1.7, 0.03, 16, 64]} />
          <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={2} />
        </mesh>
      </group>
    )
  }

  // ── 9. Fitness Dumbbell / Power Core ──────────────────────────────────────
  if (objType === 'fitness' || objType === 'gym') {
    return (
      <group ref={groupRef} rotation={[0, 0, 0.7]}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 2.2, 32]} />
          <meshPhysicalMaterial color="#cccccc" metalness={0.9} roughness={0.2} />
        </mesh>
        {[-0.8, -0.6, 0.6, 0.8].map((y, idx) => (
          <mesh key={idx} position={[0, y, 0]}>
            <cylinderGeometry args={[0.75, 0.75, 0.18, 32]} />
            <meshStandardMaterial color="#111118" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
        <mesh ref={orbitRef}>
          <torusGeometry args={[1.5, 0.04, 16, 64]} />
          <meshStandardMaterial color={palette.primary} emissive={palette.primary} emissiveIntensity={3} />
        </mesh>
      </group>
    )
  }

  // ── 10. Robot / AI Agent / Cyborg Core ────────────────────────────────────
  if (objType === 'robot' || objType === 'ai') {
    return (
      <group ref={groupRef}>
        <mesh scale={1.1}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshPhysicalMaterial color="#1e1e2f" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh scale={1.15} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[1.05, 1.05, 0.3, 32]} />
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2.5} transparent opacity={0.8} />
        </mesh>
        <group ref={orbitRef}>
          {[-1.4, 1.4].map((x, idx) => (
            <mesh key={idx} position={[x, 0, 0]}>
              <boxGeometry args={[0.3, 0.6, 0.3]} />
              <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={2} />
            </mesh>
          ))}
        </group>
      </group>
    )
  }

  // ── 11. Travel / Flight / Destination Globe ───────────────────────────────
  if (objType === 'travel' || objType === 'explore') {
    return (
      <group ref={groupRef}>
        <mesh scale={1.25}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshPhysicalMaterial color="#0066cc" metalness={0.4} roughness={0.6} clearcoat={0.5} />
        </mesh>
        <mesh scale={1.26}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color="#44ff88" wireframe transparent opacity={0.4} />
        </mesh>
        <group ref={orbitRef}>
          <mesh position={[1.8, 0.4, 0]} rotation={[0, 0, -0.4]}>
            <coneGeometry args={[0.2, 0.6, 4]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
          </mesh>
        </group>
      </group>
    )
  }

  // ── 12. Beauty / Fashion / Luxury Diamond ─────────────────────────────────
  if (objType === 'beauty' || objType === 'fashion' || objType === 'crystal') {
    return (
      <group ref={groupRef}>
        <mesh scale={1.3}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial color="#ff66cc" metalness={0.1} roughness={0.05} transmission={0.9} transparent opacity={0.85} ior={1.8} />
        </mesh>
        <group ref={orbitRef}>
          {[0, 1, 2, 3].map(i => {
            const a = (i / 4) * Math.PI * 2
            return <mesh key={i} position={[Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0]} scale={0.15}>
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffddff" emissiveIntensity={3} />
            </mesh>
          })}
        </group>
      </group>
    )
  }

  // ── 13. Pet / Animal Trophy ───────────────────────────────────────────────
  if (objType === 'pet' || objType === 'animal') {
    return (
      <group ref={groupRef}>
        <mesh scale={0.8}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color={palette.primary} emissive={palette.primary} emissiveIntensity={0.8} />
        </mesh>
        {[-0.6, 0, 0.6].map((x, idx) => (
          <mesh key={idx} position={[x, 0.9, idx === 1 ? 0.3 : 0]} scale={0.35}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={1.5} />
          </mesh>
        ))}
        <mesh rotation={[1.5, 0, 0]} ref={orbitRef}>
          <torusGeometry args={[1.6, 0.04, 16, 64]} />
          <meshStandardMaterial color={palette.secondary} emissive={palette.secondary} emissiveIntensity={2} />
        </mesh>
      </group>
    )
  }

  // ── 14. Eco / Green Energy / Solar Sphere ─────────────────────────────────
  if (objType === 'eco' || objType === 'green') {
    return (
      <group ref={groupRef}>
        <mesh scale={[1.4, 1.8, 0.4]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshPhysicalMaterial color="#00cc44" metalness={0.2} roughness={0.3} transmission={0.6} transparent opacity={0.9} />
        </mesh>
        <group ref={orbitRef}>
          {[1.6, 2.0].map((r, idx) => (
            <mesh key={idx} rotation={[idx * 0.8, idx, 0]}>
              <torusGeometry args={[r, 0.03, 16, 64]} />
              <meshStandardMaterial color="#88ff00" emissive="#88ff00" emissiveIntensity={2.5} />
            </mesh>
          ))}
        </group>
      </group>
    )
  }

  // ── 15. Education / Book / Wisdom Pillar ──────────────────────────────────
  if (objType === 'education' || objType === 'learn') {
    return (
      <group ref={groupRef}>
        <mesh rotation={[0.3, 0.5, 0]}>
          <boxGeometry args={[1.8, 1.3, 0.3]} />
          <meshPhysicalMaterial color="#225588" metalness={0.5} roughness={0.2} />
        </mesh>
        <mesh rotation={[0.3, 0.5, 0]} position={[0, 0, 0.17]}>
          <boxGeometry args={[1.7, 1.2, 0.05]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
        </mesh>
        <group ref={orbitRef}>
          {[0, 1, 2].map(i => {
            const a = (i / 3) * Math.PI * 2
            return <mesh key={i} position={[Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0]} scale={0.18}>
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={3} />
            </mesh>
          })}
        </group>
      </group>
    )
  }

  // ── 16. Legal / Law / Business Monolith ───────────────────────────────────
  if (objType === 'legal' || objType === 'business') {
    return (
      <group ref={groupRef}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.7, 0.9, 2.6, 8]} />
          <meshPhysicalMaterial color="#d4af37" metalness={0.95} roughness={0.15} />
        </mesh>
        <group ref={orbitRef}>
          {[-1.2, 1.2].map((x, idx) => (
            <mesh key={idx} position={[x, 0, 0]} rotation={[1.57, 0, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.08, 32]} />
              <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={2} />
            </mesh>
          ))}
        </group>
      </group>
    )
  }

  // ── 17. Hyperspace Warp / Vortex / Hologram Portal ────────────────────────
  if (objType === 'warp' || objType === 'hologram' || objType === 'portal') {
    return (
      <group ref={groupRef}>
        {[1.8, 1.4, 1.0, 0.6].map((r, idx) => (
          <mesh key={idx} rotation={[0, 0, idx * 0.4]} position={[0, 0, (idx - 1.5) * 0.4]}>
            <torusGeometry args={[r, 0.05, 16, 64]} />
            <meshStandardMaterial color={idx % 2 ? palette.primary : palette.accent} emissive={idx % 2 ? palette.primary : palette.accent} emissiveIntensity={2.5} />
          </mesh>
        ))}
        <mesh scale={0.4}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3} />
        </mesh>
      </group>
    )
  }

  // ── 18. Matrix / Cyber Code Cube / Neural Network ─────────────────────────
  if (objType === 'matrix' || objType === 'neural' || objType === 'icosa') {
    return (
      <group ref={groupRef}>
        <mesh scale={1.3}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#00ff66" wireframe emissive="#00ff66" emissiveIntensity={2} />
        </mesh>
        <mesh scale={0.9}>
          <icosahedronGeometry args={[1, 1]} />
          <meshPhysicalMaterial color="#051505" metalness={0.8} roughness={0.2} transmission={0.5} />
        </mesh>
        <group ref={orbitRef}>
          {[0, 1, 2, 3].map(i => {
            const a = (i / 4) * Math.PI * 2
            return <mesh key={i} position={[Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0]} scale={0.12}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#00ff66" emissive="#00ff66" emissiveIntensity={3} />
            </mesh>
          })}
        </group>
      </group>
    )
  }

  // ── 19. Cosmic Planet / DNA / Gyroscope Atom (Universal Dyson Sphere) ─────
  const isPlanet = objType === 'planet' || objType === 'particles'
  const isDna = objType === 'dna'

  return (
    <group ref={groupRef}>
      {/* Central Plasma Sphere */}
      <mesh scale={isPlanet ? 1.4 : 1.1}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial color={palette.primary} emissive={palette.primary} emissiveIntensity={0.8} metalness={0.7} roughness={0.15} transmission={0.4} transparent opacity={0.92} wireframe={isDna} />
      </mesh>
      {/* Intersecting Gyroscope Rings */}
      <mesh rotation={[0.5, 0.2, 0]} scale={isPlanet ? 1.75 : 1.45}>
        <torusGeometry args={[1, 0.04, 16, 96]} />
        <meshStandardMaterial color={palette.secondary} emissive={palette.secondary} emissiveIntensity={2.2} />
      </mesh>
      <mesh rotation={[-0.5, 1.2, 0]} scale={isPlanet ? 1.95 : 1.65}>
        <torusGeometry args={[1, 0.03, 16, 96]} />
        <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={2.5} />
      </mesh>
      {/* Orbiting Beacons */}
      <group ref={orbitRef}>
        {[0, 1, 2, 3, 4, 5].map(index => {
          const angle = (index / 6) * Math.PI * 2
          return <mesh key={index} position={[Math.cos(angle) * 1.8, Math.sin(angle) * 1.8, Math.sin(angle * 2) * 0.5]} scale={0.1}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color={index % 2 ? palette.accent : "#ffffff"} emissive={index % 2 ? palette.accent : "#ffffff"} emissiveIntensity={3} />
          </mesh>
        })}
      </group>
    </group>
  )
}

function ScrollDrivenWebGLScene({ palette, size, objType, modelUrl }) {
  const hostRef = useRef(null)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const scroller = hostRef.current?.closest('[data-preview-scroll]')
    if (!scroller) return undefined
    const update = () => setProgress(scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight))
    update()
    scroller.addEventListener('scroll', update, { passive: true })
    return () => scroller.removeEventListener('scroll', update)
  }, [])
  return (
    <div ref={hostRef} style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 5.4], fov: 46 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <pointLight position={[4, 4, 5]} intensity={25} color={palette.primary} />
        <pointLight position={[-4, -2, 3]} intensity={18} color={palette.secondary} />
        <pointLight position={[0, -4, 2]} intensity={12} color={palette.accent} />
        {modelUrl ? (
          <Suspense fallback={<ScrollReactiveObject palette={palette} objType={objType} progress={progress} />}>
            <ExternalGLTFModel url={modelUrl} />
          </Suspense>
        ) : (
          <ScrollReactiveObject palette={palette} objType={objType} progress={progress} />
        )}
      </Canvas>
    </div>
  )
}

function ScrollReactiveObject({ palette, objType, progress }) {
  const groupRef = useRef(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.35 + progress * Math.PI * 2
      groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.12 + progress * 0.4
      groupRef.current.position.y = Math.sin(t * 1.1) * 0.2
      groupRef.current.scale.setScalar(0.9 + progress * 0.45)
    }
  })
  return (
    <group ref={groupRef}>
      <GeneratedWebGLObject palette={palette} objType={objType} />
    </group>
  )
}

function PreviewScrollChapter({ palette, scale, objType, websiteName, modelUrl }) {
  const hash = Array.from((websiteName || 'default') + (objType || '')).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const chapterLayouts = ['split', 'split-reverse', 'center-stage', 'card-float']
  const layout = chapterLayouts[hash % chapterLayouts.length]

  const chapterData = {
    food: { title: "Crafted with Passion & Flavor.", sub: "Every dish is a culinary masterpiece, prepared fresh for your delight." },
    robot: { title: "Autonomous Cybernetic Intelligence.", sub: "Powered by neural algorithms that learn, adapt, and evolve in real-time." },
    travel: { title: "Your Next Great Adventure Awaits.", sub: "Explore breathtaking destinations and VIP journeys curated just for you." },
    beauty: { title: "Timeless Elegance & Radiance.", sub: "Indulge in bespoke luxury experiences designed to elevate your everyday." },
    pet: { title: "Compassionate Care for Best Friends.", sub: "Because your beloved pets deserve a safe, joyful, and healthy sanctuary." },
    eco: { title: "Engineering a Green Tomorrow.", sub: "Harnessing sustainable earth energy to power the next generation." },
    education: { title: "Empowering Minds Through Knowledge.", sub: "Unlock limitless learning potential with world-class education." },
    legal: { title: "Unwavering Excellence & Integrity.", sub: "Strategic guidance and proven leadership to secure your future." },
    gaming: { title: "Immersive Next-Gen Performance.", sub: "Experience ultra-low latency, stunning graphics, and competitive glory." },
    crypto: { title: "Decentralized Financial Freedom.", sub: "Fast, secure, and transparent blockchain transactions worldwide." },
    car: { title: "Precision Engineering & Raw Speed.", sub: "Aerodynamic perfection meets unmatched automotive horsepower." },
    spiderman: { title: "With Great Power Comes Great Design.", sub: "Step into a universe of legendary heroism and action-packed thrill." },
    airpods: { title: "Pure Acoustic Immersion.", sub: "Crystal-clear high-fidelity sound engineered for spatial audio perfection." },
  }
  const data = chapterData[objType] || {
    title: "An object that evolves as the story unfolds.",
    sub: `This generated WebGL scene is live, continuously animated, and framed as part of the journey for ${websiteName}.`
  }

  const badge = (
    <div style={{ color: palette.secondary, fontSize: 10 * scale, fontWeight: 800, letterSpacing: '0.16em', marginBottom: 12 * scale, textTransform: 'uppercase' }}>
      ✦ CHAPTER 02 // {objType?.toUpperCase() || 'LIVE'}
    </div>
  )

  const textBlock = (
    <div>
      {badge}
      <h2 style={{ margin: 0, color: palette.text, fontSize: 36 * scale, lineHeight: 1.1, fontFamily: 'Syne, sans-serif' }}>{data.title}</h2>
      <p style={{ margin: `${16 * scale}px 0 0`, color: palette.text + 'a8', fontSize: 15 * scale, lineHeight: 1.65 }}>{data.sub}</p>
    </div>
  )

  const webglBlock = (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 310 * scale }}>
      <ScrollDrivenWebGLScene palette={palette} size={Math.min(350 * scale, 360)} objType={objType} modelUrl={modelUrl} />
    </div>
  )

  return (
    <motion.section
      initial={{ opacity: 0.2, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.25 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{
        minHeight: 450 * scale, position: 'relative', overflow: 'hidden',
        display: 'grid', placeItems: 'center', padding: `${48 * scale}px ${36 * scale}px`,
        background: layout === 'card-float'
          ? `linear-gradient(135deg, ${palette.background}, ${palette.primary}15)`
          : `radial-gradient(circle at 50% 45%, ${palette.primary}25, ${palette.background} 75%)`,
        borderTop: `1px solid ${palette.primary}25`, borderBottom: `1px solid ${palette.primary}25`
      }}
    >
      <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: `linear-gradient(${palette.primary}20 1px, transparent 1px), linear-gradient(90deg, ${palette.primary}20 1px, transparent 1px)`, backgroundSize: `${28 * scale}px ${28 * scale}px` }} />

      {layout === 'split-reverse' && (
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1100 * scale, display: 'grid', gridTemplateColumns: '1.15fr 1fr', alignItems: 'center', gap: 36 * scale }}>
          {webglBlock}
          {textBlock}
        </div>
      )}

      {layout === 'center-stage' && (
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 900 * scale, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 * scale }}>
          {textBlock}
          <div style={{ width: '100%' }}>{webglBlock}</div>
        </div>
      )}

      {layout === 'card-float' && (
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1000 * scale, display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: 30 * scale }}>
          <motion.div whileHover={{ scale: 1.02 }} style={{ background: palette.background + 'e6', border: `1px solid ${palette.primary}40`, borderRadius: 24 * scale, padding: 36 * scale, boxShadow: `0 20px 50px rgba(0,0,0,0.3)` }}>
            {textBlock}
          </motion.div>
          <div style={{ background: `radial-gradient(circle, ${palette.secondary}20, transparent 70%)`, borderRadius: 24 * scale, padding: 16 * scale }}>
            {webglBlock}
          </div>
        </div>
      )}

      {(layout === 'split' || !chapterLayouts.includes(layout)) && (
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1100 * scale, display: 'grid', gridTemplateColumns: '1fr 1.15fr', alignItems: 'center', gap: 36 * scale }}>
          {textBlock}
          {webglBlock}
        </div>
      )}
    </motion.section>
  )
}
function ThreeDScene({ palette, size: s, objType }) {
  if (objType === 'crystal')   return <CrystalGem   palette={palette} s={s} />
  if (objType === 'neural')    return <NeuralGraph   palette={palette} s={s} />
  if (objType === 'dna')       return <DNAHelix      palette={palette} s={s} />
  if (objType === 'particles') return <ParticleCloud palette={palette} s={s} />
  if (objType === 'planet')    return <PlanetScene   palette={palette} s={s} />
  if (objType === 'torus')     return <TorusRing     palette={palette} s={s} />
  if (objType === 'hologram')  return <HologramScene palette={palette} s={s} />
  if (objType === 'warp')      return <WarpTunnel    palette={palette} s={s} />
  if (objType === 'morph')     return <MorphBlob     palette={palette} s={s} />
  if (objType === 'matrix')    return <MatrixRain    palette={palette} s={s} />
  if (objType === 'icosa')     return <IcosaScene    palette={palette} s={s} />
  return <OrbitalRings palette={palette} s={s} />
}

/* ─── 3D Object: Orbital Rings (default) ─────────────────────────────────── */
function OrbitalRings({ palette, s }) {
  const bw = Math.max(1, s * 0.008)
  return (
    <div style={{ position: 'relative', width: s, height: s }}>
      <div style={{
        position: 'absolute', inset: '-25%',
        background: `radial-gradient(circle, ${palette.primary}18, transparent 65%)`,
        borderRadius: '50%', animation: 'lp-pulse 4s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <div style={{ position: 'absolute', inset: 0, perspective: `${s * 2.2}px` }}>
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d', animation: 'lp-outer 22s linear infinite',
        }}>
          {[
            { inset: '12%', border: `${bw * 1.4}px solid ${palette.primary}80`, anim: 'lp-ring0 8s linear infinite', shadow: `0 0 ${s * 0.12}px ${palette.primary}55` },
            { inset: '19%', border: `${bw}px solid ${palette.accent}65`, anim: 'lp-ring1 13s linear infinite', shadow: `0 0 ${s * 0.09}px ${palette.accent}45` },
            { inset: '7%',  border: `${bw * 0.7}px solid ${palette.secondary}42`, anim: 'lp-ring2 18s linear infinite', shadow: '' },
            { inset: '28%', border: `${bw * 0.6}px solid ${palette.primary}30`, anim: 'lp-ring0 6s linear infinite reverse', shadow: '' },
          ].map((r, i) => (
            <div key={i} style={{
              position: 'absolute', inset: r.inset, borderRadius: '50%',
              border: r.border, boxShadow: r.shadow, animation: r.anim,
            }} />
          ))}
        </div>
      </div>
      {[
        { orbit: 0, r: s * 0.37, sz: Math.max(4, s * 0.046), col: palette.primary, dur: 6 },
        { orbit: 1, r: s * 0.29, sz: Math.max(3, s * 0.031), col: palette.accent,   dur: 9 },
        { orbit: 2, r: s * 0.44, sz: Math.max(3, s * 0.027), col: palette.secondary, dur: 14 },
      ].map((o, i) => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          marginTop: -o.sz / 2, marginLeft: -o.sz / 2,
          width: o.sz, height: o.sz, borderRadius: '50%', background: o.col,
          boxShadow: `0 0 ${o.sz * 4}px ${o.col}, 0 0 ${o.sz * 8}px ${o.col}50`,
          '--r': `${o.r}px`, animation: `lp-orbit${o.orbit} ${o.dur}s linear infinite`,
        }} />
      ))}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: s * 0.22, height: s * 0.22, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${palette.secondary}, ${palette.primary}, ${palette.accent}85)`,
        boxShadow: `0 0 ${s * 0.2}px ${palette.primary}95, 0 0 ${s * 0.38}px ${palette.primary}40`,
        animation: 'lp-pulse 3s ease-in-out infinite',
      }} />
    </div>
  )
}

/* ─── 3D Object: Crystal Gem ──────────────────────────────────────────────── */
function CrystalGem({ palette, s }) {
  const facets = [
    { points: '50,5 90,30 90,70', opacity: 0.9 },
    { points: '50,5 10,30 10,70', opacity: 0.6 },
    { points: '50,95 90,70 10,70', opacity: 0.75 },
    { points: '50,5 90,30 50,50', opacity: 0.5 },
    { points: '50,5 10,30 50,50', opacity: 0.35 },
    { points: '10,30 10,70 50,50', opacity: 0.55 },
    { points: '90,30 90,70 50,50', opacity: 0.7 },
    { points: '10,70 50,95 50,50', opacity: 0.45 },
    { points: '90,70 50,95 50,50', opacity: 0.6 },
  ]
  return (
    <div style={{ position: 'relative', width: s, height: s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* glow */}
      <div style={{
        position: 'absolute', inset: '-15%',
        background: `radial-gradient(circle, ${palette.accent}25, transparent 65%)`,
        borderRadius: '50%', animation: 'lp-pulse 3.5s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <div style={{ animation: 'lp-cryst 12s linear infinite', width: '80%', height: '80%' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', filter: `drop-shadow(0 0 ${s * 0.08}px ${palette.primary})` }}>
          <defs>
            <linearGradient id="cg1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.secondary} stopOpacity="0.9" />
              <stop offset="100%" stopColor={palette.accent} stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="cg2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={palette.primary} stopOpacity="0.8" />
              <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {facets.map((f, i) => (
            <polygon key={i} points={f.points}
              fill={i % 2 === 0 ? 'url(#cg1)' : 'url(#cg2)'}
              stroke={palette.accent} strokeWidth="0.5" opacity={f.opacity} />
          ))}
          {/* inner highlight */}
          <polygon points="50,5 65,28 50,22" fill="white" opacity="0.35" />
        </svg>
      </div>
    </div>
  )
}

/* ─── 3D Object: Neural Graph ─────────────────────────────────────────────── */
function NeuralGraph({ palette, s }) {
  const nodes = useMemo(() => [
    { x: 50, y: 50, r: 6, main: true },
    { x: 22, y: 30, r: 4 }, { x: 78, y: 25, r: 4 },
    { x: 15, y: 62, r: 3 }, { x: 85, y: 60, r: 4 },
    { x: 40, y: 18, r: 3 }, { x: 65, y: 80, r: 3 },
    { x: 30, y: 75, r: 3 }, { x: 72, y: 45, r: 3 },
  ], [])
  const edges = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
    [1,3],[1,5],[2,4],[2,8],[3,7],[4,6],
  ]
  return (
    <div style={{ position: 'relative', width: s, height: s }}>
      <div style={{
        position: 'absolute', inset: '-20%',
        background: `radial-gradient(circle, ${palette.primary}15, transparent 60%)`,
        borderRadius: '50%', animation: 'lp-pulse 5s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        {edges.map(([a, b], i) => (
          <line key={i}
            x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
            stroke={palette.secondary} strokeWidth="0.6" opacity="0.4"
            style={{ animation: `lp-line ${2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }}
          />
        ))}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={n.r * 2.2} fill={palette.primary} opacity="0.08" />
            <circle cx={n.x} cy={n.y} r={n.r}
              fill={n.main ? palette.secondary : palette.primary}
              style={{ animation: `lp-node ${1.8 + i * 0.25}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

/* ─── 3D Object: DNA Helix ────────────────────────────────────────────────── */
function DNAHelix({ palette, s }) {
  const steps = 10
  return (
    <div style={{ position: 'relative', width: s, height: s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', inset: '-15%',
        background: `radial-gradient(circle, ${palette.secondary}15, transparent 60%)`,
        borderRadius: '50%', animation: 'lp-pulse 4s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <div style={{ animation: 'lp-dna-a 8s linear infinite', width: '60%', height: '90%' }}>
        <svg viewBox="0 0 60 100" style={{ width: '100%', height: '100%' }}>
          {Array.from({ length: steps }, (_, i) => {
            const t = i / (steps - 1)
            const y = 5 + t * 90
            const x1 = 30 + Math.sin(t * Math.PI * 3) * 22
            const x2 = 30 - Math.sin(t * Math.PI * 3) * 22
            return (
              <g key={i}>
                <line x1={x1} y1={y} x2={x2} y2={y}
                  stroke={palette.accent} strokeWidth="1.2" opacity="0.5"
                  style={{ animation: `lp-line ${1.5 + i * 0.1}s ease-in-out infinite`, animationDelay: `${i * 0.08}s` }}
                />
                <circle cx={x1} cy={y} r="2.5" fill={palette.primary}
                  style={{ animation: `lp-node 2s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }} />
                <circle cx={x2} cy={y} r="2.5" fill={palette.secondary}
                  style={{ animation: `lp-node 2s ease-in-out infinite`, animationDelay: `${i * 0.1 + 0.5}s` }} />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

/* ─── 3D Object: Particle Cloud ───────────────────────────────────────────── */
function ParticleCloud({ palette, s }) {
  const pts = useMemo(() => Array.from({ length: 35 }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80, y: 10 + Math.random() * 80,
    sz: (Math.random() * 2.5 + 0.8),
    dur: 2 + Math.random() * 3,
    del: Math.random() * 4,
    col: [palette.primary, palette.accent, palette.secondary][i % 3],
    ex: (Math.random() - 0.5) * 80,
    ey: -(Math.random() * 60 + 20),
  })), [palette.primary, palette.accent, palette.secondary])

  return (
    <div style={{ position: 'relative', width: s, height: s }}>
      <div style={{
        position: 'absolute', inset: '-10%',
        background: `radial-gradient(circle, ${palette.primary}20, transparent 60%)`,
        borderRadius: '50%', animation: 'lp-pulse 5s ease-in-out infinite', pointerEvents: 'none',
      }} />
      {pts.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.sz * (s / 200), height: p.sz * (s / 200),
          borderRadius: '50%', background: p.col,
          boxShadow: `0 0 ${p.sz * 5 * (s / 200)}px ${p.col}`,
          '--ex': `${p.ex * (s / 200)}px`, '--ey': `${p.ey * (s / 200)}px`,
          animation: `lp-part ${p.dur}s ease-out ${p.del}s infinite`,
          opacity: 0,
        }} />
      ))}
      {/* Central glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: s * 0.18, height: s * 0.18, borderRadius: '50%',
        background: `radial-gradient(circle, ${palette.secondary}, ${palette.primary})`,
        boxShadow: `0 0 ${s * 0.15}px ${palette.primary}`,
        animation: 'lp-pulse 2.5s ease-in-out infinite',
      }} />
    </div>
  )
}

/* ─── 3D Object: Planet ───────────────────────────────────────────────────── */
function PlanetScene({ palette, s }) {
  return (
    <div style={{ position: 'relative', width: s, height: s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Stars */}
      {useMemo(() => Array.from({ length: 18 }, (_, i) => ({
        x: Math.random() * 100, y: Math.random() * 100,
        sz: Math.random() * 1.5 + 0.5, del: Math.random() * 3,
      })), []).map((st, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${st.x}%`, top: `${st.y}%`,
          width: st.sz * (s / 200), height: st.sz * (s / 200),
          borderRadius: '50%', background: '#ffffff',
          animation: `lp-twinkle ${2 + st.del}s ease-in-out infinite`, animationDelay: `${st.del}s`,
        }} />
      ))}

      {/* Planet orbit ring */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: s * 0.92, height: s * 0.4,
        transform: 'translate(-50%,-50%) rotateX(70deg)',
        border: `${s * 0.006}px solid ${palette.accent}60`,
        borderRadius: '50%',
        animation: 'lp-planet 18s linear infinite',
      }} />

      {/* Planet sphere */}
      <div style={{
        width: s * 0.42, height: s * 0.42, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${palette.secondary}cc, ${palette.primary}, ${palette.background}dd)`,
        boxShadow: `0 0 ${s * 0.18}px ${palette.primary}70, inset -${s * 0.06}px -${s * 0.06}px ${s * 0.1}px rgba(0,0,0,0.4)`,
        position: 'relative', zIndex: 2,
        animation: 'lp-dna-a 20s linear infinite',
      }}>
        {/* Surface details */}
        <div style={{
          position: 'absolute', top: '25%', left: '15%',
          width: '40%', height: '15%', borderRadius: 999,
          background: palette.accent + '30', transform: 'rotate(-15deg)',
        }} />
        <div style={{
          position: 'absolute', top: '55%', left: '30%',
          width: '30%', height: '10%', borderRadius: 999,
          background: palette.secondary + '25', transform: 'rotate(-10deg)',
        }} />
      </div>

      {/* Orbiting moon */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        marginTop: -(s * 0.05) / 2, marginLeft: -(s * 0.05) / 2,
        width: s * 0.05, height: s * 0.05, borderRadius: '50%',
        background: palette.accent,
        boxShadow: `0 0 ${s * 0.04}px ${palette.accent}`,
        '--r': `${s * 0.42}px`,
        animation: 'lp-orbit0 7s linear infinite',
      }} />
    </div>
  )
}

/* ─── 3D Object: Torus Ring ───────────────────────────────────────────────── */
function TorusRing({ palette, s }) {
  return (
    <div style={{ position: 'relative', width: s, height: s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', inset: '-20%',
        background: `radial-gradient(circle, ${palette.accent}18, transparent 60%)`,
        borderRadius: '50%', animation: 'lp-pulse 4s ease-in-out infinite', pointerEvents: 'none',
      }} />

      {/* Outer torus (CSS ellipse trick) */}
      <div style={{ position: 'absolute', perspective: `${s * 2}px` }}>
        <div style={{
          width: s * 0.78, height: s * 0.78,
          borderRadius: '50%',
          border: `${s * 0.1}px solid transparent`,
          borderTopColor: palette.primary + 'dd',
          borderRightColor: palette.accent + '99',
          borderBottomColor: palette.primary + 'dd',
          borderLeftColor: palette.secondary + '88',
          boxShadow: `0 0 ${s * 0.12}px ${palette.primary}60, inset 0 0 ${s * 0.06}px ${palette.accent}30`,
          animation: 'lp-outer 6s linear infinite',
          transformStyle: 'preserve-3d',
          transform: 'rotateX(60deg)',
        }} />
      </div>

      {/* Inner counter-ring */}
      <div style={{ position: 'absolute', perspective: `${s * 2}px` }}>
        <div style={{
          width: s * 0.45, height: s * 0.45,
          borderRadius: '50%',
          border: `${s * 0.06}px solid transparent`,
          borderTopColor: palette.accent + 'cc',
          borderBottomColor: palette.secondary + 'aa',
          animation: 'lp-outer 4s linear infinite reverse',
          transformStyle: 'preserve-3d',
          transform: 'rotateX(45deg) rotateZ(30deg)',
        }} />
      </div>

      {/* Core */}
      <div style={{
        width: s * 0.14, height: s * 0.14, borderRadius: '50%',
        background: `radial-gradient(circle, ${palette.secondary}, ${palette.primary})`,
        boxShadow: `0 0 ${s * 0.12}px ${palette.primary}`,
        animation: 'lp-pulse 2s ease-in-out infinite',
        zIndex: 2,
      }} />
    </div>
  )
}

/* ─── 3D Object: Hologram Scene ──────────────────────────────────────────── */
function HologramScene({ palette, s }) {
  const faces = [0, 60, 120, 180, 240, 300]
  return (
    <div style={{ position: 'relative', width: s, height: s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', inset: '-20%',
        background: `radial-gradient(circle, ${palette.primary}20, transparent 65%)`,
        borderRadius: '50%', animation: 'lp-pulse 4s ease-in-out infinite', pointerEvents: 'none',
      }} />
      {/* Scan line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: s * 0.015,
        background: `linear-gradient(90deg, transparent, ${palette.secondary}cc, transparent)`,
        animation: 'lp-scan 2.5s linear infinite', pointerEvents: 'none', zIndex: 10,
      }} />
      {/* Wireframe cube */}
      <div style={{ perspective: `${s * 2.5}px`, width: s * 0.65, height: s * 0.65 }}>
        <div style={{
          width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          animation: 'lp-wire 8s linear infinite',
        }}>
          {faces.map((deg, i) => (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              border: `${Math.max(1, s * 0.006)}px solid ${i % 2 === 0 ? palette.primary : palette.accent}80`,
              transform: `rotateY(${deg}deg) translateZ(${s * 0.22}px)`,
              background: `${i % 2 === 0 ? palette.primary : palette.secondary}06`,
              boxShadow: `0 0 ${s * 0.08}px ${i % 2 === 0 ? palette.primary : palette.accent}50`,
              animation: 'lp-holo 4s ease-in-out infinite',
              animationDelay: `${i * 0.4}s`,
            }} />
          ))}
          {/* Top + bottom caps */}
          {[['rotateX(90deg)', palette.secondary], ['rotateX(-90deg)', palette.accent]].map(([tf, col], i) => (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              border: `${Math.max(1, s * 0.006)}px solid ${col}70`,
              transform: `${tf} translateZ(${s * 0.22}px)`,
              background: `${col}04`,
              boxShadow: `0 0 ${s * 0.06}px ${col}40`,
            }} />
          ))}
        </div>
      </div>
      {/* Corner brackets */}
      {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute',
          top: y === -1 ? s * 0.12 : 'auto',
          bottom: y === 1 ? s * 0.12 : 'auto',
          left: x === -1 ? s * 0.12 : 'auto',
          right: x === 1 ? s * 0.12 : 'auto',
          width: s * 0.12, height: s * 0.12,
          borderTop: y === -1 ? `2px solid ${palette.secondary}` : 'none',
          borderBottom: y === 1 ? `2px solid ${palette.secondary}` : 'none',
          borderLeft: x === -1 ? `2px solid ${palette.secondary}` : 'none',
          borderRight: x === 1 ? `2px solid ${palette.secondary}` : 'none',
          boxShadow: `0 0 ${s * 0.04}px ${palette.secondary}`,
        }} />
      ))}
    </div>
  )
}

/* ─── 3D Object: Warp Tunnel ──────────────────────────────────────────────── */
function WarpTunnel({ palette, s }) {
  const rings = Array.from({ length: 8 }, (_, i) => i)
  return (
    <div style={{ position: 'relative', width: s, height: s, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: `${s * 3}px` }}>
      <div style={{
        position: 'absolute', inset: '-15%',
        background: `radial-gradient(circle, ${palette.accent}15, transparent 60%)`,
        borderRadius: '50%', animation: 'lp-pulse 3s ease-in-out infinite', pointerEvents: 'none',
      }} />
      {rings.map(i => {
        const scale = 0.25 + i * 0.1
        const opacity = 0.9 - i * 0.1
        const col = i % 3 === 0 ? palette.primary : i % 3 === 1 ? palette.accent : palette.secondary
        return (
          <div key={i} style={{
            position: 'absolute',
            width: s * scale, height: s * scale * 0.45,
            borderRadius: '50%',
            border: `${Math.max(1, s * 0.008)}px solid ${col}`,
            opacity,
            boxShadow: `0 0 ${s * 0.08}px ${col}60, inset 0 0 ${s * 0.04}px ${col}30`,
            animation: 'lp-vortex 3s linear infinite',
            animationDuration: `${2 + i * 0.3}s`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
          }} />
        )
      })}
      {/* Center light */}
      <div style={{
        width: s * 0.1, height: s * 0.1, borderRadius: '50%', zIndex: 2,
        background: `radial-gradient(circle, white, ${palette.secondary}, ${palette.primary})`,
        boxShadow: `0 0 ${s * 0.2}px ${palette.primary}, 0 0 ${s * 0.08}px white`,
        animation: 'lp-pulse 1.5s ease-in-out infinite',
      }} />
    </div>
  )
}

/* ─── 3D Object: Morphing Blob ────────────────────────────────────────────── */
function MorphBlob({ palette, s }) {
  return (
    <div style={{ position: 'relative', width: s, height: s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer glow */}
      <div style={{
        position: 'absolute', inset: '-10%',
        background: `radial-gradient(circle, ${palette.primary}20, transparent 65%)`,
        borderRadius: '50%', animation: 'lp-pulse 5s ease-in-out infinite', pointerEvents: 'none',
      }} />
      {/* Main blob */}
      <div style={{
        width: s * 0.62, height: s * 0.62,
        background: `linear-gradient(135deg, ${palette.primary}cc, ${palette.accent}cc, ${palette.secondary}cc)`,
        animation: 'lp-morph 6s ease-in-out infinite',
        boxShadow: `0 0 ${s * 0.2}px ${palette.primary}70, 0 0 ${s * 0.08}px ${palette.accent}50`,
        filter: `blur(${s * 0.008}px)`,
      }} />
      {/* Inner highlight */}
      <div style={{
        position: 'absolute',
        width: s * 0.25, height: s * 0.25,
        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), transparent 70%)`,
        borderRadius: '50%',
        top: '25%', left: '30%',
        animation: 'lp-morph 6s ease-in-out infinite reverse',
      }} />
      {/* Secondary blob */}
      <div style={{
        position: 'absolute',
        width: s * 0.3, height: s * 0.3,
        background: `linear-gradient(135deg, ${palette.accent}99, ${palette.secondary}99)`,
        animation: 'lp-morph 8s ease-in-out infinite reverse',
        animationDelay: '2s',
        opacity: 0.6,
        bottom: '15%', right: '10%',
      }} />
    </div>
  )
}

/* ─── 3D Object: Matrix Rain ──────────────────────────────────────────────── */
function MatrixRain({ palette, s }) {
  const cols = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: 5 + i * 9.5,
    dur: 0.8 + Math.random() * 1.2,
    del: Math.random() * 3,
    chars: Array.from({ length: 6 }, () => String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96))),
  })), [])

  return (
    <div style={{ position: 'relative', width: s, height: s, overflow: 'hidden', borderRadius: 8 }}>
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, ${palette.primary}15, transparent 70%)`,
      }} />
      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${palette.primary}12 1px, transparent 1px), linear-gradient(90deg, ${palette.primary}12 1px, transparent 1px)`,
        backgroundSize: `${s * 0.1}px ${s * 0.1}px`,
      }} />
      {/* Falling columns */}
      {cols.map(col => (
        <div key={col.id} style={{
          position: 'absolute',
          left: `${col.x}%`,
          top: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: s * 0.05,
          animation: `lp-rain ${col.dur}s linear ${col.del}s infinite`,
        }}>
          {col.chars.map((ch, i) => (
            <span key={i} style={{
              fontSize: s * 0.09,
              color: i === 0 ? '#ffffff' : palette.primary,
              opacity: 1 - i * 0.15,
              fontFamily: 'monospace',
              fontWeight: i === 0 ? 'bold' : 'normal',
              textShadow: i === 0 ? `0 0 ${s * 0.04}px ${palette.primary}` : 'none',
            }}>{ch}</span>
          ))}
        </div>
      ))}
      {/* Center glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: s * 0.2, height: s * 0.2, borderRadius: '50%',
        background: `radial-gradient(circle, ${palette.primary}40, transparent 70%)`,
        animation: 'lp-pulse 2s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

/* ─── 3D Object: Icosahedron ──────────────────────────────────────────────── */
function IcosaScene({ palette, s }) {
  // Simplified icosahedron as SVG polygons
  const tris = [
    '50,8 78,32 50,42', '50,8 22,32 50,42',
    '50,8 78,32 90,60', '50,8 22,32 10,60',
    '78,32 90,60 65,75', '22,32 10,60 35,75',
    '90,60 65,75 50,92', '10,60 35,75 50,92',
    '65,75 35,75 50,92',
  ]
  const colors = [palette.primary, palette.secondary, palette.accent]
  return (
    <div style={{ position: 'relative', width: s, height: s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', inset: '-20%',
        background: `radial-gradient(circle, ${palette.primary}18, transparent 60%)`,
        borderRadius: '50%', animation: 'lp-pulse 4s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <div style={{ animation: 'lp-cryst 10s linear infinite', width: '85%', height: '85%' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', filter: `drop-shadow(0 0 ${s * 0.07}px ${palette.primary})` }}>
          <defs>
            <linearGradient id="ig1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.primary} stopOpacity="0.85" />
              <stop offset="100%" stopColor={palette.accent} stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="ig2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={palette.secondary} stopOpacity="0.8" />
              <stop offset="100%" stopColor={palette.primary} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {tris.map((pts, i) => (
            <polygon key={i} points={pts}
              fill={i % 3 === 0 ? 'url(#ig1)' : i % 3 === 1 ? 'url(#ig2)' : colors[i % 3] + '55'}
              stroke={palette.accent} strokeWidth="0.4" opacity={0.7 + (i % 3) * 0.1}
            />
          ))}
          <polygon points="50,8 78,32 65,18" fill="white" opacity="0.25" />
        </svg>
      </div>
    </div>
  )
}

/* ─── Floating Particles ──────────────────────────────────────────────────── */
function FloatingParticles({ palette, scale, light }) {
  const pts = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: 15 + Math.random() * 70,
      sz: (Math.random() * 2.2 + 0.8) * scale,
      ex: (Math.random() - 0.5) * 130, ey: -(Math.random() * 90 + 40),
      dur: Math.random() * 4.5 + 3, del: Math.random() * 7,
      col: [palette.primary, palette.accent, palette.secondary][i % 3],
    })),
  [palette.primary, palette.accent, palette.secondary, scale])

  if (light) return null // particles invisible on light bg

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pts.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.sz, height: p.sz, borderRadius: '50%', background: p.col,
          boxShadow: `0 0 ${p.sz * 5}px ${p.col}`,
          '--ex': `${p.ex}px`, '--ey': `${p.ey}px`,
          animation: `lp-part ${p.dur}s ease-out ${p.del}s infinite`,
          opacity: 0,
        }} />
      ))}
    </div>
  )
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */
function PreviewFooter({ footer, palette, scale, websiteName, light }) {
  return (
    <footer style={{
      padding: `${48 * scale}px ${32 * scale}px`,
      borderTop: `1px solid ${light ? 'rgba(0,0,0,0.08)' : palette.primary + '22'}`,
      textAlign: 'center',
      background: light
        ? `linear-gradient(to top, ${palette.primary}06, transparent)`
        : `linear-gradient(to top, ${palette.primary}0a, transparent)`,
    }}>
      {footer?.tagline && (
        <p style={{ fontSize: 13 * scale, color: palette.text + '55', marginBottom: 18 * scale, fontStyle: 'italic' }}>
          {footer.tagline}
        </p>
      )}
      <div style={{ display: 'flex', gap: 24 * scale, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 * scale }}>
        {footer?.links?.map(link => (
          <span key={link} style={{ fontSize: 12 * scale, color: palette.text + '55', cursor: 'pointer' }}>{link}</span>
        ))}
      </div>
      <p style={{ fontSize: 11 * scale, color: palette.text + '33' }}>
        {footer?.text ?? `© 2026 ${websiteName}. All rights reserved.`}
      </p>
    </footer>
  )
}

/* ─── Empty ───────────────────────────────────────────────────────────────── */
function PreviewEmpty() {
  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a14', color: 'rgba(255,255,255,0.2)', fontSize: 14,
      fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: 12,
    }}>
      <span style={{ fontSize: 32 }}>🖥️</span>
      <span>Generate a website to see the live preview</span>
    </div>
  )
}

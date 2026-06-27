/**
 * LivePreview — renders a website blueprint JSON as a live animated website.
 *
 * Variation engine:
 *  - 4 hero layouts  : split | centered | magazine | minimal
 *  - 6 3D CSS objects: orbital | crystal | neural | dna | particles | planet
 *  - 3 backgrounds   : blobs | radial | editorial
 *  - light/dark theme detection from palette
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
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
  const archetype = (
    blueprint.creative_concept?.layout_archetype ??
    blueprint.hero?.layout ?? ''
  ).toLowerCase()
  if (/magazine|editorial|brutalist|newspaper/i.test(archetype)) return 'magazine'
  if (/center|cinematic|full.?screen|immersive|story|scroll/i.test(archetype)) return 'centered'
  if (/minimal|luxury|clean|swiss|scandinavian|architectural/i.test(archetype)) return 'minimal'
  return 'split'
}

function pick3DType(blueprint) {
  const subject = (
    blueprint.cinematic_3d_scene?.main_3d_subject ??
    blueprint.hero?.['3d_integration'] ??
    blueprint.hero?.three_d_object?.type ??
    ''
  ).toLowerCase()
  if (/crystal|gem|diamond|facet|jewel/i.test(subject))              return 'crystal'
  if (/neural|network|brain|node|synapse|graph/i.test(subject))      return 'neural'
  if (/dna|helix|cell|bio|protein|gene|molecule/i.test(subject))     return 'dna'
  if (/particle|dust|cloud|scatter|field|star/i.test(subject))       return 'particles'
  if (/planet|globe|earth|sphere|world|moon/i.test(subject))         return 'planet'
  if (/torus|knot|twist|ribbon|coil/i.test(subject))                 return 'torus'
  if (/holo|hologram|wireframe|projection/i.test(subject))           return 'hologram'
  if (/warp|vortex|tunnel|portal|wormhole/i.test(subject))           return 'warp'
  if (/morph|blob|liquid|fluid|plasma/i.test(subject))               return 'morph'
  if (/matrix|code|rain|cascade|terminal/i.test(subject))            return 'matrix'
  if (/icosa|polyhedron|gem|facet|prism/i.test(subject))             return 'icosa'
  // fallback based on industry/style
  const style = (blueprint.creative_concept?.visual_signature ?? blueprint.design_style ?? '').toLowerCase()
  if (/nature|organic|health|medical/i.test(style))  return 'dna'
  if (/crypto|nft|gaming|cyber/i.test(style))        return 'crystal'
  if (/space|galaxy|cosmos/i.test(style))            return 'planet'
  if (/ai|neural|machine/i.test(style))              return 'neural'
  if (/holo|tech|futurist/i.test(style))             return 'hologram'
  if (/morph|blob|glass/i.test(style))               return 'morph'
  return 'orbital'
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

  return (
    <div style={{
      background: p.background, color: p.text,
      fontFamily: `${typography?.body_font ?? 'Inter'}, system-ui, sans-serif`,
      minHeight: '100%', overflowX: 'hidden', position: 'relative',
    }}>
      <PreviewNavbar navbar={navbar} palette={p} scale={scale} typography={typography} light={light} />
      <PreviewHero
        hero={hero} palette={p} scale={scale} typography={typography}
        websiteName={websiteName} heroLayout={heroLayout} objType={objType} bgStyle={bgStyle} light={light}
      />
      {sections?.map(s => (
        <PreviewSection key={s.id} section={s} palette={p} scale={scale} light={light} />
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
        {navbar?.links?.slice(0, 4).map(link => (
          <span key={link} style={{
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
function PreviewHero({ hero, palette, scale, typography, websiteName, heroLayout, objType, bgStyle, light }) {
  const props = { hero, palette, scale, typography, websiteName, objType, bgStyle, light }
  if (heroLayout === 'magazine')  return <HeroMagazine  {...props} />
  if (heroLayout === 'centered')  return <HeroCentered  {...props} />
  if (heroLayout === 'minimal')   return <HeroMinimal   {...props} />
  return <HeroSplit {...props} />
}

/* ─── Hero: Split (text left, 3D right) ──────────────────────────────────── */
function HeroSplit({ hero, palette, scale, typography, websiteName, objType, bgStyle, light }) {
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
        <ThreeDScene palette={palette} size={220 * scale} objType={objType} />
      </motion.div>
    </section>
  )
}

/* ─── Hero: Centered (large centered text, 3D above) ─────────────────────── */
function HeroCentered({ hero, palette, scale, typography, websiteName, objType, bgStyle, light }) {
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
        <ThreeDScene palette={palette} size={160 * scale} objType={objType} />
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
function HeroMagazine({ hero, palette, scale, typography, websiteName, objType, bgStyle, light }) {
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
          <ThreeDScene palette={palette} size={200 * scale} objType={objType} />
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Hero: Minimal (typography-first, subtle 3D) ────────────────────────── */
function HeroMinimal({ hero, palette, scale, typography, websiteName, objType, bgStyle, light }) {
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
            <ThreeDScene palette={palette} size={130 * scale} objType={objType} />
          </motion.div>
        </div>
      </div>
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

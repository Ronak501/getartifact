/**
 * PreviewSection — renders website blueprint sections with interactive 3D effects.
 *
 * Key upgrades over v1:
 *  - TiltCard: cards physically tilt toward the cursor (CSS perspective + rotateX/Y)
 *  - Mouse-follow inner glow + shimmer sweep on hover enter
 *  - AnimatedCounter: stat numbers count up as they scroll into view
 *  - Floating icons on feature cards
 *  - Glow drops on pricing highlights
 */

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}
const stagger = { visible: { transition: { staggerChildren: 0.09 } } }

export default function PreviewSection({ section, palette, scale = 1 }) {
  const { type, title, subtitle, content } = section

  const bg = {
    features:     palette.background,
    stats:        'transparent',
    testimonials: palette.background,
    pricing:      palette.background,
    cta:          palette.primary + '1e',
    process:      palette.background,
    faq:          palette.background,
    about:        palette.background,
  }[type] ?? palette.background

  return (
    <section style={{
      background: bg,
      padding: `${68 * scale}px ${32 * scale}px`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient center glow for stats / cta sections */}
      {(type === 'stats' || type === 'cta') && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '55%', height: '70%',
          background: `radial-gradient(circle, ${palette.primary}14, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Section header */}
        <motion.div
          variants={fadeUp} initial="hidden"
          whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          style={{ textAlign: 'center', marginBottom: 48 * scale }}
        >
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 32 * scale, fontWeight: 800,
            color: palette.text, marginBottom: 12 * scale, lineHeight: 1.1,
          }}>{title}</h2>
          {subtitle && (
            <p style={{
              fontSize: 16 * scale, color: palette.text + 'aa',
              maxWidth: 560, margin: '0 auto', lineHeight: 1.6,
            }}>{subtitle}</p>
          )}
        </motion.div>

        {/* Section body */}
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
          {type === 'features'     && <FeaturesGrid     content={content} palette={palette} scale={scale} />}
          {type === 'stats'        && <StatsRow         content={content} palette={palette} scale={scale} />}
          {type === 'testimonials' && <TestimonialsGrid content={content} palette={palette} scale={scale} />}
          {type === 'pricing'      && <PricingGrid      content={content} palette={palette} scale={scale} />}
          {type === 'cta'          && <CTABlock         content={content} palette={palette} scale={scale} />}
          {type === 'process'      && <ProcessSteps     content={content} palette={palette} scale={scale} />}
          {type === 'faq'          && <FaqList          content={content} palette={palette} scale={scale} />}
          {type === 'about'        && <AboutBlock       content={content} palette={palette} scale={scale} />}
          {!['features','stats','testimonials','pricing','cta','process','faq','about'].includes(type) && (
            <GenericGrid content={content} palette={palette} scale={scale} />
          )}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── 3D Tilt Card ────────────────────────────────────────────────────────── */
/**
 * Wraps children in a card that:
 *  1. Tilts ±16° in X/Y toward the mouse cursor (CSS perspective transform)
 *  2. Shows a radial glow that follows the mouse inside
 *  3. Fires a one-shot shimmer sweep on mouse enter
 *  4. Lifts (translateZ) and brightens border on hover
 */
function TiltCard({ children, style = {}, palette, glow = false }) {
  const ref = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [gpos, setGpos] = useState({ x: 50, y: 50 })
  const [hov, setHov]   = useState(false)
  const [shimmer, setShimmer] = useState(false)

  const onMove = e => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width
    const ny = (e.clientY - r.top) / r.height
    setTilt({ x: (ny - 0.5) * -18, y: (nx - 0.5) * 18 })
    setGpos({ x: nx * 100, y: ny * 100 })
  }

  const onEnter = () => {
    setHov(true)
    setShimmer(true)
    setTimeout(() => setShimmer(false), 750)
  }

  const onLeave = () => {
    setTilt({ x: 0, y: 0 })
    setHov(false)
  }

  return (
    <motion.div variants={fadeUp} style={{ perspective: 900 }}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{
          position: 'relative', overflow: 'hidden', borderRadius: 16,
          backdropFilter: 'blur(12px)',
          border: hov
            ? `1px solid ${palette.primary}52`
            : '1px solid rgba(255,255,255,0.10)',
          background: hov
            ? `radial-gradient(circle at ${gpos.x}% ${gpos.y}%, ${palette.primary}1e, rgba(255,255,255,0.04))`
            : 'rgba(255,255,255,0.04)',
          boxShadow: hov
            ? `0 24px 60px rgba(0,0,0,0.45), 0 0 42px ${palette.primary}2a`
            : glow
              ? `0 0 30px ${palette.primary}33, 0 8px 32px rgba(0,0,0,0.3)`
              : '0 4px 24px rgba(0,0,0,0.25)',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hov ? 'translateZ(14px)' : 'translateZ(0)'}`,
          transition: 'transform 0.14s ease-out, box-shadow 0.3s, border-color 0.25s, background 0.2s',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          ...style,
        }}
      >
        {/* Mouse-follow radial glow layer */}
        {hov && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 16,
            background: `radial-gradient(circle at ${gpos.x}% ${gpos.y}%, rgba(255,255,255,0.10) 0%, transparent 58%)`,
          }} />
        )}
        {/* One-shot shimmer sweep */}
        {shimmer && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.12) 50%, transparent 62%)',
            animation: 'lp-shimmer 0.65s ease-out forwards',
          }} />
        )}
        {children}
      </div>
    </motion.div>
  )
}

/* ─── Animated Counter ────────────────────────────────────────────────────── */
function AnimatedCounter({ value, palette, scale }) {
  const ref = useRef(null)
  const [display, setDisplay] = useState(value ?? '0')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!ref.current || started) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect() } },
      { threshold: 0.5 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [started])

  useEffect(() => {
    if (!started || !value) return
    const match = String(value).match(/^([^0-9]*)([0-9.,]+)(.*)$/)
    if (!match) return
    const [, pre, numStr, suf] = match
    const num = parseFloat(numStr.replace(/,/g, ''))
    if (isNaN(num)) return

    const totalMs = 1600
    const fps     = 60
    const steps   = totalMs / (1000 / fps)
    let frame = 0
    const easeOut = t => 1 - Math.pow(1 - t, 3)

    const tick = setInterval(() => {
      frame++
      const t   = easeOut(Math.min(frame / steps, 1))
      const cur = num * t
      const fmt = num >= 1000
        ? Math.round(cur).toLocaleString()
        : num % 1 !== 0 ? cur.toFixed(1) : String(Math.round(cur))
      setDisplay(`${pre}${fmt}${suf}`)
      if (frame >= steps) clearInterval(tick)
    }, 1000 / fps)

    return () => clearInterval(tick)
  }, [started, value])

  return (
    <div ref={ref} style={{
      fontSize: 44 * scale, fontWeight: 900, fontFamily: 'Syne, sans-serif',
      background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      marginBottom: 8 * scale, lineHeight: 1,
      filter: `drop-shadow(0 0 ${12 * scale}px ${palette.primary}65)`,
    }}>
      {display}
    </div>
  )
}

/* ─── Features ────────────────────────────────────────────────────────────── */
function FeaturesGrid({ content, palette, scale }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 * scale }}>
      {content?.map((item, i) => (
        <TiltCard key={i} palette={palette} style={{ padding: 24 * scale }}>
          <div style={{
            width: 46 * scale, height: 46 * scale, borderRadius: 12,
            background: `linear-gradient(135deg, ${palette.primary}28, ${palette.accent}18)`,
            border: `1px solid ${palette.primary}48`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22 * scale, marginBottom: 16 * scale,
            boxShadow: `0 0 22px ${palette.primary}28`,
            animation: 'lp-float 4s ease-in-out infinite',
            animationDelay: `${i * 0.45}s`,
          }}>
            {item.icon ?? '✦'}
          </div>
          <h3 style={{
            fontSize: 16 * scale, fontWeight: 700,
            color: palette.text, marginBottom: 8 * scale,
          }}>
            {item.title}
          </h3>
          <p style={{ fontSize: 13 * scale, color: palette.text + '88', lineHeight: 1.6 }}>
            {item.description}
          </p>
        </TiltCard>
      ))}
    </div>
  )
}

/* ─── Stats ───────────────────────────────────────────────────────────────── */
function StatsRow({ content, palette, scale }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(content?.length ?? 4, 4)}, 1fr)`,
      gap: 20 * scale,
    }}>
      {content?.map((item, i) => (
        <TiltCard key={i} palette={palette} style={{ padding: `${28 * scale}px ${16 * scale}px`, textAlign: 'center' }}>
          <AnimatedCounter value={item.value} palette={palette} scale={scale} />
          <div style={{ fontSize: 13 * scale, color: palette.text + '88', fontWeight: 500 }}>
            {item.label}
          </div>
        </TiltCard>
      ))}
    </div>
  )
}

/* ─── Testimonials ────────────────────────────────────────────────────────── */
function TestimonialsGrid({ content, palette, scale }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 * scale }}>
      {content?.map((item, i) => (
        <TiltCard key={i} palette={palette} style={{ padding: 28 * scale }}>
          <div style={{ marginBottom: 16 * scale, color: '#fbbf24', fontSize: 14 * scale, letterSpacing: 2 }}>
            ★★★★★
          </div>
          <p style={{
            fontSize: 14 * scale, color: palette.text + 'cc',
            lineHeight: 1.7, marginBottom: 20 * scale, fontStyle: 'italic',
          }}>
            "{item.quote}"
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38 * scale, height: 38 * scale, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16 * scale, fontWeight: 700, color: '#fff',
              boxShadow: `0 0 16px ${palette.primary}55`,
            }}>
              {(item.author ?? 'A')[0]}
            </div>
            <div>
              <div style={{ fontSize: 13 * scale, fontWeight: 700, color: palette.text }}>{item.author}</div>
              <div style={{ fontSize: 11 * scale, color: palette.text + '66' }}>
                {item.role}{item.company ? ` · ${item.company}` : ''}
              </div>
            </div>
          </div>
        </TiltCard>
      ))}
    </div>
  )
}

/* ─── Pricing ─────────────────────────────────────────────────────────────── */
function PricingGrid({ content, palette, scale }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(content?.length ?? 3, 3)}, 1fr)`,
      gap: 20 * scale, maxWidth: 920, margin: '0 auto',
      alignItems: 'center',
    }}>
      {content?.map((tier, i) => (
        <TiltCard
          key={i}
          palette={palette}
          glow={tier.highlighted}
          style={{
            padding: 28 * scale,
            border: tier.highlighted ? `1px solid ${palette.primary}65` : '1px solid rgba(255,255,255,0.10)',
          }}
        >
          {tier.highlighted && (
            <div style={{
              display: 'inline-block', marginBottom: 12 * scale,
              padding: `${4 * scale}px ${10 * scale}px`,
              borderRadius: 20, fontSize: 10 * scale, fontWeight: 700,
              background: palette.primary + '2e', color: palette.primary,
              border: `1px solid ${palette.primary}52`,
            }}>
              MOST POPULAR
            </div>
          )}
          <h3 style={{ fontSize: 18 * scale, fontWeight: 800, color: palette.text, marginBottom: 8 * scale }}>
            {tier.name}
          </h3>
          <div style={{ marginBottom: 20 * scale }}>
            <span style={{
              fontSize: 38 * scale, fontWeight: 900, fontFamily: 'Syne, sans-serif',
              color: tier.highlighted ? palette.primary : palette.text,
              filter: tier.highlighted ? `drop-shadow(0 0 ${10 * scale}px ${palette.primary}65)` : 'none',
            }}>
              {tier.price}
            </span>
            {tier.period && (
              <span style={{ fontSize: 13 * scale, color: palette.text + '66', marginLeft: 4 }}>
                {tier.period}
              </span>
            )}
          </div>
          <div style={{ marginBottom: 24 * scale }}>
            {tier.features?.map((f, fi) => (
              <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 * scale }}>
                <span style={{ color: palette.secondary, fontSize: 12 * scale }}>✓</span>
                <span style={{ fontSize: 13 * scale, color: palette.text + 'cc' }}>{f}</span>
              </div>
            ))}
          </div>
          <button style={{
            width: '100%', padding: `${12 * scale}px`, borderRadius: 10,
            fontSize: 13 * scale, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: tier.highlighted
              ? `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`
              : 'rgba(255,255,255,0.07)',
            color: tier.highlighted ? '#fff' : palette.text,
            boxShadow: tier.highlighted ? `0 0 28px ${palette.primary}55` : 'none',
          }}>
            {tier.highlighted ? 'Get Started' : 'Choose Plan'}
          </button>
        </TiltCard>
      ))}
    </div>
  )
}

/* ─── CTA ─────────────────────────────────────────────────────────────────── */
function CTABlock({ content, palette, scale }) {
  const item = content?.[0] ?? {}
  return (
    <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: `${32 * scale}px 0` }}>
      <div style={{ display: 'flex', gap: 14 * scale, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button style={{
          padding: `${14 * scale}px ${34 * scale}px`, borderRadius: 12,
          fontSize: 15 * scale, fontWeight: 700, cursor: 'pointer', border: 'none',
          background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
          color: '#fff',
          boxShadow: `0 0 42px ${palette.primary}68, 0 8px 32px rgba(0,0,0,0.3)`,
        }}>
          {item.cta_primary ?? 'Get Started Free'}
        </button>
        {item.cta_secondary && (
          <button style={{
            padding: `${14 * scale}px ${34 * scale}px`, borderRadius: 12,
            fontSize: 15 * scale, fontWeight: 600, cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', color: palette.text,
            border: `1px solid ${palette.primary}32`, backdropFilter: 'blur(10px)',
          }}>
            {item.cta_secondary}
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Process steps ───────────────────────────────────────────────────────── */
function ProcessSteps({ content, palette, scale }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 * scale, maxWidth: 700, margin: '0 auto' }}>
      {content?.map((item, i) => (
        <TiltCard key={i} palette={palette} style={{ padding: `${20 * scale}px ${24 * scale}px` }}>
          <div style={{ display: 'flex', gap: 18 * scale, alignItems: 'flex-start' }}>
            <div style={{
              width: 44 * scale, height: 44 * scale, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16 * scale, fontWeight: 900, color: '#fff',
              boxShadow: `0 0 22px ${palette.primary}65`,
            }}>
              {item.step ?? i + 1}
            </div>
            <div>
              <h4 style={{ fontSize: 16 * scale, fontWeight: 700, color: palette.text, marginBottom: 6 * scale }}>
                {item.title}
              </h4>
              <p style={{ fontSize: 13 * scale, color: palette.text + '88', lineHeight: 1.6 }}>
                {item.description}
              </p>
            </div>
          </div>
        </TiltCard>
      ))}
    </div>
  )
}

/* ─── FAQ ─────────────────────────────────────────────────────────────────── */
function FaqList({ content, palette, scale }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 * scale }}>
      {content?.map((item, i) => (
        <TiltCard key={i} palette={palette} style={{ padding: `${20 * scale}px ${24 * scale}px` }}>
          <h4 style={{ fontSize: 15 * scale, fontWeight: 700, color: palette.text, marginBottom: 8 * scale }}>
            {item.question}
          </h4>
          <p style={{ fontSize: 13 * scale, color: palette.text + '88', lineHeight: 1.6 }}>
            {item.answer}
          </p>
        </TiltCard>
      ))}
    </div>
  )
}

/* ─── About ───────────────────────────────────────────────────────────────── */
function AboutBlock({ content, palette, scale }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {content?.map((item, i) => (
        <motion.p key={i} variants={fadeUp} style={{
          fontSize: 18 * scale, color: palette.text + 'cc',
          lineHeight: 1.8, marginBottom: 16 * scale,
        }}>
          {item.text}
        </motion.p>
      ))}
    </div>
  )
}

/* ─── Generic fallback ────────────────────────────────────────────────────── */
function GenericGrid({ content, palette, scale }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 * scale }}>
      {content?.map((item, i) => (
        <TiltCard key={i} palette={palette} style={{ padding: 22 * scale }}>
          {item.icon        && <div style={{ fontSize: 24 * scale, marginBottom: 12 * scale }}>{item.icon}</div>}
          {item.title       && <h4 style={{ fontSize: 15 * scale, fontWeight: 700, color: palette.text, marginBottom: 6 * scale }}>{item.title}</h4>}
          {item.description && <p  style={{ fontSize: 12 * scale, color: palette.text + '88', lineHeight: 1.6 }}>{item.description}</p>}
          {item.value       && <div style={{ fontSize: 32 * scale, fontWeight: 900, color: palette.primary }}>{item.value}</div>}
          {item.label       && <div style={{ fontSize: 12 * scale, color: palette.text + '66' }}>{item.label}</div>}
        </TiltCard>
      ))}
    </div>
  )
}

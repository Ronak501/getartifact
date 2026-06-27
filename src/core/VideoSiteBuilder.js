/**
 * VideoSiteBuilder.js
 *
 * Video-First architecture: generates a complete deploy-ready React project
 * where the hero is always a fullscreen autoplay video, and all other design
 * decisions (colors, sections, typography, layout) are derived from the
 * Veo prompt data — making every generated site visually unique.
 *
 * No Two Sites Are The Same because:
 *  1. The Veo prompt is uniquely generated for each business
 *  2. The video itself is cinematic and unique
 *  3. Section types change per industry (restaurant ≠ SaaS ≠ gaming)
 *  4. Colors come directly from the video's described palette
 *  5. Layout compositions differ per design style
 *
 * Entry point: buildVideoSite(veoData, prompt, videoUrl?)
 * Returns: { files: { [filename]: code } }
 */

// ─── Colour extraction ────────────────────────────────────────────────────────

function extractColors(veoData) {
  const palette = veoData?.color_palette ?? []
  return {
    primary:   palette[0] ?? '#6366f1',
    secondary: palette[1] ?? '#a78bfa',
    accent:    palette[2] ?? '#f59e0b',
    bg:        palette[3] ?? '#0a0a0f',
    text:      isLight(palette[3] ?? '#0a0a0f') ? '#111111' : '#f0f0f0',
    surface:   adjustBrightness(palette[3] ?? '#0a0a0f', 18),
    border:    adjustBrightness(palette[3] ?? '#0a0a0f', 28),
  }
}

function isLight(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

function adjustBrightness(hex, amt) {
  const h = hex.replace('#', '')
  const clamp = v => Math.min(255, Math.max(0, v))
  const isDark = !isLight(hex)
  const delta = isDark ? amt : -amt
  const r = clamp(parseInt(h.slice(0, 2), 16) + delta).toString(16).padStart(2, '0')
  const g = clamp(parseInt(h.slice(2, 4), 16) + delta).toString(16).padStart(2, '0')
  const b = clamp(parseInt(h.slice(4, 6), 16) + delta).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

// ─── Industry classifier ──────────────────────────────────────────────────────

function classifyBusiness(veoData, prompt) {
  const text = `${veoData?.business_type ?? ''} ${prompt ?? ''}`.toLowerCase()
  if (/restaurant|food|dining|cafe|bar|kitchen|chef|cuisine|meal|pizza|sushi/.test(text)) return 'restaurant'
  if (/gaming|esport|game|stream|twitch|tournament|player|arena|fps|moba|rpg/.test(text)) return 'gaming'
  if (/fashion|luxury|jewelry|watch|clothes|boutique|couture|brand|apparel|style/.test(text)) return 'fashion'
  if (/health|fitness|gym|yoga|wellness|trainer|workout|sport|crossfit|pilates/.test(text)) return 'fitness'
  if (/music|festival|concert|artist|band|dj|album|tour|ticket|event/.test(text)) return 'music'
  if (/finance|crypto|bank|invest|trading|fund|wallet|defi|nft|web3/.test(text)) return 'finance'
  if (/travel|hotel|resort|tourism|destination|vacation|booking|airbnb/.test(text)) return 'travel'
  if (/education|school|course|learn|university|bootcamp|tutor|degree/.test(text)) return 'education'
  if (/agency|studio|creative|design|portfolio|artwork|photography|film/.test(text)) return 'creative'
  return 'tech'
}

// ─── Font picker ──────────────────────────────────────────────────────────────

function pickFonts(industry, veoData) {
  const typo = (veoData?.typography ?? '').toLowerCase()
  const map = {
    restaurant: ['Playfair Display', 'Lato'],
    gaming:     ['Rajdhani', 'Exo 2'],
    fashion:    ['Cormorant Garamond', 'Jost'],
    fitness:    ['Barlow Condensed', 'Inter'],
    music:      ['Bebas Neue', 'Roboto'],
    finance:    ['Space Grotesk', 'IBM Plex Sans'],
    travel:     ['Nunito', 'Open Sans'],
    education:  ['Poppins', 'Source Sans 3'],
    creative:   ['DM Serif Display', 'DM Sans'],
    tech:       ['Syne', 'Inter'],
  }
  // Override with veoData hint if recognisable
  if (/serif/.test(typo)) return [map[industry][0], map[industry][1]]
  return map[industry] ?? ['Syne', 'Inter']
}

// ─── Content extractor from veoData ──────────────────────────────────────────

function extractContent(veoData, prompt) {
  const name    = veoData?.website_name ?? inferName(prompt)
  const bt      = veoData?.business_type ?? 'Platform'
  const tagline = extractTagline(veoData?.veo_prompt ?? '', name)
  const sub     = extractSubheadline(veoData?.veo_prompt ?? '', bt)
  const cta     = inferCTA(bt)
  const motions = veoData?.motion_effects ?? []
  const elements3d = veoData?.['3d_elements'] ?? []
  return { name, bt, tagline, sub, cta, motions, elements3d }
}

function inferName(prompt) {
  const words = (prompt ?? '').split(' ')
  return words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'HQ'
}

function extractTagline(veoPrompt, name) {
  // Try to find the actual headline described in the veo prompt
  const match = veoPrompt.match(/headline['":\s]+"?([^".\n]{10,60})"?/i)
    ?? veoPrompt.match(/typography[^.]*"([^"]{10,60})"/i)
  if (match) return match[1].trim()
  return `The ${name} Experience`
}

function extractSubheadline(veoPrompt, bt) {
  const match = veoPrompt.match(/subtitle[^.]*?([A-Z][^.]{20,80}\.)/i)
  if (match) return match[1].trim()
  return `Redefining ${bt} for the modern era.`
}

function inferCTA(bt) {
  const ctaMap = {
    restaurant: ['Reserve a Table', 'View Menu'],
    gaming:     ['Join Tournament', 'Watch Stream'],
    fashion:    ['Shop Collection', 'View Lookbook'],
    fitness:    ['Start Training', 'Book Session'],
    music:      ['Get Tickets', 'Listen Now'],
    finance:    ['Start Investing', 'View Dashboard'],
    travel:     ['Book Now', 'Explore Destinations'],
    education:  ['Enroll Free', 'View Courses'],
    creative:   ['View Work', 'Start Project'],
    tech:       ['Get Started Free', 'Watch Demo'],
  }
  const key = Object.keys(ctaMap).find(k => bt.toLowerCase().includes(k)) ?? 'tech'
  return ctaMap[key] ?? ctaMap.tech
}

// ─── File generators ──────────────────────────────────────────────────────────

function genPackageJson(name) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return JSON.stringify({
    name: slug,
    version: '1.0.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      'react-router-dom': '^6.27.0',
      'framer-motion': '^11.11.11',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.3.3',
      vite: '^5.4.11',
      tailwindcss: '^3.4.14',
      autoprefixer: '^10.4.20',
      postcss: '^8.4.47',
    },
  }, null, 2)
}

function genIndexHtml(name, fonts) {
  const googleFonts = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fonts[0])}:wght@300;400;600;700;800;900&family=${encodeURIComponent(fonts[1])}:wght@300;400;500;600&display=swap`
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="${googleFonts}" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
}

function genViteConfig() {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
}

function genTailwindConfig(colors) {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '${colors.primary}',
        secondary: '${colors.secondary}',
        accent: '${colors.accent}',
        brand: {
          bg: '${colors.bg}',
          surface: '${colors.surface}',
          text: '${colors.text}',
        },
      },
    },
  },
  plugins: [],
}`
}

function genPostcssConfig() {
  return `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}`
}

function genIndexCss(colors, fonts) {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary:   ${colors.primary};
  --color-secondary: ${colors.secondary};
  --color-accent:    ${colors.accent};
  --color-bg:        ${colors.bg};
  --color-surface:   ${colors.surface};
  --color-text:      ${colors.text};
  --font-heading:    '${fonts[0]}', serif;
  --font-body:       '${fonts[1]}', sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 { font-family: var(--font-heading); }

::selection {
  background: var(--color-primary);
  color: #fff;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--color-bg); }
::-webkit-scrollbar-thumb { background: var(--color-primary); border-radius: 3px; }`
}

function genMainJsx() {
  return `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`
}

// ─── Hero component (fullscreen video background) ─────────────────────────────

function genHeroJsx(content, colors, fonts, videoUrl) {
  const { name, tagline, sub, cta } = content
  const videoSrc = videoUrl ?? ''

  return `import { motion } from 'framer-motion'

// VIDEO_URL is set at build time or injected when the video finishes rendering.
// Replace this constant with your actual video URL before deploying.
const VIDEO_URL = '${videoSrc}'

export default function Hero() {
  return (
    <section style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* ── Fullscreen video background ─────────────────────────────────── */}
      {/* Always render the video element; shows when VIDEO_URL is set */}
      <video
        autoPlay muted loop playsInline
        src={VIDEO_URL}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 0,
          opacity: VIDEO_URL ? 1 : 0,
          transition: 'opacity 1s ease',
        }}
      />

      {/* ── Animated cinematic background (shown while video renders) ─────── */}
      {!VIDEO_URL && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '${colors.bg}', overflow: 'hidden' }}>
          <style>{'@keyframes blob1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-40px,30px) scale(1.12)}}@keyframes blob2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(50px,-35px) scale(0.9)}}@keyframes blob3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-20px,-45px) scale(1.08)}}'}</style>
          <div style={{ position:'absolute', top:'-10%', left:'15%', width:'55%', height:'70%', borderRadius:'50%', background:'${colors.primary}', opacity:0.18, filter:'blur(80px)', animation:'blob1 9s ease-in-out infinite' }} />
          <div style={{ position:'absolute', bottom:'-15%', right:'10%', width:'50%', height:'65%', borderRadius:'50%', background:'${colors.secondary}', opacity:0.14, filter:'blur(70px)', animation:'blob2 11s ease-in-out infinite' }} />
          <div style={{ position:'absolute', top:'30%', right:'30%', width:'35%', height:'50%', borderRadius:'50%', background:'${colors.accent}', opacity:0.12, filter:'blur(60px)', animation:'blob3 7s ease-in-out infinite' }} />
          <div style={{ position:'absolute', top:'12px', right:'16px', padding:'5px 14px', borderRadius:'20px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.14)', color:'rgba(255,255,255,0.45)', fontSize:'0.7rem', letterSpacing:'0.1em', zIndex:5 }}>
            ● Cinematic video rendering...
          </div>
        </div>
      )}

      {/* ── Cinematic overlay ───────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to top, ${colors.bg}f0 0%, ${colors.bg}80 40%, transparent 70%)',
      }} />

      {/* ── Vignette ────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, ${colors.bg}88 100%)',
      }} />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 10,
        height: '100%', display: 'flex',
        flexDirection: 'column', justifyContent: 'flex-end',
        padding: '0 8% 10%',
        maxWidth: '900px',
      }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            color: '${colors.primary}',
            fontSize: '0.78rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: '1.2rem',
            fontFamily: 'var(--font-body)',
          }}
        >
          ${name}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: 'clamp(2.8rem, 6vw, 6rem)',
            fontWeight: 900,
            color: '${colors.text}',
            lineHeight: 1.0,
            letterSpacing: '-0.02em',
            marginBottom: '1.4rem',
          }}
        >
          ${tagline}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.72 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          style={{
            fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
            color: '${colors.text}',
            lineHeight: 1.65,
            maxWidth: '520px',
            marginBottom: '2.5rem',
            fontFamily: 'var(--font-body)',
          }}
        >
          ${sub}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.48 }}
          style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
        >
          <button
            onClick={() => document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              background: '${colors.primary}',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.9rem 2.2rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              letterSpacing: '0.03em',
              transition: 'opacity 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { e.target.style.opacity = '0.88'; e.target.style.transform = 'scale(1.03)' }}
            onMouseLeave={e => { e.target.style.opacity = '1'; e.target.style.transform = 'scale(1)' }}
          >
            ${cta[0]}
          </button>
          <button
            style={{
              background: 'transparent',
              color: '${colors.text}',
              border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: '6px',
              padding: '0.9rem 2.2rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              letterSpacing: '0.03em',
              backdropFilter: 'blur(8px)',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => e.target.style.borderColor = '${colors.primary}'}
            onMouseLeave={e => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
          >
            ${cta[1]}
          </button>
        </motion.div>
      </div>

      {/* ── Scroll indicator ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.2 }}
        style={{
          position: 'absolute', bottom: '2.5rem', right: '5%',
          zIndex: 10, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '0.5rem',
        }}
      >
        <span style={{ color: '${colors.text}', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', writingMode: 'vertical-rl' }}>Scroll</span>
        <div style={{ width: '1px', height: '48px', background: 'linear-gradient(to bottom, ${colors.primary}, transparent)' }} />
      </motion.div>

      <style>{\`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      \`}</style>
    </section>
  )
}`
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function genNavbarJsx(content, colors, industry) {
  const navLinks = industryNavLinks(industry)
  return `import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const LINKS = ${JSON.stringify(navLinks)}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: scrolled ? '0.8rem 6%' : '1.4rem 6%',
        background: scrolled ? '${colors.bg}ee' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid ${colors.border}' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.4s',
      }}
    >
      {/* Brand */}
      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', color: '${colors.text}', letterSpacing: '-0.01em' }}>
        ${content.name}
      </span>

      {/* Desktop links */}
      <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
        {LINKS.map(link => (
          <a
            key={link}
            href={\`#\${link.toLowerCase().replace(/\\s+/g, '-')}\`}
            style={{
              color: '${colors.text}99',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 500,
              letterSpacing: '0.04em',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.target.style.color = '${colors.text}'}
            onMouseLeave={e => e.target.style.color = '${colors.text}99'}
          >
            {link}
          </a>
        ))}
        <button
          style={{
            background: '${colors.primary}',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.55rem 1.4rem',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.target.style.opacity = '0.85'}
          onMouseLeave={e => e.target.style.opacity = '1'}
        >
          ${content.cta[0]}
        </button>
      </div>
    </motion.nav>
  )
}`
}

function industryNavLinks(industry) {
  return {
    restaurant: ['Menu', 'About', 'Gallery', 'Reservations'],
    gaming:     ['Games', 'Tournaments', 'Leaderboard', 'Community'],
    fashion:    ['Collections', 'Lookbook', 'About', 'Store'],
    fitness:    ['Programs', 'Trainers', 'Schedule', 'Pricing'],
    music:      ['Shows', 'Music', 'Artists', 'Tickets'],
    finance:    ['Products', 'Markets', 'About', 'Dashboard'],
    travel:     ['Destinations', 'Hotels', 'Experiences', 'Book'],
    education:  ['Courses', 'Instructors', 'Pricing', 'Blog'],
    creative:   ['Work', 'Services', 'About', 'Contact'],
    tech:       ['Product', 'Pricing', 'Docs', 'Blog'],
  }[industry] ?? ['About', 'Services', 'Blog', 'Contact']
}

// ─── Industry section generators ──────────────────────────────────────────────

function genSectionsJsx(industry, content, colors, veoData) {
  switch (industry) {
    case 'restaurant': return genRestaurantSections(content, colors, veoData)
    case 'gaming':     return genGamingSections(content, colors, veoData)
    case 'fashion':    return genFashionSections(content, colors, veoData)
    case 'fitness':    return genFitnessSections(content, colors, veoData)
    case 'music':      return genMusicSections(content, colors, veoData)
    case 'finance':    return genFinanceSections(content, colors, veoData)
    case 'travel':     return genTravelSections(content, colors, veoData)
    case 'education':  return genEducationSections(content, colors, veoData)
    case 'creative':   return genCreativeSections(content, colors, veoData)
    default:           return genTechSections(content, colors, veoData)
  }
}

// Restaurant: Menu grid + Chef story + Reservations
function genRestaurantSections(content, colors, veoData) {
  return `import { motion } from 'framer-motion'

const DISHES = [
  { name: 'Signature Tasting Menu', desc: '7-course journey through seasonal ingredients', price: '$145', tag: 'Chef Special' },
  { name: 'Heritage Prime Beef', desc: 'Dry-aged 45 days, truffle butter, bone marrow jus', price: '$68', tag: 'Bestseller' },
  { name: 'Ocean to Table', desc: 'Live-caught daily, light citrus beurre blanc', price: '$52', tag: 'Seasonal' },
  { name: 'Garden Tasting', desc: 'Entirely plant-forward, zero-waste kitchen philosophy', price: '$88', tag: 'Vegan' },
  { name: 'The Ritual Dessert', desc: 'Tableside preparation, liquid nitrogen theatre', price: '$24', tag: 'Signature' },
  { name: 'Cellar Select Pairing', desc: 'Sommelier-chosen wines matched to every course', price: '$95', tag: 'Pairing' },
]

const FV = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const FI = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }

export default function Sections() {
  return (
    <>
      {/* ── Menu section ────────────────────────────────────────── */}
      <section id="menu" style={{ background: '${colors.bg}', padding: '7rem 8%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ marginBottom: '4rem' }}>
          <p style={{ color: '${colors.primary}', fontSize: '0.78rem', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>The Menu</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.2rem, 4vw, 3.5rem)', fontWeight: 700, color: '${colors.text}', lineHeight: 1.05 }}>
            Crafted with intention,<br />served with soul.
          </h2>
        </motion.div>
        <motion.div variants={FV} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0' }}
        >
          {DISHES.map((dish, i) => (
            <motion.div key={i} variants={FI}
              style={{ padding: '2rem', borderBottom: '1px solid ${colors.border}', borderRight: i % 2 === 0 ? '1px solid ${colors.border}' : 'none', cursor: 'pointer', transition: 'background 0.3s' }}
              onMouseEnter={e => e.currentTarget.style.background = '${colors.surface}'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 600, color: '${colors.text}', maxWidth: '75%' }}>{dish.name}</h3>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: '${colors.primary}', fontWeight: 700 }}>{dish.price}</span>
              </div>
              <p style={{ color: '${colors.text}88', fontSize: '0.87rem', lineHeight: 1.6, marginBottom: '1rem' }}>{dish.desc}</p>
              <span style={{ display: 'inline-block', background: '${colors.primary}18', color: '${colors.primary}', borderRadius: '3px', padding: '0.2rem 0.7rem', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{dish.tag}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Reservation CTA ─────────────────────────────────────── */}
      <section id="reservations" style={{ background: '${colors.surface}', padding: '6rem 8%', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <p style={{ color: '${colors.primary}', fontSize: '0.78rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1.2rem' }}>Reservations</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '${colors.text}', marginBottom: '1.2rem' }}>
            An evening you won't forget.
          </h2>
          <p style={{ color: '${colors.text}77', maxWidth: '480px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Reserve your table and let us take care of the rest. Private dining and events available upon request.
          </p>
          <button style={{ background: '${colors.primary}', color: '#fff', border: 'none', borderRadius: '6px', padding: '1rem 3rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', letterSpacing: '0.04em' }}>
            Reserve a Table
          </button>
        </motion.div>
      </section>
    </>
  )
}`
}

// Gaming: Stats banner + Features + Leaderboard
function genGamingSections(content, colors, veoData) {
  return `import { motion } from 'framer-motion'

const STATS = [
  { value: '2.4M+', label: 'Active Players' },
  { value: '$500K', label: 'Prize Pool' },
  { value: '150+', label: 'Tournaments' },
  { value: '99.9%', label: 'Uptime' },
]
const FEATURES = [
  { icon: '⚡', title: 'Sub-10ms Latency', desc: 'Server infrastructure built for competitive play.' },
  { icon: '🏆', title: 'Live Tournaments', desc: 'Daily, weekly and seasonal championship brackets.' },
  { icon: '👁️', title: 'Spectator Mode', desc: 'Watch matches live with real-time stats overlay.' },
  { icon: '🤖', title: 'AI Matchmaking', desc: 'Skill-based ranking powered by machine learning.' },
  { icon: '🎯', title: 'Ranked Seasons', desc: 'Progress through tiers with exclusive rewards.' },
  { icon: '🛡️', title: 'Anti-Cheat', desc: 'Military-grade detection keeps competition fair.' },
]

export default function Sections() {
  return (
    <>
      {/* ── Stats banner ──────────────────────────────────────── */}
      <section style={{ background: '${colors.primary}', padding: '3rem 8%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          {STATS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <div style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.4rem' }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────── */}
      <section id="games" style={{ background: '${colors.bg}', padding: '7rem 8%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, color: '${colors.text}', letterSpacing: '-0.02em' }}>
            Built to Win
          </h2>
          <p style={{ color: '${colors.text}66', marginTop: '0.8rem', maxWidth: '400px', margin: '0.8rem auto 0' }}>Every feature engineered for competitive excellence.</p>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1px', background: '${colors.border}' }}>
          {FEATURES.map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              style={{ background: '${colors.bg}', padding: '2.2rem', cursor: 'default', transition: 'background 0.3s' }}
              onMouseEnter={e => e.currentTarget.style.background = '${colors.surface}'}
              onMouseLeave={e => e.currentTarget.style.background = '${colors.bg}'}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ color: '${colors.text}', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>{f.title}</h3>
              <p style={{ color: '${colors.text}55', fontSize: '0.85rem', lineHeight: 1.65 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}`
}

// Fashion: Collection grid + Brand story
function genFashionSections(content, colors, veoData) {
  return `import { motion } from 'framer-motion'

const PIECES = [
  { name: 'The Obsidian Coat', season: 'AW 2025', tag: 'Limited' },
  { name: 'Silk Evening Dress', season: 'SS 2025', tag: 'New' },
  { name: 'Structured Blazer', season: 'AW 2025', tag: 'Bestseller' },
  { name: 'Heritage Trousers', season: 'Core Collection', tag: 'Essential' },
]

export default function Sections() {
  return (
    <>
      {/* ── Collection grid ───────────────────────────────────── */}
      <section id="collections" style={{ background: '${colors.bg}', padding: '7rem 6%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 700, color: '${colors.text}', lineHeight: 0.95 }}>
            The<br/>Collection
          </h2>
          <a href="#" style={{ color: '${colors.primary}', fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none' }}>
            View All →
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          {PIECES.map((piece, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ cursor: 'pointer' }}
            >
              {/* Image placeholder */}
              <div style={{
                height: '420px',
                background: 'linear-gradient(180deg, ${colors.surface} 0%, ${adjustBrightness(colors.surface, 12)} 100%)',
                marginBottom: '1rem',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <span style={{ position: 'absolute', top: '1rem', left: '1rem', background: '${colors.primary}', color: '#fff', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.25rem 0.6rem', fontWeight: 700 }}>{piece.tag}</span>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '${colors.text}22', fontSize: '3rem' }}>◻</div>
              </div>
              <p style={{ color: '${colors.text}55', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{piece.season}</p>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: '${colors.text}', fontWeight: 600, fontSize: '1rem' }}>{piece.name}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Brand story ──────────────────────────────────────────── */}
      <section id="about" style={{ background: '${colors.surface}', padding: '8rem 6%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6rem', alignItems: 'center' }}>
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <p style={{ color: '${colors.primary}', fontSize: '0.75rem', letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1.5rem' }}>Our Story</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 3.5vw, 3rem)', color: '${colors.text}', lineHeight: 1.1, marginBottom: '1.8rem' }}>
            Craftsmanship<br/>over everything.
          </h2>
          <p style={{ color: '${colors.text}77', lineHeight: 1.8, marginBottom: '1.2rem' }}>
            Founded on the belief that true luxury lies in materials you can feel, cuts that endure, and silhouettes that define rather than follow.
          </p>
          <p style={{ color: '${colors.text}77', lineHeight: 1.8 }}>
            Every piece is produced in limited quantities, hand-finished in our atelier, and built to become part of your personal history.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }}
          style={{ height: '560px', background: 'linear-gradient(135deg, ${colors.bg}, ${colors.border})', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '${colors.text}22', fontSize: '4rem' }}
        >◻</motion.div>
      </section>
    </>
  )
}`
}

// Tech: Stats + Features + Pricing
function genTechSections(content, colors, veoData) {
  const motions = veoData?.motion_effects ?? []
  return `import { motion } from 'framer-motion'

const FEATURES = [
  { icon: '⚡', title: 'Lightning Fast', desc: 'Optimised infrastructure delivering sub-100ms response times globally.' },
  { icon: '🔒', title: 'Enterprise Security', desc: 'SOC2 Type II certified with end-to-end encryption at rest and in transit.' },
  { icon: '🤖', title: 'AI-Powered', desc: 'Intelligent automation that learns and adapts to your specific workflow.' },
  { icon: '🔗', title: '200+ Integrations', desc: 'Connect with every tool in your stack through our open API.' },
  { icon: '📊', title: 'Real-time Analytics', desc: 'Live dashboards with customisable KPIs and automated reporting.' },
  { icon: '🌍', title: 'Global Scale', desc: '12 regions, 99.99% SLA, and automatic failover to keep you running.' },
]
const PLANS = [
  { name: 'Starter', price: '$29', unit: '/mo', features: ['Up to 5 users', '10GB storage', 'API access', 'Email support'], cta: 'Start Free Trial', highlight: false },
  { name: 'Growth',  price: '$99', unit: '/mo', features: ['Unlimited users', '100GB storage', 'Priority API', 'Slack support', 'Custom domain'], cta: 'Start Free Trial', highlight: true },
  { name: 'Enterprise', price: 'Custom', unit: '', features: ['Everything in Growth', 'Dedicated infra', 'SSO / SAML', 'SLA guarantee', 'Custom contracts'], cta: 'Talk to Sales', highlight: false },
]

const FV = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } }
const FI = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } } }

export default function Sections() {
  return (
    <>
      {/* ── Features ──────────────────────────────────────────── */}
      <section id="product" style={{ background: '${colors.bg}', padding: '7rem 8%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ maxWidth: '560px', marginBottom: '4rem' }}>
          <p style={{ color: '${colors.primary}', fontSize: '0.78rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>Platform</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '${colors.text}', lineHeight: 1.05 }}>
            Everything your team needs, nothing it doesn't.
          </h2>
        </motion.div>
        <motion.div variants={FV} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1px', background: '${colors.border}' }}
        >
          {FEATURES.map((f, i) => (
            <motion.div key={i} variants={FI}
              style={{ background: '${colors.bg}', padding: '2.5rem 2rem', transition: 'background 0.25s' }}
              onMouseEnter={e => e.currentTarget.style.background = '${colors.surface}'}
              onMouseLeave={e => e.currentTarget.style.background = '${colors.bg}'}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '1.2rem' }}>{f.icon}</div>
              <h3 style={{ color: '${colors.text}', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.6rem' }}>{f.title}</h3>
              <p style={{ color: '${colors.text}55', fontSize: '0.85rem', lineHeight: 1.7 }}>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section id="pricing" style={{ background: '${colors.surface}', padding: '7rem 8%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p style={{ color: '${colors.primary}', fontSize: '0.78rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>Pricing</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3rem)', color: '${colors.text}' }}>
            Simple, transparent pricing.
          </h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          {PLANS.map((plan, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}
              style={{
                background: plan.highlight ? '${colors.primary}' : '${colors.bg}',
                border: plan.highlight ? 'none' : '1px solid ${colors.border}',
                borderRadius: '12px', padding: '2.2rem',
                transform: plan.highlight ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              <p style={{ color: plan.highlight ? 'rgba(255,255,255,0.7)' : '${colors.text}66', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.8rem' }}>{plan.name}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', marginBottom: '2rem' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 800, color: plan.highlight ? '#fff' : '${colors.text}' }}>{plan.price}</span>
                <span style={{ color: plan.highlight ? 'rgba(255,255,255,0.6)' : '${colors.text}55', fontSize: '0.85rem' }}>{plan.unit}</span>
              </div>
              <ul style={{ listStyle: 'none', marginBottom: '2rem' }}>
                {plan.features.map((feat, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.7rem', color: plan.highlight ? 'rgba(255,255,255,0.85)' : '${colors.text}88', fontSize: '0.87rem' }}>
                    <span style={{ color: plan.highlight ? '#fff' : '${colors.primary}' }}>✓</span> {feat}
                  </li>
                ))}
              </ul>
              <button style={{
                width: '100%',
                background: plan.highlight ? '#fff' : '${colors.primary}',
                color: plan.highlight ? '${colors.primary}' : '#fff',
                border: 'none', borderRadius: '8px',
                padding: '0.85rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              }}>
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}`
}

// Music: Show listings + Artists + Tickets CTA
function genMusicSections(content, colors, veoData) {
  return `import { motion } from 'framer-motion'

const SHOWS = [
  { city: 'New York', venue: 'Madison Square Garden', date: 'Dec 14, 2025', support: 'Special Guest TBA', status: 'On Sale' },
  { city: 'Los Angeles', venue: 'The Forum', date: 'Dec 19, 2025', support: 'Support Act Announced Soon', status: 'On Sale' },
  { city: 'London', venue: 'O2 Arena', date: 'Jan 8, 2026', support: 'Opening: Neon Bloom', status: 'Selling Fast' },
  { city: 'Berlin', venue: 'Tempodrom', date: 'Jan 15, 2026', support: 'Opening: Static Wave', status: 'Available' },
]

export default function Sections() {
  return (
    <>
      {/* ── Tour dates ────────────────────────────────────────── */}
      <section id="shows" style={{ background: '${colors.bg}', padding: '7rem 8%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: '3rem' }}>
          <p style={{ color: '${colors.primary}', fontSize: '0.78rem', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>Tour Dates</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '${colors.text}', fontWeight: 900 }}>Live Shows</h2>
        </motion.div>
        {SHOWS.map((show, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.8rem 0', borderBottom: '1px solid ${colors.border}', gap: '2rem', flexWrap: 'wrap' }}
          >
            <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
              <div>
                <div style={{ color: '${colors.text}55', fontSize: '0.8rem', marginBottom: '0.2rem' }}>{show.date}</div>
                <div style={{ color: '${colors.text}', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>{show.city}</div>
              </div>
              <div>
                <div style={{ color: '${colors.text}', fontSize: '0.92rem' }}>{show.venue}</div>
                <div style={{ color: '${colors.text}44', fontSize: '0.78rem', marginTop: '0.2rem' }}>{show.support}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
              <span style={{ color: show.status === 'Selling Fast' ? '${colors.accent}' : '${colors.primary}', fontSize: '0.78rem', fontWeight: 700 }}>{show.status}</span>
              <button style={{ background: '${colors.primary}', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.6rem 1.6rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                Get Tickets
              </button>
            </div>
          </motion.div>
        ))}
      </section>
    </>
  )
}`
}

// Fitness: Programs + Trainers + Booking CTA
function genFitnessSections(content, colors, veoData) {
  return `import { motion } from 'framer-motion'

const PROGRAMS = [
  { name: 'Strength Foundation', duration: '12 weeks', level: 'Beginner–Intermediate', sessions: '4x/week', desc: 'Build a bulletproof base with progressive overload principles.' },
  { name: 'Elite Performance', duration: '16 weeks', level: 'Advanced', sessions: '6x/week', desc: 'Competition-level programming for serious athletes.' },
  { name: 'Lean & Athletic', duration: '8 weeks', level: 'All levels', sessions: '5x/week', desc: 'Body recomposition with functional strength training.' },
]
const TRAINERS = [
  { name: 'Alex Carter', role: 'Head Strength Coach', certs: 'NSCA-CSCS, Precision Nutrition' },
  { name: 'Maya Singh', role: 'Performance Specialist', certs: 'USAW, CrossFit L3' },
  { name: 'James O\'Brien', role: 'Recovery & Mobility', certs: 'FMS, SFMA Certified' },
]

export default function Sections() {
  return (
    <>
      {/* ── Programs ──────────────────────────────────────────── */}
      <section id="programs" style={{ background: '${colors.bg}', padding: '7rem 8%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: '3.5rem' }}>
          <p style={{ color: '${colors.primary}', fontSize: '0.78rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>Training Programs</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '${colors.text}', fontWeight: 900 }}>
            Pick your programme.<br/>Start today.
          </h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {PROGRAMS.map((prog, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              style={{ background: '${colors.surface}', borderRadius: '12px', padding: '2.2rem', border: '1px solid ${colors.border}' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                <h3 style={{ color: '${colors.text}', fontWeight: 700, fontSize: '1.05rem', fontFamily: 'var(--font-heading)' }}>{prog.name}</h3>
                <span style={{ background: '${colors.primary}22', color: '${colors.primary}', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 700 }}>{prog.level}</span>
              </div>
              <p style={{ color: '${colors.text}66', fontSize: '0.85rem', lineHeight: 1.65, marginBottom: '1.5rem' }}>{prog.desc}</p>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.8rem' }}>
                <div><div style={{ color: '${colors.text}44', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Duration</div><div style={{ color: '${colors.text}', fontSize: '0.88rem', fontWeight: 600 }}>{prog.duration}</div></div>
                <div><div style={{ color: '${colors.text}44', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Frequency</div><div style={{ color: '${colors.text}', fontSize: '0.88rem', fontWeight: 600 }}>{prog.sessions}</div></div>
              </div>
              <button style={{ width: '100%', background: '${colors.primary}', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.8rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                Start This Program
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Trainers ──────────────────────────────────────────── */}
      <section id="trainers" style={{ background: '${colors.surface}', padding: '6rem 8%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3rem)', color: '${colors.text}', fontWeight: 900 }}>World-Class Coaches</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          {TRAINERS.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} style={{ textAlign: 'center' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, ${colors.primary}, ${colors.secondary})', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>👤</div>
              <h3 style={{ color: '${colors.text}', fontWeight: 700, marginBottom: '0.25rem' }}>{t.name}</h3>
              <p style={{ color: '${colors.primary}', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{t.role}</p>
              <p style={{ color: '${colors.text}44', fontSize: '0.75rem' }}>{t.certs}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}`
}

// Finance: Stats + Product features + Trust signals
function genFinanceSections(content, colors, veoData) {
  return `import { motion } from 'framer-motion'

const METRICS = [
  { value: '$2.4B+', label: 'Assets Managed' },
  { value: '187K+', label: 'Active Investors' },
  { value: '94.7%', label: 'Satisfaction Rate' },
  { value: '12yrs', label: 'Track Record' },
]
const PRODUCTS = [
  { name: 'Smart Portfolio', desc: 'AI-rebalanced diversified portfolio. Set your risk level, we do the rest.', return: '+18.4% avg.' },
  { name: 'Crypto Index', desc: 'Exposure to the top 20 digital assets with automatic rebalancing.', return: '+47.2% avg.' },
  { name: 'Fixed Income', desc: 'Stable returns with corporate and government bond laddering.', return: '+7.1% avg.' },
]

export default function Sections() {
  return (
    <>
      {/* ── Metrics banner ────────────────────────────────────── */}
      <section style={{ background: '${colors.surface}', padding: '4rem 8%', borderTop: '1px solid ${colors.border}', borderBottom: '1px solid ${colors.border}' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          {METRICS.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.8rem, 2.5vw, 2.5rem)', fontWeight: 800, color: '${colors.primary}' }}>{m.value}</div>
              <div style={{ color: '${colors.text}55', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.3rem' }}>{m.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Products ──────────────────────────────────────────── */}
      <section id="products" style={{ background: '${colors.bg}', padding: '7rem 8%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: '3.5rem' }}>
          <p style={{ color: '${colors.primary}', fontSize: '0.78rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>Investment Products</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3rem)', color: '${colors.text}' }}>Choose your strategy.</h2>
        </motion.div>
        {PRODUCTS.map((prod, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 0', borderBottom: '1px solid ${colors.border}', gap: '2rem', flexWrap: 'wrap' }}
          >
            <div style={{ flex: 1 }}>
              <h3 style={{ color: '${colors.text}', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.4rem' }}>{prod.name}</h3>
              <p style={{ color: '${colors.text}66', fontSize: '0.88rem' }}>{prod.desc}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '${colors.primary}', fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>{prod.return}</div>
              <div style={{ color: '${colors.text}44', fontSize: '0.72rem' }}>historical avg.</div>
            </div>
            <button style={{ background: '${colors.primary}', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.7rem 1.8rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              Invest Now
            </button>
          </motion.div>
        ))}
      </section>
    </>
  )
}`
}

// Travel: Destinations + Experiences
function genTravelSections(content, colors, veoData) {
  return `import { motion } from 'framer-motion'

const DESTINATIONS = [
  { name: 'Santorini, Greece', tag: 'Romantic', nights: '7 nights from $1,890' },
  { name: 'Kyoto, Japan', tag: 'Cultural', nights: '10 nights from $2,450' },
  { name: 'Maldives', tag: 'Luxury', nights: '5 nights from $3,200' },
  { name: 'Patagonia', tag: 'Adventure', nights: '14 nights from $4,100' },
  { name: 'Morocco', tag: 'Discovery', nights: '8 nights from $1,640' },
  { name: 'New Zealand', tag: 'Nature', nights: '12 nights from $3,800' },
]

export default function Sections() {
  return (
    <section id="destinations" style={{ background: '${colors.bg}', padding: '7rem 6%' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <p style={{ color: '${colors.primary}', fontSize: '0.78rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.8rem' }}>Destinations</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '${colors.text}' }}>Where to next?</h2>
        </div>
        <a href="#" style={{ color: '${colors.primary}', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>All destinations →</a>
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {DESTINATIONS.map((dest, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', border: '1px solid ${colors.border}' }}
          >
            <div style={{ height: '220px', background: 'linear-gradient(135deg, ${colors.surface}, ${adjustBrightness(colors.primary, -50)})', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem' }}>
              🌍
              <span style={{ position: 'absolute', top: '1rem', left: '1rem', background: '${colors.primary}', color: '#fff', fontSize: '0.7rem', padding: '0.25rem 0.7rem', borderRadius: '4px', fontWeight: 700 }}>{dest.tag}</span>
            </div>
            <div style={{ padding: '1.4rem', background: '${colors.surface}' }}>
              <h3 style={{ color: '${colors.text}', fontWeight: 700, marginBottom: '0.3rem' }}>{dest.name}</h3>
              <p style={{ color: '${colors.primary}', fontSize: '0.82rem', fontWeight: 600 }}>{dest.nights}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}`
}

// Education: Course grid + CTA
function genEducationSections(content, colors, veoData) {
  return `import { motion } from 'framer-motion'

const COURSES = [
  { name: 'Full-Stack Development', level: 'Beginner', duration: '24 weeks', students: '12,400', rating: '4.9' },
  { name: 'Data Science & ML', level: 'Intermediate', duration: '20 weeks', students: '8,200', rating: '4.8' },
  { name: 'UX/UI Design', level: 'Beginner', duration: '16 weeks', students: '9,600', rating: '4.9' },
  { name: 'Cloud Architecture', level: 'Advanced', duration: '12 weeks', students: '4,100', rating: '4.7' },
]

export default function Sections() {
  return (
    <section id="courses" style={{ background: '${colors.bg}', padding: '7rem 8%' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <p style={{ color: '${colors.primary}', fontSize: '0.78rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>Courses</p>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '${colors.text}' }}>
          Learn in-demand skills.
        </h2>
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {COURSES.map((course, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            style={{ background: '${colors.surface}', borderRadius: '12px', padding: '2rem', border: '1px solid ${colors.border}', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ background: '${colors.primary}22', color: '${colors.primary}', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 700 }}>{course.level}</span>
              <span style={{ color: '${colors.accent}', fontSize: '0.82rem', fontWeight: 700 }}>★ {course.rating}</span>
            </div>
            <h3 style={{ color: '${colors.text}', fontWeight: 700, fontSize: '1rem', marginBottom: '1.2rem', fontFamily: 'var(--font-heading)' }}>{course.name}</h3>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ color: '${colors.text}55', fontSize: '0.78rem' }}>📅 {course.duration}</div>
              <div style={{ color: '${colors.text}55', fontSize: '0.78rem' }}>👥 {course.students} students</div>
            </div>
            <button style={{ width: '100%', background: '${colors.primary}', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
              Enroll Free
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  )
}`
}

// Creative: Work grid + Services
function genCreativeSections(content, colors, veoData) {
  return `import { motion } from 'framer-motion'

const WORK = [
  { title: 'Brand Identity', client: 'Series A Startup', year: '2025', type: 'Branding' },
  { title: 'Campaign Film', client: 'Global Retailer', year: '2025', type: 'Film & Motion' },
  { title: 'Product Launch', client: 'Tech Unicorn', year: '2024', type: 'Strategy + Design' },
  { title: 'Digital Experience', client: 'Cultural Institution', year: '2024', type: 'Web Design' },
]
const SERVICES = ['Brand Strategy', 'Visual Identity', 'Motion Design', 'Campaigns', 'Web Experience', 'Art Direction']

export default function Sections() {
  return (
    <>
      <section id="work" style={{ background: '${colors.bg}', padding: '7rem 6%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(3rem, 6vw, 6rem)', fontWeight: 900, color: '${colors.text}', lineHeight: 0.92, letterSpacing: '-0.03em' }}>
            Selected<br/>Work
          </h2>
        </motion.div>
        {WORK.map((item, i) => (
          <motion.div key={i}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px 160px', gap: '2rem', alignItems: 'center', padding: '1.8rem 0', borderBottom: '1px solid ${colors.border}', cursor: 'pointer', transition: 'padding-left 0.3s' }}
            onMouseEnter={e => e.currentTarget.style.paddingLeft = '1rem'}
            onMouseLeave={e => e.currentTarget.style.paddingLeft = '0'}
          >
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '${colors.text}', fontWeight: 700 }}>{item.title}</h3>
            <p style={{ color: '${colors.text}55' }}>{item.client}</p>
            <p style={{ color: '${colors.text}33', fontSize: '0.85rem' }}>{item.type}</p>
            <p style={{ color: '${colors.text}33', fontSize: '0.85rem', textAlign: 'right' }}>{item.year}</p>
          </motion.div>
        ))}
      </section>

      <section id="services" style={{ background: '${colors.surface}', padding: '7rem 6%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6rem', alignItems: 'start' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 3.5vw, 3.5rem)', color: '${colors.text}', fontWeight: 800 }}>What we do</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
            {SERVICES.map((s, i) => (
              <motion.span key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                style={{ display: 'inline-block', border: '1px solid ${colors.border}', borderRadius: '50px', padding: '0.6rem 1.4rem', color: '${colors.text}', fontSize: '0.88rem', fontWeight: 500, cursor: 'default', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.target.style.background = '${colors.primary}'; e.target.style.borderColor = '${colors.primary}'; e.target.style.color = '#fff' }}
                onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = '${colors.border}'; e.target.style.color = '${colors.text}' }}
              >{s}</motion.span>
            ))}
          </div>
        </motion.div>
      </section>
    </>
  )
}`
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function genFooterJsx(content, colors, industry) {
  const links = industryNavLinks(industry)
  return `export default function Footer() {
  return (
    <footer style={{ background: '${adjustBrightness(colors.bg, -8)}', borderTop: '1px solid ${colors.border}', padding: '4rem 8% 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.3rem', color: '${colors.text}', marginBottom: '0.6rem' }}>${content.name}</div>
          <p style={{ color: '${colors.text}44', fontSize: '0.85rem', maxWidth: '280px', lineHeight: 1.6 }}>${content.sub}</p>
        </div>
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          {${JSON.stringify(links)}.map(link => (
            <a key={link} href={\`#\${link.toLowerCase()}\`} style={{ color: '${colors.text}55', textDecoration: 'none', fontSize: '0.88rem', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '${colors.text}'}
              onMouseLeave={e => e.target.style.color = '${colors.text}55'}
            >{link}</a>
          ))}
        </div>
      </div>
      <div style={{ borderTop: '1px solid ${colors.border}', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: '${colors.text}33', fontSize: '0.78rem' }}>© ${new Date().getFullYear()} ${content.name}. All rights reserved.</p>
        <p style={{ color: '${colors.text}22', fontSize: '0.72rem' }}>Built with Getartifact</p>
      </div>
    </footer>
  )
}`
}

// ─── App.jsx ──────────────────────────────────────────────────────────────────

function genAppJsx(content, colors) {
  return `import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Sections from './components/Sections'
import Footer from './components/Footer'

export default function App() {
  return (
    <div style={{ background: '${colors.bg}', minHeight: '100vh' }}>
      <Navbar />
      <Hero />
      <main id="main-content">
        <Sections />
      </main>
      <Footer />
    </div>
  )
}`
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Build a complete deploy-ready React project from Veo data.
 *
 * @param {object}  veoData   — structured Veo prompt data (color_palette, ui_style, etc.)
 * @param {string}  prompt    — original user prompt
 * @param {string?} videoUrl  — optional: URL of the generated video (fills Hero src)
 * @returns {{ files: Record<string, string>, installCmd: string }}
 */
export function buildVideoSite(veoData, prompt, videoUrl = '') {
  const colors   = extractColors(veoData)
  const industry = classifyBusiness(veoData, prompt)
  const fonts    = pickFonts(industry, veoData)
  const content  = extractContent(veoData, prompt)

  const files = {
    'package.json':              genPackageJson(content.name),
    'index.html':                genIndexHtml(content.name, fonts),
    'vite.config.js':            genViteConfig(),
    'tailwind.config.js':        genTailwindConfig(colors),
    'postcss.config.js':         genPostcssConfig(),
    'src/main.jsx':              genMainJsx(),
    'src/App.jsx':               genAppJsx(content, colors),
    'src/index.css':             genIndexCss(colors, fonts),
    'src/components/Navbar.jsx': genNavbarJsx(content, colors, industry),
    'src/components/Hero.jsx':   genHeroJsx(content, colors, fonts, videoUrl),
    'src/components/Sections.jsx': genSectionsJsx(industry, content, colors, veoData),
    'src/components/Footer.jsx': genFooterJsx(content, colors, industry),
  }

  return {
    files,
    industry,
    colors,
    fonts,
    content,
    installCmd: 'npm install',
    devCmd:     'npm run dev',
    buildCmd:   'npm run build',
  }
}

/**
 * Inject a video URL into an already-generated Hero.jsx source string.
 * Call this when the background video finishes rendering.
 */
export function injectVideoUrl(heroJsx, videoUrl) {
  return heroJsx.replace(
    /const VIDEO_URL = '[^']*'/,
    `const VIDEO_URL = '${videoUrl}'`
  )
}

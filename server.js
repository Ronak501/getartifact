/**
 * AI 3D Website Builder — Express API Server
 *
 * Endpoints:
 *   POST /api/generate-blueprint         — AI model → JSON architecture blueprint
 *   POST /api/generate-website-blueprint — AI model → render-ready website JSON
 *   POST /api/generate-veo-prompt        — AI model → cinematic Veo prompt JSON
 *   POST /api/generate-video             — Veo 2 on Vertex AI → video (SSE stream)
 *   POST /api/check-credits              — Check user credits & plan
 *   GET  /api/video-proxy                — Proxy GCS video URI to browser
 *   GET  /api/health                     — Health check
 *
 * Model routing (plan → model):
 *   free/starter → Groq   llama-3.3-70b-versatile
 *   growth       → Gemini gemini-2.5-flash
 *   pro          → Claude claude-sonnet-4-6
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { GoogleAuth } from 'google-auth-library'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { buildFileTree, generateAppJSX } from './src/core/CodeGenerator.js'

// ─── Init AI clients ──────────────────────────────────────────────────────────
const app = express()
const PORT = process.env.PORT ?? 3001

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const googleAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY ?? '',
})

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const gauth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
})

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? ''

const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',').map(o => o.trim())
app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no origin (curl, Postman) or matching origins
    if (!origin || ALLOWED_ORIGINS.includes(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
}))
app.use(express.json({ limit: '4mb' }))

// ─── Plan config ──────────────────────────────────────────────────────────────

const PLAN_MODEL = {
  free: 'groq',
  starter: 'groq',
  growth: 'gemini',
  pro: 'claude',
}

const PLAN_LIMITS = { free: 3, starter: 10, growth: 50, pro: -1 }

// ─── Auth + credit helpers ───────────────────────────────────────────────────

/**
 * Resolve a user's plan and credit info from Supabase using their JWT.
 * Returns { userId, plan, builds_used, builds_limit, can_build } or null.
 */
async function resolveUserCredits(authHeader) {
  if (!authHeader?.startsWith('Bearer ') || !SUPABASE_URL) return null
  const jwt = authHeader.slice(7)
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const { data: profile } = await sb
      .from('profiles')
      .select('plan, builds_used, builds_limit, video_used, video_limit, builds_reset_at')
      .eq('id', user.id)
      .single()

    if (!profile) return { userId: user.id, plan: 'free', builds_used: 0, builds_limit: 3, can_build: true, sb }

    const limit = profile.builds_limit ?? PLAN_LIMITS[profile.plan ?? 'free'] ?? 3
    return {
      userId: user.id,
      plan: profile.plan ?? 'free',
      builds_used: profile.builds_used ?? 0,
      builds_limit: limit,
      video_used: profile.video_used ?? 0,
      video_limit: profile.video_limit ?? 0,
      can_build: limit === -1 || (profile.builds_used ?? 0) < limit,
      sb,
    }
  } catch { return null }
}

/**
 * Increment builds_used for a user. Safe to call fire-and-forget.
 */
async function incrementBuildCount(sb, userId) {
  try {
    await sb.rpc('increment_builds_used', { user_id: userId })
  } catch {
    // Fallback: direct update
    try {
      await sb
        .from('profiles')
        .update({ builds_used: sb.raw('builds_used + 1') })
        .eq('id', userId)
    } catch { /* non-fatal */ }
  }
}

/**
 * Generate blueprint text using the model for the given plan.
 */
async function generateWithModel(plan, systemPrompt, userPrompt) {
  const model = PLAN_MODEL[plan] ?? 'groq'

  if (model === 'claude') {
    const msg = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    return msg.content[0].text.trim()
  }

  if (model === 'gemini') {
    const response = await googleAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.9,
        maxOutputTokens: 4096,
      },
    })
    return response.text.trim()
  }

  // Default: Groq
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })
  return completion.choices[0].message.content.trim()
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({
  ok: true,
  project: process.env.GOOGLE_PROJECT_ID ?? 'Getartifact',
}))

// ─── Check credits ────────────────────────────────────────────────────────────
app.post('/api/check-credits', async (req, res) => {
  const credits = await resolveUserCredits(req.headers.authorization)
  if (!credits) return res.json({ authenticated: false, can_build: true })   // unauthenticated — allow (no gate)
  res.json({
    authenticated: true,
    plan: credits.plan,
    builds_used: credits.builds_used,
    builds_limit: credits.builds_limit,
    video_used: credits.video_used,
    video_limit: credits.video_limit,
    can_build: credits.can_build,
  })
})

// ─── Blueprint generation (plan-routed) ──────────────────────────────────────
app.post('/api/generate-blueprint', async (req, res) => {
  const { prompt, intent } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' })

  // Credit check
  const credits = await resolveUserCredits(req.headers.authorization)
  if (credits && !credits.can_build) {
    return res.status(402).json({
      error: 'Build limit reached',
      code: 'LIMIT_REACHED',
      plan: credits.plan,
      used: credits.builds_used,
      limit: credits.builds_limit,
    })
  }
  const plan = credits?.plan ?? 'free'

  const SYSTEM = `You are Getartifact — an award-winning AI Website Builder, UI/UX designer, creative director, and React developer.

PRIME DIRECTIVE: Every website must feel completely custom-made. Never reuse the same design twice.

DESIGN VARIATION ENGINE — randomly pick ONE visual identity per request:
Cyberpunk · Brutalist · Minimal Luxury · Editorial · Organic Nature · Scandinavian · Japanese Zen
Neo Futurism · Space Tech · Gaming · Retro Futurism · Dark Premium · Glassmorphism · Claymorphism
Swiss Design · Industrial · Magazine · Luxury Fashion · Architectural · Creative Studio
Modern Startup · Vibrant Gradient · Experimental · Abstract Geometry

COLOR ENGINE — match palette to industry:
Restaurant: warm reds, orange, cream · Healthcare: blue, white, teal · Luxury: black & gold
Gaming: purple, neon cyan · Nature: green, beige · Travel: sky blue, sunset orange
Architecture: concrete gray, white · Music: bold gradients · Crypto: electric blue, neon green
Fashion: black, rose gold, ivory · Fitness: electric orange, deep black · Education: indigo, warm yellow

LAYOUT ENGINE — randomize layouts (never repeat):
Left hero · Center hero · Split hero · Bento layout · Fullscreen hero · Magazine grid
Zig-zag sections · Timeline layout · Card-based · Horizontal scrolling · Masonry · Storytelling

TYPOGRAPHY ENGINE — randomly combine premium fonts:
Elegant Serif · Geometric Sans · Editorial · Minimal · Luxury · Tech · Bold Display · Modern Mono

MOTION ENGINE — assign unique animation style per site:
Smooth fade · Magnetic hover · 3D tilt · Parallax · Morphing blobs · Particles · Cursor follower
Split text · Image reveal · Scroll storytelling

RULES:
- Return ONLY valid JSON — no markdown, no code fences, no extra text.
- JSON must match the schema exactly.
- Never use placeholder text — generate real, specific content.
- Design quality must be Apple / Stripe / Linear / Framer level.
- Every website must have different colors, layouts, typography, animations.
- If two prompts are from different industries, their designs must look like different agencies made them.

JSON SCHEMA:
{
  "version": "1.0.0",
  "meta": { "generatedAt": "<ISO date>", "prompt": "<original prompt>" },
  "concept": {
    "websiteName": "", "tagline": "", "businessType": "", "targetAudience": "",
    "uniqueSellingProposition": "",
    "designStyle": "<Futuristic|Cyberpunk|Minimal|Luxury|Corporate|Startup|Gaming|Space|AI|Glassmorphism|Neumorphism>",
    "brandPersonality": ["", "", ""]
  },
  "palette": {
    "primary": "#hex", "secondary": "#hex", "accent": "#hex",
    "background": "#hex", "surface": "#hex", "text": "#hex", "textMuted": "#hex"
  },
  "typography": {
    "displayFont": "Syne", "bodyFont": "Inter", "monoFont": "JetBrains Mono",
    "scale": { "hero": "text-6xl lg:text-8xl", "heading": "text-4xl lg:text-5xl", "subhead": "text-2xl lg:text-3xl", "body": "text-base lg:text-lg" }
  },
  "pages": [
    {
      "name": "", "path": "/",
      "sections": [
        {
          "id": "", "name": "", "purpose": "", "animation": "",
          "threeObject": "<floating-sphere|torus-knot|icosahedron|octahedron|ai-brain|particle-field|planet|crystal|dna-helix|neural-network|geometric-grid|black-hole>",
          "content": {}
        }
      ]
    }
  ],
  "videoScript": {
    "duration": 55, "resolution": "1920x1080", "fps": 60, "style": "",
    "scenes": [{ "id": 1, "name": "", "duration": 5, "camera": "", "elements": [], "description": "" }],
    "aiVideoPrompt": ""
  },
  "tech": {
    "framework": "React 18", "renderer": "React Three Fiber", "helpers": ["Drei", "Leva"],
    "animation": ["GSAP", "Framer Motion"], "styling": "Tailwind CSS v3", "state": "Zustand", "build": "Vite 5"
  },
  "components": {
    "layout": ["Navbar", "Footer", "ScrollProgress"],
    "sections": [], "threeD": ["ParticleField", "CameraRig"], "pages": []
  },
  "seo": { "title": "", "description": "", "keywords": [], "ogImage": "/og-image.jpg" }
}`

  const _industry2 = classifyIndustry(prompt)
  const _v = getVariation(_industry2)

  const USER = `Generate a complete website blueprint for:
"${prompt}"

MANDATORY DESIGN SPECIFICATION — follow exactly:
- Industry: ${_industry2}
- Visual style: "${_v.style}"
- Layout: "${_v.layout}"
- Primary 3D object: "${_v.threeDObj}"
- Secondary 3D object: "${_v.threeDObj2}"
- Animation style: "${_v.animation}"
- Colors: background ${_v.palette.bg}, primary ${_v.palette.primary}, secondary ${_v.palette.secondary}, accent ${_v.palette.accent}

Pre-analyzed intent:
- Website Name: ${intent?.websiteName ?? 'unknown'}
- Pages: ${intent?.pages?.join(', ') ?? 'Home, About, Services, Contact'}

Generate 3-5 pages, 3-6 sections each, 7 video scenes (~55s total).
Return ONLY the JSON blueprint object.`

  try {
    const raw = await generateWithModel(plan, SYSTEM, USER)
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const blueprint = JSON.parse(clean)

    // Increment build count asynchronously
    if (credits?.sb && credits.userId) {
      incrementBuildCount(credits.sb, credits.userId)
    }

    res.json({ blueprint, plan })
  } catch (err) {
    console.error('[generate-blueprint]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Veo prompt generation ────────────────────────────────────────────────────
app.post('/api/generate-veo-prompt', async (req, res) => {
  const { prompt, blueprint } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' })

  const b = blueprint ?? {}

  const SYSTEM_INSTRUCTION = `You are an elite Website Creative Director, UI/UX Designer, Motion Designer, and 3D Web Architect.

Your task is to convert a user's website idea into a cinematic AI video generation prompt for Google Veo 2.

The Veo prompt must:
- Be written as ONE continuous paragraph (no line breaks, no bullets inside veo_prompt)
- Describe the website as if it is being filmed in a real cinematic shoot
- Show all website sections with camera transitions
- Include specific camera movements (dolly, orbit, push, pull, tilt, pan)
- Include glassmorphism UI panels with frosted glass and blur
- Include 3D floating objects with physics-based motion
- Include particle systems and volumetric lighting
- Include realistic cursor interactions showing hover states
- Include scroll-triggered parallax and depth animations
- Include premium typography animations
- Include photorealistic UI content (actual headlines, CTAs, card content)
- Be at least 500 words long for maximum detail
- End dramatically with the hero CTA glowing

Video specs: 60 seconds, 4K, 60fps, Cinematic, Volumetric, Photorealistic.

Return ONLY valid JSON — no markdown, no code fences:
{
  "website_name": "",
  "business_type": "",
  "target_audience": "",
  "brand_personality": "",
  "color_palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "typography": "",
  "ui_style": "",
  "3d_elements": ["", "", ""],
  "motion_effects": ["", "", "", ""],
  "veo_prompt": ""
}`

  const userMessage = `Generate a complete cinematic Veo 2 video prompt for this website:

USER WEBSITE IDEA:
${prompt}

PRE-ANALYZED BLUEPRINT:
- Website Name: ${b.concept?.websiteName ?? 'N/A'}
- Business Type: ${b.concept?.businessType ?? 'N/A'}
- Design Style: ${b.concept?.designStyle ?? 'Futuristic'}
- Brand Personality: ${b.concept?.brandPersonality?.join(', ') ?? 'N/A'}
- USP: ${b.concept?.uniqueSellingProposition ?? 'N/A'}
- Primary: ${b.palette?.primary ?? '#3d5eff'}, Secondary: ${b.palette?.secondary ?? '#00d4ff'}, Accent: ${b.palette?.accent ?? '#bf5fff'}
- Background: ${b.palette?.background ?? '#0a0a14'}
- 3D Objects: ${b.components?.threeD?.join(', ') ?? 'ai-brain, particle-field'}
- Pages: ${b.pages?.map(p => p.name).join(', ') ?? 'N/A'}
- Sections: ${b.pages?.flatMap(p => p.sections?.map(s => s.name) ?? []).join(', ') ?? 'N/A'}

Start the veo_prompt with: "Create a cinematic showcase video of ${b.concept?.websiteName ?? 'the website'}..."
The veo_prompt must be at least 600 words, ultra-detailed production quality.
Return ONLY the JSON object.`

  try {
    const response = await googleAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.85,
        maxOutputTokens: 4096,
      },
    })

    const raw = response.text.trim()
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const veoData = JSON.parse(clean)
    res.json({ veoData })
  } catch (err) {
    console.error('[generate-veo-prompt]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Industry classifier (mirrors WebsiteBlueprintEngine local fallback) ──────
const INDUSTRY_RULES = [
  { key: 'ecommerce', rx: /shop|store|ecommerce|e-commerce|buy|sell|product|retail|marketplace|cart/i },
  { key: 'restaurant', rx: /restaurant|food|cafe|coffee|bistro|bakery|pizza|sushi|cuisine|dining|eat|chef/i },
  { key: 'gaming', rx: /game|gaming|esport|play|gamer|rpg|fps|mmorpg|studio|indie|steam/i },
  { key: 'fintech', rx: /finance|fintech|bank|invest|crypto|defi|trading|payment|wallet|wealth|fund/i },
  { key: 'health', rx: /health|medical|clinic|doctor|fitness|wellness|gym|yoga|therapy|hospital|pharma/i },
  { key: 'education', rx: /education|school|course|learn|academy|tutor|university|college|training|teach/i },
  { key: 'travel', rx: /travel|hotel|tour|flight|adventure|vacation|resort|booking|trip|destination/i },
  { key: 'real_estate', rx: /real.?estate|property|home|house|apartment|realty|realtor|listing|mortgage/i },
  { key: 'music', rx: /music|band|album|artist|record|concert|sound|studio|dj|label|spotify/i },
  { key: 'agency', rx: /agency|creative|design|brand|marketing|advertising|digital|studio|branding/i },
  { key: 'space', rx: /space|galaxy|nasa|rocket|satellite|astronomy|cosmos|planet|sci.?fi|star.?ship/i },
  { key: 'ai_saas', rx: /ai |artificial intelligence|machine learning|ml |neural|gpt|llm|chatbot|automation/i },
  { key: 'nft', rx: /nft|web3|blockchain|token|mint|metaverse|opensea|dao|solana|eth|polygon/i },
  { key: 'consulting', rx: /consult|advisory|strategy|management|professional|law|legal|audit|enterprise/i },
  { key: 'saas', rx: /saas|software|platform|tool|app|dashboard|api|developer|b2b|startup|product/i },
]

// ─── Variation pools (server picks one randomly per request) ─────────────────

const DESIGN_STYLES = [
  'Cyberpunk', 'Brutalist', 'Minimal Luxury', 'Editorial', 'Organic Nature',
  'Scandinavian', 'Japanese Zen', 'Neo Futurism', 'Space Tech', 'Gaming',
  'Retro Futurism', 'Dark Premium', 'Glassmorphism', 'Claymorphism',
  'Swiss Design', 'Industrial', 'Magazine', 'Luxury Fashion', 'Architectural',
  'Creative Studio', 'Modern Startup', 'Vibrant Gradient', 'Abstract Geometry',
]

// Per-industry style pools (3-4 options so same industry still varies)
const INDUSTRY_STYLES = {
  ecommerce: ['Minimal Luxury', 'Editorial', 'Claymorphism', 'Modern Startup'],
  restaurant: ['Luxury Fashion', 'Organic Nature', 'Magazine', 'Japanese Zen'],
  gaming: ['Cyberpunk', 'Gaming', 'Neo Futurism', 'Dark Premium'],
  fintech: ['Swiss Design', 'Dark Premium', 'Architectural', 'Glassmorphism'],
  health: ['Scandinavian', 'Organic Nature', 'Minimal Luxury', 'Japanese Zen'],
  education: ['Modern Startup', 'Editorial', 'Vibrant Gradient', 'Claymorphism'],
  travel: ['Luxury Fashion', 'Magazine', 'Organic Nature', 'Vibrant Gradient'],
  real_estate: ['Architectural', 'Minimal Luxury', 'Industrial', 'Swiss Design'],
  music: ['Cyberpunk', 'Glassmorphism', 'Dark Premium', 'Abstract Geometry'],
  agency: ['Creative Studio', 'Brutalist', 'Editorial', 'Abstract Geometry'],
  space: ['Space Tech', 'Neo Futurism', 'Cyberpunk', 'Dark Premium'],
  ai_saas: ['Neo Futurism', 'Glassmorphism', 'Dark Premium', 'Abstract Geometry'],
  nft: ['Cyberpunk', 'Abstract Geometry', 'Neo Futurism', 'Industrial'],
  consulting: ['Swiss Design', 'Architectural', 'Editorial', 'Dark Premium'],
  saas: ['Modern Startup', 'Glassmorphism', 'Neo Futurism', 'Swiss Design'],
}

const THREE_D_OBJECTS = [
  'floating-sphere', 'torus-knot', 'icosahedron', 'octahedron',
  'ai-brain', 'particle-field', 'planet', 'crystal', 'dna-helix',
  'neural-network', 'geometric-grid', 'black-hole',
]

// Per-industry 3D pools
const INDUSTRY_THREE_D = {
  ecommerce: ['floating-sphere', 'crystal', 'icosahedron', 'octahedron'],
  restaurant: ['crystal', 'floating-sphere', 'geometric-grid'],
  gaming: ['torus-knot', 'icosahedron', 'neural-network', 'black-hole'],
  fintech: ['geometric-grid', 'neural-network', 'octahedron', 'torus-knot'],
  health: ['dna-helix', 'floating-sphere', 'icosahedron', 'crystal'],
  education: ['icosahedron', 'neural-network', 'ai-brain', 'geometric-grid'],
  travel: ['planet', 'floating-sphere', 'crystal', 'torus-knot'],
  real_estate: ['octahedron', 'geometric-grid', 'crystal', 'floating-sphere'],
  music: ['torus-knot', 'particle-field', 'geometric-grid', 'icosahedron'],
  agency: ['particle-field', 'torus-knot', 'neural-network', 'floating-sphere'],
  space: ['black-hole', 'planet', 'particle-field', 'torus-knot'],
  ai_saas: ['neural-network', 'ai-brain', 'particle-field', 'geometric-grid'],
  nft: ['icosahedron', 'torus-knot', 'crystal', 'neural-network'],
  consulting: ['geometric-grid', 'octahedron', 'neural-network', 'floating-sphere'],
  saas: ['ai-brain', 'neural-network', 'particle-field', 'geometric-grid'],
}

const LAYOUTS = [
  'Left hero with right 3D scene',
  'Full-screen centered hero with floating elements',
  'Split-screen hero (text left, visual right)',
  'Bento grid layout with asymmetric cards',
  'Magazine editorial grid',
  'Zig-zag alternating sections',
  'Fullscreen scrollytelling with sticky panels',
  'Masonry card layout',
  'Timeline with large visuals',
  'Horizontal scroll sections',
]

const COLOR_PALETTES = {
  ecommerce: [{ bg: '#0d0d0d', primary: '#ff6b35', secondary: '#ffd166', accent: '#f8f8f2', text: '#ffffff' }, { bg: '#fafaf8', primary: '#1a1a2e', secondary: '#e94560', accent: '#0f3460', text: '#1a1a1a' }, { bg: '#12111a', primary: '#c9b99a', secondary: '#8b7355', accent: '#f5f0e8', text: '#f0ece3' }],
  restaurant: [{ bg: '#1a0a00', primary: '#ff4500', secondary: '#ff8c00', accent: '#ffd700', text: '#fff8f0' }, { bg: '#0d1b0d', primary: '#4caf50', secondary: '#81c784', accent: '#fff9c4', text: '#f1f8e9' }, { bg: '#1c1410', primary: '#d4a574', secondary: '#8b6914', accent: '#f5e6d3', text: '#faf0e6' }],
  gaming: [{ bg: '#080012', primary: '#bf5fff', secondary: '#00fff7', accent: '#ff3864', text: '#e0d0ff' }, { bg: '#0a0a0a', primary: '#00ff41', secondary: '#008f11', accent: '#39ff14', text: '#00ff41' }, { bg: '#0d0221', primary: '#ff6b6b', secondary: '#feca57', accent: '#48dbfb', text: '#ffffff' }],
  fintech: [{ bg: '#060818', primary: '#00d2ff', secondary: '#3a7bd5', accent: '#7efff5', text: '#e8f4fd' }, { bg: '#0a0a0a', primary: '#ffd700', secondary: '#ff8c00', accent: '#fff3cd', text: '#ffffff' }, { bg: '#f8f9fa', primary: '#1a1a2e', secondary: '#16213e', accent: '#0f3460', text: '#212529' }],
  health: [{ bg: '#f0f7ff', primary: '#0066cc', secondary: '#00a8a8', accent: '#e8f4ff', text: '#1a1a2e' }, { bg: '#0d1b12', primary: '#00c853', secondary: '#69f0ae', accent: '#b9f6ca', text: '#e8f5e9' }, { bg: '#fafafa', primary: '#5c6bc0', secondary: '#7e57c2', accent: '#ede7f6', text: '#212121' }],
  education: [{ bg: '#1a1033', primary: '#7c4dff', secondary: '#ffab00', accent: '#e040fb', text: '#f3e5f5' }, { bg: '#fff8e1', primary: '#f57c00', secondary: '#ff8f00', accent: '#fff3e0', text: '#212121' }, { bg: '#0d1b2a', primary: '#00b4d8', secondary: '#0077b6', accent: '#90e0ef', text: '#caf0f8' }],
  travel: [{ bg: '#000d1a', primary: '#00b4d8', secondary: '#f77f00', accent: '#90e0ef', text: '#caf0f8' }, { bg: '#1a0a2e', primary: '#ff6b9d', secondary: '#c44dff', accent: '#ffd6ff', text: '#fff0ff' }, { bg: '#f5f0e8', primary: '#2d6a4f', secondary: '#40916c', accent: '#d8f3dc', text: '#1b4332' }],
  real_estate: [{ bg: '#0f0f0f', primary: '#c9a96e', secondary: '#8b7355', accent: '#f5f0e8', text: '#ffffff' }, { bg: '#f8f8f6', primary: '#2c3e50', secondary: '#34495e', accent: '#ecf0f1', text: '#2c3e50' }, { bg: '#111827', primary: '#6366f1', secondary: '#818cf8', accent: '#e0e7ff', text: '#f0f4ff' }],
  music: [{ bg: '#0a0010', primary: '#ff006e', secondary: '#8338ec', accent: '#fb5607', text: '#ffbe0b' }, { bg: '#0d0d0d', primary: '#39ff14', secondary: '#00ff9f', accent: '#ccff00', text: '#f0fff0' }, { bg: '#1a0a1e', primary: '#ff79c6', secondary: '#bd93f9', accent: '#f8f8f2', text: '#f8f8f2' }],
  agency: [{ bg: '#0a0a0a', primary: '#ff4444', secondary: '#ffffff', accent: '#ffff00', text: '#ffffff' }, { bg: '#f5f5f0', primary: '#000000', secondary: '#333333', accent: '#ff3300', text: '#000000' }, { bg: '#1a1a2e', primary: '#e94560', secondary: '#0f3460', accent: '#533483', text: '#eaeaea' }],
  space: [{ bg: '#000005', primary: '#7b2fff', secondary: '#00d4ff', accent: '#bf5fff', text: '#e0d6ff' }, { bg: '#020818', primary: '#00cfff', secondary: '#005fcc', accent: '#0affef', text: '#d0f0ff' }, { bg: '#000000', primary: '#ff8c00', secondary: '#ff4500', accent: '#ffd700', text: '#fff8f0' }],
  ai_saas: [{ bg: '#050510', primary: '#3d5eff', secondary: '#00d4ff', accent: '#bf5fff', text: '#e8eeff' }, { bg: '#0a0a0a', primary: '#00ff9f', secondary: '#00b4d8', accent: '#7efff5', text: '#e0fff0' }, { bg: '#f8f9ff', primary: '#4f46e5', secondary: '#7c3aed', accent: '#ddd6fe', text: '#1e1b4b' }],
  nft: [{ bg: '#080010', primary: '#00ff9f', secondary: '#7b2fff', accent: '#ff006e', text: '#00ff9f' }, { bg: '#0d0d0d', primary: '#ff3cac', secondary: '#784ba0', accent: '#2b86c5', text: '#ffffff' }, { bg: '#000000', primary: '#fcee0a', secondary: '#ff6600', accent: '#00ffff', text: '#ffffff' }],
  consulting: [{ bg: '#f8f8f6', primary: '#1a1a1a', secondary: '#444444', accent: '#c9a96e', text: '#1a1a1a' }, { bg: '#111111', primary: '#c9a96e', secondary: '#8b7355', accent: '#f5f0e8', text: '#ffffff' }, { bg: '#0d1b3e', primary: '#4a9eff', secondary: '#1e5fa8', accent: '#b8d4ff', text: '#e8f0ff' }],
  saas: [{ bg: '#050505', primary: '#6366f1', secondary: '#8b5cf6', accent: '#22d3ee', text: '#f0f0ff' }, { bg: '#f0fdf4', primary: '#059669', secondary: '#10b981', accent: '#d1fae5', text: '#065f46' }, { bg: '#0f172a', primary: '#f472b6', secondary: '#ec4899', accent: '#fce7f3', text: '#fdf4ff' }],
}

const ANIMATION_STYLES = [
  'smooth-fade-up', 'magnetic-hover', '3d-tilt-cards', 'parallax-depth',
  'morphing-blobs', 'particle-burst', 'cursor-follower', 'split-text-reveal',
  'image-clip-reveal', 'stagger-cascade', 'elastic-spring', 'glitch-effect',
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function classifyIndustry(prompt) {
  for (const { key, rx } of INDUSTRY_RULES) {
    if (rx.test(prompt)) return key
  }
  return 'saas'
}

function getVariation(industry) {
  const stylePool = INDUSTRY_STYLES[industry] ?? DESIGN_STYLES
  const threePool = INDUSTRY_THREE_D[industry] ?? THREE_D_OBJECTS
  const palPool = COLOR_PALETTES[industry] ?? COLOR_PALETTES.saas

  const style = pick(stylePool)
  const threeDObj = pick(threePool)
  const layout = pick(LAYOUTS)
  const animation = pick(ANIMATION_STYLES)
  const palette = pick(palPool)
  // Pick a secondary 3D object different from the first
  const threeDObj2 = pick(threePool.filter(o => o !== threeDObj) || threePool)

  return { style, threeDObj, threeDObj2, layout, animation, palette }
}

// ─── Website JSON Blueprint (render-ready, plan-routed) ──────
app.post('/api/generate-website-blueprint', async (req, res) => {
  const { prompt } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' })

  // Credit check (shares the same build count as generate-blueprint)
  const credits = await resolveUserCredits(req.headers.authorization)
  if (credits && !credits.can_build) {
    return res.status(402).json({
      error: 'Build limit reached', code: 'LIMIT_REACHED',
      plan: credits.plan, used: credits.builds_used, limit: credits.builds_limit,
    })
  }
  const plan = credits?.plan ?? 'free'

  const industry = classifyIndustry(prompt)
  const { style, threeDObj, threeDObj2, layout, animation, palette } = getVariation(industry)

  const SYSTEM = `You are not a template generator. You are a senior creative director, 3D web designer, React developer, and Three.js motion designer.

Your task is to create a completely new website design for every user prompt.

PRIME DIRECTIVE: If the output looks like a previous website with only the name, colors, icons, or text changed, the generation has failed. You must invent a fresh UI concept, fresh layout system, fresh 3D scene, fresh motion style, and fresh section structure based on the exact business idea.

OUTPUT RULE: Generate ONLY the JSON blueprint. No markdown. No explanations. No code blocks. No comments. No extra text.

CORE RULES:
1. Do not reuse the same UI structure.
2. Do not always create a center hero with text and a floating 3D object.
3. Do not always use glass cards.
4. Do not always use dark neon gradients.
5. Do not always use generic spheres, cubes, torus knots, particles, AI brains, dashboards, or floating cards.
6. Do not only change name and colors.
7. Every page must feel designed for this specific business.
8. The 3D scene must be unique to the user prompt and implemented in code.
9. The 3D scene must be a real website element, not just a video description.
10. The UI must look like a custom agency-built website, not a repeated SaaS template.

DESIGN DIVERSITY REQUIREMENTS:
Before creating the design, choose a unique layout archetype based on the prompt. Pick one suitable layout archetype:
- cinematic full-screen 3D landing page
- editorial magazine layout
- luxury product showcase
- immersive scroll-based story
- dashboard interface
- split-screen product demo
- horizontal gallery experience
- brutalist creative studio layout
- mobile-app-first landing page
- ecommerce product wall
- portfolio/case-study layout
- booking/reservation interface
- map/location-based interface
- timeline-based storytelling layout
- interactive configurator layout

Never use the same archetype by default.

JSON SCHEMA (follow exactly):
{
  "creative_concept": {
    "website_name": "",
    "business_type": "",
    "target_audience": "",
    "design_big_idea": "",
    "why_this_design_fits": "",
    "layout_archetype": "",
    "visual_signature": "",
    "must_not_look_like": []
  },
  "design_system": {
    "color_palette": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "surface": "#hex",
      "text": "#hex"
    },
    "typography": {
      "heading_font": "Syne",
      "body_font": "Inter",
      "type_style": "bold-expanded|serif-editorial|tech-mono|minimal-sans"
    },
    "ui_style": {
      "navigation_style": "",
      "button_style": "",
      "card_style": "",
      "section_style": "",
      "background_style": ""
    }
  },
  "cinematic_3d_scene": {
    "scene_name": "",
    "scene_purpose": "",
    "main_3d_subject": "",
    "supporting_objects": [],
    "environment": "",
    "materials": [],
    "lighting": "",
    "camera_motion": "",
    "animation_loop": "",
    "user_interaction": "",
    "appears_in_section": "hero",
    "three_js_components": [],
    "implementation_description": ""
  },
  "hero": {
    "layout": "",
    "headline": "",
    "subheadline": "",
    "primary_cta": "",
    "secondary_cta": "",
    "3d_integration": "",
    "animation_style": ""
  },
  "pages": [
    {
      "name": "",
      "path": "",
      "purpose": "",
      "unique_layout": "",
      "sections": []
    }
  ],
  "sections": [
    {
      "id": "",
      "type": "",
      "title": "",
      "subtitle": "",
      "layout": "",
      "content": [],
      "visual_treatment": "",
      "animation": "",
      "3d_element": ""
    }
  ],
  "code_generation_rules": {
    "hero_component": "Generate a custom hero component for this exact prompt. Do not reuse a fixed hero template.",
    "three_scene_component": "Generate a custom React Three Fiber scene from cinematic_3d_scene. Do not use generic default objects.",
    "layout_rule": "Every section must use the selected layout archetype and business context.",
    "content_rule": "All copy must be specific to the user prompt. No placeholder or generic SaaS text.",
    "anti_template_rule": "If only colors, name, and text changed, regenerate with a new layout and new 3D scene."
  }
}`

  const USER = `Generate a UNIQUE, SPECIFIC website blueprint for this exact business:
"${prompt}"

MANDATORY SPECIFICATIONS — implement this aesthetic fully in all design decisions:
- Industry: ${industry}
- Visual style variation: "${style}"
- Layout archetype recommendation: "${layout}"
- Primary 3D object recommendation: "${threeDObj}"
- Colors: background ${palette.bg}, primary ${palette.primary}, secondary ${palette.secondary}, accent ${palette.accent}, text ${palette.text}

UNIQUENESS REQUIREMENTS — every item must be SPECIFIC to this business:
1. website_name: invent a memorable brand name (never generic like "TechCorp")
2. hero.headline: punchy industry-specific tagline (never "Build Faster" / "Scale Better")
3. hero.subheadline: specific value proposition for this exact ${industry} business
4. hero.cta_primary / cta_secondary: action-oriented text for this industry
5. features: 6 features directly relevant to ${industry} — real capabilities, not generic
6. stats: 4 metrics with numbers that make sense for a ${industry} business
7. testimonials: 3 testimonials from real-sounding ${industry} customers
8. pricing: 3 tiers with names and features appropriate for ${industry}
9. navbar links: industry-appropriate pages (e.g., restaurant → Menu, Reservations, About, Catering)

Return ONLY the JSON object — no other text.`

  try {
    const raw = await generateWithModel(plan, SYSTEM, USER)
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const websiteBlueprint = JSON.parse(clean)
    res.json({ websiteBlueprint, plan })
  } catch (err) {
    console.error('[generate-website-blueprint]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Phase 5: Dynamic React + Three.js Code Generation ───────────────────────
app.post('/api/generate-code', async (req, res) => {
  const { prompt, blueprint } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' })
  if (!blueprint) return res.status(400).json({ error: 'blueprint is required' })

  const credits = await resolveUserCredits(req.headers.authorization)
  if (credits && !credits.can_build) {
    return res.status(402).json({
      error: 'Build limit reached', code: 'LIMIT_REACHED',
      plan: credits.plan, used: credits.builds_used, limit: credits.builds_limit,
    })
  }
  const plan = credits?.plan ?? 'free'

  const SYSTEM = `You are Getartifact — an award-winning senior creative director, 3D web designer, React developer, and Three.js motion designer.

OUTPUT RULE: Generate ONLY a valid JSON object matching the schema below. No markdown explanation. No markdown code blocks (e.g. do NOT wrap with \`\`\`json). No comments inside JSON. No text before or after the JSON.

Your task is to write production-ready, custom React, Framer Motion, and React Three Fiber (R3F) code tailored specifically for this website.

CRITICAL UNIQUENESS RULES:
- Do not use any fixed template.
- For every generation:
  * Create a new, unique Hero layout (never reuse the same structure).
  * Create a new Cinematic3DScene component.
  * Create custom 3D objects from the blueprint's cinematic_3d_scene.main_3d_subject (do not use generic spheres, cubes, torus knots, or default particle systems).
  * Use different section layouts based on the selected layout_archetype.
  * Make the 3D scene fully visible and integrated as a real website element, not just a description.
  * Use real, business-specific text (never output TODO comments, placeholders, or generic SaaS phrases unless explicitly requested).
  * Never reuse generic SaaS cards/grids unless the prompt asks for a SaaS product.
  * Never use the same UI structure twice.

JSON SCHEMA (Return exactly this structure):
{
  "heroJSX": "Complete React component code for Hero.jsx. It must render a beautiful layout matching the layout_style and layout_archetype, displaying the headline, subheadline, custom CTAs, and overlaying or embedding the Canvas rendering <Cinematic3DScene />. Wrap elements in Framer Motion components with custom, premium entrance transitions.",
  "sceneJSX": "Complete React Three Fiber component code for Cinematic3DScene.jsx. It must contain appropriate lighting, environment, camera path or animation, and a custom, detailed 3D geometry structure representing the main_3d_subject (constructed with groups, meshes, and specific materials matching the business concept) with smooth animations inside a useFrame hook.",
  "sampleSection": "Complete React component code for the primary custom section matching the layout_archetype (e.g., editorial grid, luxury showcase, timeline, horizontal scroll, bento grid, etc.) with custom hover effects and Framer Motion stagger animations."
}`

  const USER = `Generate custom production-ready React + Three.js code for the website: "${prompt}"

BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

Requirements for the generated code:
1. "heroJSX": Create a new Hero layout. Do not use a fixed Hero template. Build the Hero using Framer Motion animations, with customized typography, layout, buttons, and responsive styles that match the blueprint's design_style and layout_archetype. It must import and render the Canvas containing <Cinematic3DScene />. Make sure it is highly visible.
2. "sceneJSX": Build the Cinematic3DScene component. Instead of a simple sphere or torus, construct a unique 3D subject matching the blueprint's main_3d_subject (e.g. using groups, custom meshes, interactive animations, and custom materials). Include nice lighting, stars/particles, and a CameraRig.
3. "sampleSection": Generate code for the main section using layout_archetype (e.g. editorial, luxury product showcase, etc.). Use beautiful Tailwind card layouts, custom hover effects, and Framer Motion stagger animations. No placeholders or TODO comments.

Return ONLY the JSON object conforming to the schema.`

  try {
    const raw = await generateWithModel(plan, SYSTEM, USER)
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const result = JSON.parse(clean)

    // Merge generated AI components with local project files structure
    const code = {
      fileTree: buildFileTree(blueprint),
      appJSX: generateAppJSX(blueprint),
      heroJSX: result.heroJSX,
      sceneJSX: result.sceneJSX,
      sampleSection: result.sampleSection,
      installCmd: 'npm install && npm run dev',
      envSetup: 'cp .env.example .env\n# Add your ANTHROPIC_API_KEY / GEMINI_API_KEY to .env'
    }

    res.json({ code })
  } catch (err) {
    console.error('[generate-code]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Phase 4: Volumetric Video Prompt Generation ─────────────────────────────
app.post('/api/generate-video', async (req, res) => {
  const { veoPrompt } = req.body
  if (!veoPrompt?.trim()) return res.status(400).json({ error: 'veoPrompt is required' })

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = data => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
  }

  try {
    send({ status: 'starting', message: 'Initiating Veo 2 video generation on Vertex AI...' })

    // Start generation operation
    let operation = await googleAI.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt: veoPrompt,
      config: {
        aspectRatio: '16:9',
        numberOfVideos: 1,
      },
    })

    send({ status: 'processing', message: 'Veo 2 is rendering your website video...', progress: 0.05 })

    // Poll until the operation completes (Veo can take 2-5 minutes)
    let attempts = 0
    const MAX_ATTEMPTS = 60   // 60 × 10s = 10 minutes max

    while (!operation.done && attempts < MAX_ATTEMPTS) {
      await sleep(10_000)
      operation = await googleAI.operations.getVideosOperation({ operation })
      attempts++

      const progress = Math.min(0.9, 0.05 + (attempts / MAX_ATTEMPTS) * 0.85)
      send({
        status: 'processing',
        message: `Rendering... (${attempts * 10}s elapsed)`,
        progress,
      })
    }

    if (!operation.done) {
      send({ status: 'error', message: 'Video generation timed out after 10 minutes.' })
      return res.end()
    }

    // Extract video URI from completed operation
    const samples = operation.response?.generatedSamples
      ?? operation.result?.videos
      ?? []

    if (!samples.length) {
      send({ status: 'error', message: 'No video was returned from Veo 2.' })
      return res.end()
    }

    const videoUri = samples[0]?.video?.uri ?? samples[0]?.uri
    send({ status: 'complete', videoUri, message: 'Video generated successfully!' })
  } catch (err) {
    console.error('[generate-video]', err.message)
    send({ status: 'error', message: err.message })
  }

  res.end()
})

// ─── GCS video proxy ──────────────────────────────────────────────────────────
// Converts gs://bucket/path.mp4  →  authenticated HTTPS stream for the browser
app.get('/api/video-proxy', async (req, res) => {
  const { uri } = req.query
  if (!uri) return res.status(400).json({ error: 'uri is required' })

  try {
    // Convert gs:// URI to HTTPS URL
    let httpUrl = uri
    if (uri.startsWith('gs://')) {
      httpUrl = uri.replace('gs://', 'https://storage.googleapis.com/')
    }

    // Get ADC access token
    const client = await gauth.getClient()
    const token = await client.getAccessToken()

    const upstream = await fetch(httpUrl, {
      headers: { Authorization: `Bearer ${token.token}` },
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `GCS error ${upstream.status}` })
    }

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4')
    res.setHeader('Content-Length', upstream.headers.get('content-length') || '')
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('Access-Control-Allow-Origin', '*')

    // Stream the video body
    const nodeReadable = upstream.body
    nodeReadable.pipeTo(
      new WritableStream({
        write(chunk) { if (!res.writableEnded) res.write(Buffer.from(chunk)) },
        close() { res.end() },
        abort(err) { console.error('[video-proxy] stream aborted', err); res.end() },
      })
    ).catch(err => { if (!res.writableEnded) res.end() })
  } catch (err) {
    console.error('[video-proxy]', err.message)
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
})

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
  const hasGoogleProject = !!process.env.GOOGLE_PROJECT_ID

  console.log('\n  ╔══════════════════════════════════════════╗')
  console.log('  ║     AI 3D Website Builder — Server       ║')
  console.log('  ╚══════════════════════════════════════════╝')
  console.log(`\n  API server: http://localhost:${PORT}`)
  console.log(`  Claude:  ${hasAnthropicKey ? '✅ configured' : '❌ MISSING ANTHROPIC_API_KEY'}`)
  console.log(`  Google:  ${hasGoogleProject ? `✅ project: ${process.env.GOOGLE_PROJECT_ID}` : '⚠️  GOOGLE_PROJECT_ID not set — using default: Getartifact'}`)
  console.log(`  Veo 2:   ✅ veo-2.0-generate-001 @ ${process.env.GOOGLE_LOCATION ?? 'us-central1'}`)
  console.log('\n  Auth tip: run  gcloud auth application-default login')
  console.log('  to enable Gemini + Veo on Vertex AI\n')
})

const sleep = ms => new Promise(r => setTimeout(r, ms))

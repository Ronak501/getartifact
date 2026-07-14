/**
 * AI 3D Website Builder — Express API Server
 *
 * Endpoints:
 *   POST /api/generate-storyboard        — Pipeline Step 1: AI → storyboard + veo_prompt
 *   POST /api/generate-video             — Pipeline Step 2: Veo 2 → video (SSE stream)
 *   POST /api/vision-analysis            — Pipeline Step 4: storyboard → websiteBlueprint
 *   POST /api/generate-code              — Pipeline Step 5: blueprint → React/Next.js code
 *   POST /api/generate-blueprint         — Legacy: AI model → JSON architecture blueprint
 *   POST /api/generate-website-blueprint — Legacy: AI model → render-ready website JSON
 *   POST /api/generate-veo-prompt        — Legacy: AI model → cinematic Veo prompt JSON
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
  vertexai: true,
  project: process.env.GOOGLE_PROJECT_ID,
  location: process.env.GOOGLE_LOCATION,
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
  free: 'gemini',
  starter: 'gemini',
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
  const isJson = systemPrompt.toLowerCase().includes('json') || userPrompt.toLowerCase().includes('json')

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
    const config = {
      systemInstruction: systemPrompt,
      temperature: 0.9,
      maxOutputTokens: 4096,
    }
    if (isJson) {
      config.responseMimeType = 'application/json'
    }
    const response = await googleAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config,
    })
    return response.text.trim()
  }

  const payload = {
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }
  if (isJson) {
    payload.response_format = { type: 'json_object' }
  }

  const completion = await groq.chat.completions.create(payload)
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

// Layout archetypes A-J (Master Prompt spec)
const LAYOUTS = [
  // A — Fullscreen 3D immersive
  'Layout-A: Fullscreen 3D scene occupies the entire viewport. Floating navbar overlaid on top. Content text and CTAs appear over the 3D scene with glassmorphism panels.',
  // B — Split screen
  'Layout-B: Exact 50/50 vertical split. Left = bold typography headline + CTA stack. Right = interactive 3D scene or gallery. Zero hero padding — content starts edge-to-edge.',
  // C — Magazine editorial
  'Layout-C: No traditional hero. Page opens with oversized editorial typography across a full-width grid. Sections are asymmetric editorial blocks. Mixed column widths. Images break the grid.',
  // D — Bento grid
  'Layout-D: Bento grid homepage. Multiple differently-sized interactive cards fill the viewport. Each card contains a 3D mini-scene, stat, or feature. No traditional hero section.',
  // E — Apple-style minimal
  'Layout-E: Huge whitespace. Single centred headline at 96-128px. Subtitle below. One primary CTA. 3D object floats below the fold. Every section is a full-page breathable moment.',
  // F — Dashboard panels
  'Layout-F: Dark dashboard interface. Left sidebar navigation. Right content area split into floating panel widgets. 3D data visualization widgets. Stats and live counters in panels.',
  // G — Timeline horizontal scroll
  'Layout-G: Horizontal scrolling timeline. Each panel is a chapter of the brand story. Progress indicator at top. 3D objects transform between chapters. Pinned vertical sections within.',
  // H — Storytelling scroll
  'Layout-H: Full-page scroll storytelling. Every scroll snap changes the ENTIRE screen layout and color. Section 1 = hero. Section 2 = problem. Section 3 = solution. Dramatic transitions.',
  // I — Circular / radial
  'Layout-I: Circular navigation menu in the center. Content orbits around the center. Clicking a nav item rotates the wheel to reveal that section. 3D scene is the rotating hub.',
  // J — Infinite canvas
  'Layout-J: Zoomable, pannable canvas interface. Elements float at different depths. Users can drag to explore. Clusters of related content. Like Miro or Figma but for a landing page.',
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

  const SYSTEM = `You are Getartifact — a world-class AI creative director, 3D web designer, React developer, and motion designer. You generate render-ready website blueprints.

OUTPUT RULE: Return ONLY a valid JSON object. No markdown, no code blocks, no comments, no extra text.

════════════════════════════════════════
MASTER PROMPT — 20 RULES FOR UNIQUE WEBSITES
════════════════════════════════════════

RULE 1 — LAYOUT ARCHETYPE (pick the one injected in USER message):
  Layout-A: Fullscreen 3D scene covers entire viewport. Floating navbar overlaid. CTAs appear on glassmorphism panels over the scene.
  Layout-B: Exact 50/50 split. Left = bold headline + CTA stack. Right = interactive 3D scene. Edge-to-edge, zero hero padding.
  Layout-C: No hero. Opens with oversized editorial typography across full-width grid. Asymmetric blocks, mixed columns, images break the grid.
  Layout-D: Bento grid. Differently-sized interactive cards fill viewport. Each card = 3D mini-scene, stat, or feature. No traditional hero.
  Layout-E: Huge whitespace. Single centred headline 96-128px. Subtitle. One CTA. 3D object floats below fold. Every section is a full-page breathable moment.
  Layout-F: Dark dashboard. Left sidebar nav. Right = floating panel widgets with 3D data viz, stats, live counters.
  Layout-G: Horizontal scrolling timeline. Each panel = brand story chapter. Progress bar at top. 3D objects transform between chapters.
  Layout-H: Scroll-snap storytelling. Every snap changes ENTIRE screen layout + colour. Section 1=hero, 2=problem, 3=solution. Dramatic transitions.
  Layout-I: Circular navigation hub. Content orbits the centre. Clicking nav item rotates wheel to reveal section. 3D scene is the hub.
  Layout-J: Zoomable pannable canvas. Elements float at different depths. Users drag to explore. Clusters of related content.

RULE 2 — DESIGN LANGUAGE: Every project gets a new design language. Vary: typography scale, spacing rhythm, border radius, grid, card design, shadow system, glass effect, dark/light mode preference.

RULE 3 — COLOR PALETTE: Use the palette injected in USER. Palette styles: Cyberpunk (neon on black), Minimal White (off-white + one bold accent), Nature Green (earth tones), Luxury Black (gold on near-black), Pastel (soft pinks/blues), Retro (orange/brown/cream), Neon Synthwave (purple/magenta), Ocean Blue (deep teal), Monochrome, Fire Red/Orange.

RULE 4 — NAVIGATION: Vary per prompt. Options: top-bar transparent → solid on scroll, sidebar vertical, floating dock centered, bottom mobile nav, circular radial menu, hamburger overlay fullscreen, animated underline tabs, expandable mega-menu, sticky minimal logo+CTA only.

RULE 5 — HERO TYPE: Vary per prompt. Options: centered text + 3D, video background, pure 3D interactive (no text in viewport), horizontal scrolling reveal, split-screen, interactive particle/mouse, parallax depth layers, giant typography only, full-bleed image + overlay, carousel autoplay.

RULE 6 — SECTIONS: Pick 6–10 from: About/Mission, Features grid, Services list, Gallery/portfolio, Timeline history, Pricing table, FAQ accordion, Testimonials, Team, Blog preview, Stats counter, Map/location, Contact form, CTA banner, Newsletter, Process steps, Partners logos, Before/After slider, Video showcase, Awards/press.

RULE 7 — SCROLL EXPERIENCE: Choose one: smooth inertia (Lenis), pinned section sequence, horizontal panel scroll, parallax multi-layer, snap full-page, infinite loop, story-driven chapter scroll, GSAP ScrollTrigger, Framer Motion viewport.

RULE 8 — ANIMATION LANGUAGE: Choose one dominant style: morphing shapes, floating gravity, physics collisions, elastic spring, magnetic cursor follow, hover distortion warp, particle burst on click, smoke/fluid sim, liquid metal, 3D perspective tilt.

RULE 9 — 3D EXPERIENCE: Match the 3D scene to the industry. Examples: tech → abstract data sculpture / AI brain / particle network; restaurant → 3D food model / kitchen scene; gym → human anatomy / weight physics; crypto → blockchain lattice / coin orbit; music → 3D speaker / audio waveform; fashion → 3D mannequin / fabric sim; travel → 3D globe / airplane; architecture → 3D building walkthrough; gaming → character rig / level map; nature → 3D forest / terrain; medical → DNA helix / cell model.

RULE 10 — BACKGROUND: Choose one: pure solid dark, gradient mesh animated, dot/grid pattern, noise texture overlay, video loop, 3D environment fog, star field, geometric line grid, aurora gradient, bokeh blur.

RULE 11 — CARD STYLE: Choose one: glassmorphism frosted, neumorphism soft-shadow, hard border brutalist, gradient border glow, minimal borderless, 3D perspective hover, floating with drop-shadow, tile mosaic.

RULE 12 — BUTTON STYLE: Choose one: pill gradient, sharp rectangular with border, ghost outline hover-fill, animated underline text, 3D pressed effect, neon glow pulse, magnetic hover drift, split diagonal fill.

RULE 13 — FOOTER: Choose one: minimal single-line, large editorial with brand statement, dark full-grid with social links, sticky bottom bar, call-to-action footer with 3D element, newsletter-first, sitemap columns, animated gradient footer.

RULE 14 — CURSOR: Choose one: custom dot + ring follower, magnetic snap to buttons, trail particle effect, color-invert spotlight, 3D object orbits cursor, hidden (touch-optimized), crosshair precision, animated SVG morph.

RULE 15 — MICRO-INTERACTIONS: Include 3+: button hover state, link underline draw, card lift on hover, counter number roll, input field focus glow, scroll progress indicator, page transition fade, toast notification, loading skeleton, icon rotate on hover.

RULE 16 — LAYOUT COMPOSITION: Each section must have a unique composition. Vary: full-bleed edge-to-edge vs constrained container, asymmetric columns, overlapping elements, negative space, bleed images, rotated elements, diagonal cuts, staggered grids.

RULE 17 — COMPONENT ORDER: Randomize section order to avoid formulaic pages. Do NOT always follow: Hero → Features → Pricing → Testimonials → CTA. Try: Hero → Stats → Gallery → Problem → Solution → Testimonials → Pricing → FAQ → CTA, or other non-default orderings.

RULE 18 — AI INDUSTRY MATCHING: Match UI style to industry:
  restaurant/food → warm palette, food gallery, reservation CTA, serif typography
  gaming/esports → cyberpunk neon, particle effects, countdown timer, bold condensed font
  finance/crypto → trust signals, dashboard panels, dark conservative, mono font
  health/wellness → clean minimal, pastel, breathing animation, rounded cards
  fashion/luxury → editorial layout, high contrast, serif/script mix, white space
  music/events → high energy, bold color, ticket CTA, distorted typography
  tech/SaaS → futuristic, glass panels, feature grid, gradient accent
  education → friendly, bright, progress indicators, card curriculum
  real-estate → full-bleed photography, map integration, property cards
  travel → panoramic imagery, globe 3D, destination cards, adventure tone

RULE 19 — DIVERSITY SCORE (internal validation before responding):
  - layout_similarity_to_previous < 20%
  - color_similarity < 20%
  - animation_similarity < 20%
  - typography_similarity < 20%
  - component_order_similarity < 20%
  - 3d_scene_similarity < 20%
  If ANY score ≥ 20%, regenerate that dimension with a different choice before outputting.

RULE 20 — ANTI-TEMPLATE RULE: If only the name, colors, and text changed from a generic SaaS template, the generation has FAILED. Invent a completely fresh UI concept, fresh layout system, fresh 3D scene, fresh motion style, and fresh section structure.

════════════════════════════════════════
JSON SCHEMA (follow exactly):
════════════════════════════════════════
{
  "creative_concept": {
    "website_name": "",
    "business_type": "",
    "target_audience": "",
    "design_big_idea": "",
    "why_this_design_fits": "",
    "layout_archetype": "",
    "visual_signature": "",
    "diversity_score": { "layout": 0, "color": 0, "animation": 0, "typography": 0, "component_order": 0, "3d_scene": 0 },
    "must_not_look_like": []
  },
  "design_system": {
    "color_palette": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "surface": "#hex",
      "text": "#hex",
      "palette_style": ""
    },
    "typography": {
      "heading_font": "",
      "body_font": "",
      "type_style": "",
      "heading_weight": "",
      "heading_size_hero": ""
    },
    "ui_style": {
      "navigation_style": "",
      "hero_type": "",
      "button_style": "",
      "card_style": "",
      "section_style": "",
      "background_style": "",
      "cursor_style": "",
      "scroll_experience": "",
      "footer_style": ""
    },
    "animation": {
      "dominant_style": "",
      "scroll_trigger": "",
      "hover_effect": "",
      "page_transition": "",
      "micro_interactions": []
    }
  },
  "cinematic_3d_scene": {
    "scene_name": "",
    "scene_purpose": "",
    "scene_type": "",
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
    "animation_style": "",
    "background_treatment": ""
  },
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
      "3d_element": "",
      "composition": ""
    }
  ],
  "pages": [
    { "name": "", "path": "", "purpose": "", "unique_layout": "", "sections": [] }
  ],
  "code_generation_rules": {
    "hero_component": "Custom hero matching hero.layout and hero.animation_style. Never reuse a fixed hero template.",
    "three_scene_component": "Custom React Three Fiber scene from cinematic_3d_scene. No generic defaults.",
    "layout_rule": "Every section uses the selected layout_archetype and business context.",
    "content_rule": "All copy specific to this business. No generic SaaS placeholder text.",
    "scroll_rule": "Implement scroll_experience from design_system.ui_style.",
    "animation_rule": "Apply animation.dominant_style throughout. Include all micro_interactions listed.",
    "anti_template_rule": "If only colors, name, and text changed from a generic template, this is a FAILURE. Regenerate."
  }
}`

  const USER = `Generate a UNIQUE, SPECIFIC website blueprint for this exact business:
"${prompt}"

ASSIGNED VARIATION PARAMETERS — implement ALL of these in the output:
- Industry: ${industry}
- Visual style: "${style}"
- Layout archetype: "${layout}"
- Primary 3D object: "${threeDObj}"
- Secondary 3D object: "${threeDObj2}"
- Animation style: "${animation}"
- Colors: background ${palette.bg} | primary ${palette.primary} | secondary ${palette.secondary} | accent ${palette.accent} | text ${palette.text}

CONTENT REQUIREMENTS (all must be specific to this business, never generic):
1. website_name: memorable brand name (never "TechCorp", "StartupAI", "InnovateCo")
2. hero.headline: punchy tagline for THIS exact business (never "Build Faster" / "Scale Better")
3. hero.subheadline: specific value proposition for this ${industry} business
4. sections: 6–10 sections in non-formulaic order (see Rule 17)
5. features/services: directly relevant to ${industry} — real capabilities
6. stats: 4 metrics with numbers that make sense for a ${industry} business
7. testimonials: 3 testimonials from real-sounding ${industry} customers
8. pricing: 3 tiers appropriate for ${industry} (if applicable)
9. navbar links: industry-appropriate (restaurant → Menu, Reservations, About; SaaS → Product, Pricing, Docs)
10. 3D scene: a scene specific to ${industry} per Rule 9 — not a generic sphere or torus

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

OUTPUT RULE: Generate ONLY a valid JSON object. No markdown, no code blocks, no comments, no extra text.

Your task: write production-ready React + Framer Motion + React Three Fiber (R3F) code that exactly implements the layout_archetype and design_system from the blueprint.

════════════════════════════════════════
LAYOUT-ARCHETYPE CODE RULES
════════════════════════════════════════
Layout-A (Fullscreen 3D): heroJSX renders a fullscreen Canvas with the 3D scene as the background. Text/CTAs float over it in absolute-positioned glassmorphism containers. No split, no side-by-side.

Layout-B (Split-screen): heroJSX is a CSS grid with exactly two 50vw columns. Left = headline stack + CTAs. Right = Canvas with 3D scene. Edge-to-edge, no padding on outer edges.

Layout-C (Editorial magazine): heroJSX is a typographic grid. Giant headline spans the full width (min 96px). No hero section. Page opens directly into an oversized editorial block.

Layout-D (Bento grid): heroJSX renders a CSS grid of differently-sized cards (using grid-template-areas). Multiple Canvas instances for mini-3D scenes inside cards. No single large hero.

Layout-E (Minimal whitespace): heroJSX is centred text only. Single headline at 96-128px. Massive padding. 3D scene floats independently below, not overlapping.

Layout-F (Dashboard): heroJSX shows a left sidebar nav + main content area with panel widgets. 3D visualisation inside a widget panel.

Layout-G (Horizontal timeline): sampleSection implements a horizontal scroll container (overflow-x: scroll, scroll-snap-type: x mandatory). Each child = 100vw chapter panel.

Layout-H (Scroll-snap story): heroJSX and sampleSection use scroll-snap-type: y mandatory. Each section = 100vh snap point. Dramatic colour/layout change per snap.

Layout-I (Circular nav hub): heroJSX renders a centred circular SVG/CSS nav with orbiting items. Clicking rotates to reveal section. 3D scene is the hub.

Layout-J (Zoomable canvas): heroJSX renders a panning/zooming div with transform-origin and wheel/drag handlers. Content clusters float at different z depths.

════════════════════════════════════════
ANIMATION RULES (apply from blueprint.design_system.animation)
════════════════════════════════════════
- dominant_style: apply this animation idiom to ALL interactive elements.
- scroll_trigger: use Framer Motion whileInView / viewport with this effect.
- hover_effect: apply to every card, button, and interactive element.
- micro_interactions: implement EVERY item listed in the array.
- In sceneJSX, implement the animation_loop from cinematic_3d_scene inside useFrame.

════════════════════════════════════════
3D SCENE RULES
════════════════════════════════════════
- Do NOT use a single generic sphere, box, or torus knot as the main subject.
- You MUST construct the main 3D subject by nesting multiple geometries inside a <group>.
  - For example, if it's a 'neural-network', compose it of multiple small spheres connected by dynamic buffer line geometries that update their position or alpha in a useFrame loop.
  - If it's a 'planet', compose it of a central sphere, nested semi-transparent rotating ring meshes, and small satellite particles orbiting it.
  - If it's an 'ai-brain', build it using nested wireframe icosahedrons, a glowing central core, and particles representing firing synapses.
- Apply high-fidelity materials: use <meshPhysicalMaterial> or <meshStandardMaterial> with realistic transmission, thickness, metalness, and roughness settings.
- Comprise a rich lighting rig inside the scene: custom colored ambient, point, and spot lights positioned to cast dramatic highlights.
- Implement camera movement and mouse-tracking drift within useFrame to make the scene feel interactive.

════════════════════════════════════════
JSON SCHEMA
════════════════════════════════════════
{
  "heroJSX": "Complete Hero.jsx component implementing the layout_archetype exactly as described above. Use the blueprint headline, subheadline, primary_cta, secondary_cta. Apply animation.dominant_style with Framer Motion. Embed <Canvas><Cinematic3DScene /></Canvas>. Use Tailwind + inline styles. No placeholders.",
  "sceneJSX": "Complete Cinematic3DScene.jsx using React Three Fiber. Build the main_3d_subject as a composed group of geometries, not a single primitive. Apply materials, lighting, camera_motion, and animation_loop from the blueprint. Implement user_interaction.",
  "sampleSection": "Complete primary section component implementing the layout_archetype's section style. Use layout-appropriate structure: bento grid / horizontal scroll / snap section / editorial block / dashboard panel (matching layout_archetype). Apply hover effects and Framer Motion stagger. All content from blueprint sections[1]. No TODO comments."
}`

  const USER = `Generate custom production-ready React + Three.js code for: "${prompt}"

BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

STRICT CODE REQUIREMENTS:
1. heroJSX — implement blueprint.hero.layout + blueprint.creative_concept.layout_archetype. Match the layout archetype code rules above EXACTLY. Use blueprint.hero.headline, subheadline, primary_cta, secondary_cta, animation_style. Import and render Cinematic3DScene inside a Canvas.
2. sceneJSX — implement blueprint.cinematic_3d_scene fully. Build the main_3d_subject as a composed group (not a single sphere/torus). Apply cinematic lighting, camera_motion inside useFrame, and user_interaction.
3. sampleSection — implement blueprint.sections[1] (or the most interesting non-hero section). Use the section's layout, visual_treatment, animation, and composition fields. Stagger children with Framer Motion.

Return ONLY the JSON object — no other text.`

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

// ─── Video-First Site Generation ─────────────────────────────────────────────
// Takes the Veo prompt data (already generated) + optional videoUrl and builds
// a complete deploy-ready React website where the hero IS the video.
app.post('/api/generate-video-site', async (req, res) => {
  const { prompt, veoData, videoUrl } = req.body
  if (!prompt?.trim())  return res.status(400).json({ error: 'prompt is required' })
  if (!veoData)         return res.status(400).json({ error: 'veoData is required' })

  const credits = await resolveUserCredits(req.headers.authorization)
  if (credits && !credits.can_build) {
    return res.status(402).json({
      error: 'Build limit reached', code: 'LIMIT_REACHED',
      plan: credits.plan, used: credits.builds_used, limit: credits.builds_limit,
    })
  }
  const plan = credits?.plan ?? 'free'

  const palette = veoData.color_palette ?? []
  const primary   = palette[0] ?? '#6366f1'
  const secondary = palette[1] ?? '#a78bfa'
  const accent    = palette[2] ?? '#f59e0b'
  const bg        = palette[3] ?? '#0a0a0f'

  const SYSTEM = `You are Getartifact — a world-class React developer and creative director. Your task is to generate production-ready React + Tailwind website code where the hero section features a fullscreen autoplay video background.

OUTPUT RULE: Return ONLY a valid JSON object. No markdown, no code blocks, no extra text.

CORE PRINCIPLE — VIDEO IS THE DESIGN:
The website's visual identity is entirely derived from the generated Veo video. The hero IS the video. All sections, colors, and typography must complement the video's aesthetic. Every site generated will look completely unique because every Veo video is unique.

HERO RULES:
- Hero = fullscreen <video autoPlay muted loop playsInline> covering 100vw × 100vh
- Dark cinematic overlay on the video (gradient from transparent to background color)
- Content (headline, sub, CTAs) positioned OVER the video using absolute positioning
- If VIDEO_URL is empty string: show an ANIMATED CSS background with:
  - Multiple radial-gradient layers pulsing with keyframe animation (@keyframes pulse in a <style> tag)
  - Floating CSS blob divs with blur and animation
  - A visible "Video rendering..." badge in the corner (optional)
  - NO static grey box — make it visually rich even without video
- The video element should ALWAYS be rendered (src={VIDEO_URL}) — when VIDEO_URL is empty the browser renders nothing, so the animated CSS background shows through

SECTION RULES — generate sections that match the business type in the Veo data:
- restaurant/food → Menu grid + Reservations CTA
- gaming → Features grid + Live stats banner
- fashion/luxury → Product grid + Brand story split
- fitness/health → Programs cards + Trainers
- music/events → Tour dates list + Artist profiles
- finance/crypto → Metrics banner + Products comparison
- travel → Destination cards grid
- education → Course cards + Instructor profiles
- creative/agency → Work list + Services tags
- tech/SaaS → Features grid + Pricing table

UNIQUENESS RULES:
- Colors must come EXACTLY from the Veo data's color_palette
- Typography must reflect the veoData.typography field
- Section copy must be specific to the business (veoData.business_type + prompt)
- Every section layout must be different from a generic SaaS template
- The code must be COMPLETE and RUNNABLE — no placeholders, no TODOs, no "add your content here"

JSON SCHEMA:
{
  "heroJSX": "Complete Hero.jsx component. Fullscreen video background. Overlay gradient. Content positioned absolutely. Framer Motion entrance animations. Includes VIDEO_URL constant set to the provided videoUrl (or empty string if none).",
  "sectionsJSX": "Complete Sections.jsx with 2-3 industry-appropriate sections. Real content (not placeholder). Framer Motion whileInView animations. Uses the exact hex colors from veoData.",
  "navbarJSX": "Complete Navbar.jsx with industry-appropriate nav links, transparent-to-solid-on-scroll, brand name from veoData.website_name.",
  "footerJSX": "Complete Footer.jsx — minimal, brand name, nav links, copyright.",
  "appJSX": "Complete App.jsx that imports and assembles all components.",
  "indexCss": "Complete index.css with CSS custom properties for the palette, smooth scroll, body font, and scrollbar styling.",
  "websiteName": "The brand name from veoData or inferred from prompt"
}`

  const USER = `Generate a complete deploy-ready React website for: "${prompt}"

VEO DATA (design bible — derive ALL visual decisions from this):
${JSON.stringify(veoData, null, 2)}

VIDEO URL: ${videoUrl || '(video still rendering — use empty string for VIDEO_URL constant)'}

MANDATORY:
1. heroJSX — fullscreen video background (VIDEO_URL = "${videoUrl || ''}"). Overlay + content on top. Real headline/CTA specific to ${veoData.business_type ?? 'this business'}.
2. sectionsJSX — 2-3 sections appropriate for ${veoData.business_type ?? 'this business'}. Real content, NOT generic SaaS cards.
3. Colors — use EXACTLY: primary ${primary}, secondary ${secondary}, accent ${accent}, background ${bg}
4. All components must be production-ready, import framer-motion, and use Tailwind + inline styles.

Return ONLY the JSON.`

  try {
    const raw = await generateWithModel(plan, SYSTEM, USER)
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const result = JSON.parse(clean)

    res.json({
      site: {
        heroJSX:     result.heroJSX,
        sectionsJSX: result.sectionsJSX,
        navbarJSX:   result.navbarJSX,
        footerJSX:   result.footerJSX,
        appJSX:      result.appJSX,
        indexCss:    result.indexCss,
        websiteName: result.websiteName ?? veoData.website_name ?? 'Site',
        videoUrl:    videoUrl ?? '',
        palette:     { primary, secondary, accent, bg },
      },
      plan,
    })
  } catch (err) {
    console.error('[generate-video-site]', err.message)
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
    const samples = operation.response?.generatedVideos
      ?? operation.response?.generatedSamples
      ?? operation.result?.videos
      ?? []

    if (!samples.length) {
      send({ status: 'error', message: 'No video was returned from Veo 2.' })
      return res.end()
    }

    const videoUri = samples[0]?.video?.uri ?? samples[0]?.uri
    console.log('\n======================================================')
    console.log('[generate-video] SUCCESS! Video URI:', videoUri)
    console.log('Proxy URL:', `/api/video-proxy?uri=${encodeURIComponent(videoUri)}`)
    console.log('======================================================\n')
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

// ─── Generate Storyboard (Pipeline Step 1) ────────────────────────────────────
// Takes { prompt }, returns { storyboard: { veo_prompt, storyboard_scenes[], design_spec } }
app.post('/api/generate-storyboard', async (req, res) => {
  const { prompt } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' })

  const credits = await resolveUserCredits(req.headers.authorization)
  if (credits && !credits.can_build) {
    return res.status(402).json({
      error: 'Build limit reached', code: 'LIMIT_REACHED',
      plan: credits.plan, used: credits.builds_used, limit: credits.builds_limit,
    })
  }
  const plan = credits?.plan ?? 'free'

  const SYSTEM = `You are a world-class creative director and cinematic designer for AI-generated websites.
Your job is to design a creative storyboard and Veo 2 video prompt for a website concept.

OUTPUT RULE: Return ONLY valid JSON — no markdown, no code fences, no extra text.

SCENE TYPE RULES — pick the ONE most relevant scene_type from this list based on industry/context:
- "web"     → tech, SaaS, blockchain, developer tools, network, API
- "ar"      → AR/VR/XR, spatial computing, metaverse, goggles, immersive
- "hand"    → health, biometrics, touch, accessibility, human interface
- "robot"   → robotics, automation, manufacturing, industrial, AI hardware
- "galaxy"  → space, cosmos, astronomy, star, universe, satellite
- "wave"    → ocean, audio, music frequency, fluid dynamics, water
- "music"   → music, DJ, streaming, podcast, concert, sound
- "city"    → real estate, urban, architecture, smart city, property
- "crystal" → luxury, jewelry, fashion, gem, premium, high-end
- "dna"     → biotech, pharma, healthcare, genetics, lab, research
- "neural"  → AI, machine learning, neural network, LLM, data science
- "planet"  → global, international, climate, earth, geography
- "chart"   → fintech, analytics, finance, data, dashboard, trading
- "abstract"→ creative agency, art, tattoo, design studio, experimental

JSON SCHEMA:
{
  "storyboard": {
    "veo_prompt": "<500+ word cinematic description for Veo 2 — include camera movements, lighting, 3D elements, color grading, mood>",
    "scene_type": "<one of the 14 scene types above>",
    "storyboard_scenes": [
      {
        "scene_index": 1,
        "time_range": "0:00-0:05",
        "website_section": "Hero",
        "visuals": "<detailed visual description of what appears on screen>",
        "camera_movement": "<specific camera motion — dolly, pan, orbit, zoom, etc.>",
        "lighting": "<lighting description>",
        "typography": "<how text appears — font feel, size, animation>",
        "colors": ["#hex1", "#hex2"],
        "3d_elements": ["<element 1>", "<element 2>"]
      }
    ],
    "design_spec": {
      "color_palette": {
        "primary": "#hex",
        "secondary": "#hex",
        "accent": "#hex",
        "background": "#hex"
      },
      "typography": {
        "heading": "<font style description>",
        "body": "<font style description>"
      },
      "sections": ["Hero", "Features", "About", "Pricing", "Footer"],
      "business_type": "<industry/business type>",
      "design_style": "<visual style — e.g. Cyberpunk, Minimal Luxury, Neo Futurism>"
    }
  }
}`

  const USER = `Create a creative storyboard and Veo 2 cinematic video prompt for this website idea:
"${prompt}"

Requirements:
- veo_prompt: Minimum 500 words. Describe the full cinematic 3D website preview video. Include: opening shot, section transitions, 3D objects, lighting, camera paths, color grading, mood, and closing shot. Make it feel like a AAA game cinematic trailer reimagined as a website preview.
- storyboard_scenes: 5–8 scenes covering different website sections (Hero, Features, Pricing, Testimonials, CTA, Footer, etc.)
- scene_type: pick the SINGLE most relevant scene_type for this industry
- design_spec: define the visual identity (colors, typography feel, sections list, design style)
- All colors must be specific hex codes that fit the brand/industry

Return ONLY the JSON.`

  try {
    const raw = await generateWithModel(plan, SYSTEM, USER)
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const storyboard = JSON.parse(clean).storyboard ?? JSON.parse(clean)
    res.json({ storyboard })
  } catch (err) {
    console.error('[generate-storyboard]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Vision Analysis (Pipeline Step 4) ───────────────────────────────────────
// Takes { videoUrl, storyboard }, returns { websiteBlueprint } derived from storyboard + AI
app.post('/api/vision-analysis', async (req, res) => {
  const { videoUrl, storyboard } = req.body
  if (!storyboard) return res.status(400).json({ error: 'storyboard is required' })

  const credits = await resolveUserCredits(req.headers.authorization)
  const plan = credits?.plan ?? 'free'

  const industry = storyboard.design_spec?.business_type ?? 'general'
  const designStyle = storyboard.design_spec?.design_style ?? 'Modern'
  const palette = storyboard.design_spec?.color_palette ?? {}
  const sceneType = storyboard.scene_type ?? 'abstract'
  const { layout } = getVariation(classifyIndustry(industry))

  const SYSTEM = `You are Getartifact — a world-class AI creative director and React developer.
You receive a website storyboard and derive a complete, render-ready website blueprint from it.

OUTPUT RULE: Return ONLY valid JSON — no markdown, no code fences, no extra text.

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
    "diversity_score": { "layout": 95, "color": 95, "animation": 95, "typography": 95, "component_order": 95, "3d_scene": 95 },
    "must_not_look_like": []
  },
  "design_system": {
    "color_palette": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "surface": "#hex",
      "text": "#hex",
      "palette_style": ""
    },
    "typography": {
      "heading_font": "",
      "body_font": "",
      "type_style": "",
      "heading_weight": "",
      "heading_size_hero": ""
    },
    "ui_style": {
      "navigation_style": "",
      "hero_type": "",
      "button_style": "",
      "card_style": "",
      "section_style": "",
      "background_style": "",
      "cursor_style": "",
      "scroll_experience": "",
      "footer_style": ""
    },
    "animation": {
      "dominant_style": "",
      "scroll_trigger": "",
      "hover_effect": "",
      "page_transition": "",
      "micro_interactions": []
    }
  },
  "cinematic_3d_scene": {
    "scene_name": "",
    "scene_purpose": "",
    "scene_type": "",
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
    "animation_style": "",
    "background_treatment": ""
  },
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
      "3d_element": "",
      "composition": ""
    }
  ],
  "pages": [
    { "name": "Home", "path": "/", "purpose": "", "unique_layout": "", "sections": [] }
  ],
  "code_generation_rules": {
    "hero_component": "Custom hero matching hero.layout and hero.animation_style.",
    "three_scene_component": "Custom React Three Fiber scene from cinematic_3d_scene.",
    "layout_rule": "Every section uses the selected layout_archetype and business context.",
    "content_rule": "All copy specific to this business.",
    "scroll_rule": "Implement scroll_experience from design_system.ui_style.",
    "animation_rule": "Apply animation.dominant_style throughout.",
    "anti_template_rule": "If only colors, name, and text changed from a generic template, this is a FAILURE."
  }
}`

  const USER = `Analyze this website storyboard and produce a complete website blueprint.

STORYBOARD INPUT:
${JSON.stringify(storyboard, null, 2)}

REQUIREMENTS:
- Use the storyboard's veo_prompt and storyboard_scenes to deeply understand the visual intent
- design_style: "${designStyle}"
- layout_archetype: "${layout}"
- scene_type: "${sceneType}" (MUST match exactly — this drives 3D scene code generation)
- Colors: primary ${palette.primary ?? '#6366f1'} | secondary ${palette.secondary ?? '#8b5cf6'} | accent ${palette.accent ?? '#06b6d4'} | background ${palette.background ?? '#0a0a14'}
- sections: include these sections from the storyboard: ${JSON.stringify(storyboard.design_spec?.sections ?? ['Hero', 'Features', 'About', 'CTA', 'Footer'])}
- Generate specific, real content for this exact business — never generic placeholder text
- Derive the website_name from the storyboard context
- All hex colors must be specific and match the brand

Return ONLY the JSON.`

  try {
    const raw = await generateWithModel(plan, SYSTEM, USER)
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const websiteBlueprint = JSON.parse(clean)
    res.json({ websiteBlueprint })
  } catch (err) {
    console.error('[vision-analysis]', err.message)
    res.status(500).json({ error: err.message })
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

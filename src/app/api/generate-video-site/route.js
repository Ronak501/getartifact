import { NextResponse } from 'next/server'
import { resolveUserCredits, generateWithModel } from '@lib/ai-clients'

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

export async function POST(req) {
  try {
    const { prompt, veoData, videoUrl } = await req.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }
    if (!veoData) {
      return NextResponse.json({ error: 'veoData is required' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    const credits = await resolveUserCredits(authHeader)

    if (credits && !credits.can_build) {
      return NextResponse.json({
        error: 'Build limit reached',
        code: 'LIMIT_REACHED',
        plan: credits.plan,
        used: credits.builds_used,
        limit: credits.builds_limit,
      }, { status: 402 })
    }

    const plan = credits?.plan ?? 'free'

    const primary   = veoData.color_palette?.[0] ?? '#3d5eff'
    const secondary = veoData.color_palette?.[1] ?? '#00d4ff'
    const accent    = veoData.color_palette?.[2] ?? '#bf5fff'
    const bg        = veoData.color_palette?.[3] ?? '#0a0a14'

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

    const raw = await generateWithModel(plan, SYSTEM, USER)
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const result = JSON.parse(clean)

    return NextResponse.json({
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
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

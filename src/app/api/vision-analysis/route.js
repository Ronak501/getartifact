import { NextResponse } from 'next/server'
import { resolveUserCredits, generateWithModel, parseModelJson } from '@lib/ai-clients'

const SYSTEM = `You are a high-performance Vision AI Agent specializing in web visual design and R3F 3D assets extraction.
You analyze a generated preview video and its storyboard, and output a structured Website Blueprint JSON.

OUTPUT RULE: Return ONLY a valid JSON object. No markdown, no code blocks, no comments, no extra text.

JSON SCHEMA:
{
  "creative_concept": {
    "website_name": "",
    "business_type": "",
    "design_style": "",
    "layout_archetype": "",
    "brand_personality": "",
    "target_audience": "",
    "design_big_idea": "",
    "vision_visual_signature": "Summary of visual signature extracted from the video analysis."
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
      "scale": {
        "hero": "text-6xl",
        "heading": "text-4xl",
        "body": "text-base"
      }
    },
    "ui_style": {
      "navigation_style": "floating-dock / top-bar / vertical-sidebar",
      "hero_type": "split-screen / fullscreen-3d / centered-text",
      "button_style": "pill-gradient / sharp-outline",
      "card_style": "glassmorphism / soft-shadow",
      "background_style": "gradient-mesh / particle-stars / solid",
      "responsive_rules": "Custom media queries and breakpoint scaling ratios detected."
    },
    "animation": {
      "dominant_style": "gravity-float / dynamic-spring",
      "scroll_experience": "parallax-reveal / horizontal-slide",
      "hover_effect": "lift-glow / scale-up",
      "page_transition": "fade-slide"
    }
  },
  "cinematic_3d_scene": {
    "main_3d_subject": "e.g., neural-network",
    "materials": ["glass", "metal", "glowing-wireframe"],
    "lighting": "Volumetric spotlights, neon points, dark ambient glow",
    "camera_motion": "Orbit zoom-in on scroll trigger",
    "three_js_components": ["meshPhysicalMaterial", "directionalLight", "group", "bufferGeometry"]
  },
  "hero": {
    "layout": "split / centered",
    "headline": "Hero title detected",
    "subheadline": "Subheadline text detected",
    "primary_cta": "CTA 1 text",
    "secondary_cta": "CTA 2 text"
  },
  "sections": [
    {
      "id": "features",
      "type": "features",
      "title": "Features Section Heading",
      "subtitle": "Subtitle text",
      "layout": "bento-grid / 3-column-row",
      "content": [
        { "icon": "⚡", "title": "Feature Title 1", "description": "Description text 1" }
      ],
      "visual_treatment": "Glass cards with hover-tilt physics",
      "animation": "fade-up-stagger",
      "3d_element": "rotating-icosahedron"
    }
  ],
  "pages": [
    {
      "name": "Home",
      "path": "/",
      "sections": ["hero", "features", "stats", "pricing", "footer"]
    }
  ]
}`

export async function POST(req) {
  try {
    const { videoUrl, storyboard } = await req.json()
    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
    }
    if (!storyboard) {
      return NextResponse.json({ error: 'storyboard is required' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    const credits = await resolveUserCredits(authHeader)
    const plan = credits?.plan ?? 'free'

    const isDataUri = typeof videoUrl === 'string' && videoUrl.startsWith('data:')
    const videoReference = isDataUri
      ? `INLINE_DATA_URI_OMITTED (too large for prompt tokens). Mime=${videoUrl.slice(5, videoUrl.indexOf(';') > -1 ? videoUrl.indexOf(';') : 30)} Length=${videoUrl.length}`
      : videoUrl

    const USER = `Run Vision AI video frame analysis on the website preview video:
URL: ${videoReference}

NOTE:
${isDataUri
    ? 'The video was returned as inline bytes and cannot be attached directly. Infer visual details from storyboard + video metadata.'
    : 'Use the URL for direct frame-aware visual extraction.'}

STORYBOARD CONTEXT:
${JSON.stringify(storyboard, null, 2)}

EXTRACT:
- Component Layout Tree & hierarchy
- UI Spacing, grid sizing, card materials (glass effects, shadows)
- Volumetric lighting & camera positions
- R3F components & custom 3D models detected in scene
- Interactive animation states (scroll reveal, hovers, button glows)`

    const baseRaw = await generateWithModel(plan, SYSTEM, USER)
    let websiteBlueprint = null
    let lastParseError = null
    let currentRaw = baseRaw

    const repairSystem = `You repair malformed JSON.
Return ONLY valid JSON. No markdown, no comments, no trailing commas.
Escape all quotes inside string values correctly.`

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        websiteBlueprint = parseModelJson(currentRaw)
        if (attempt > 1) {
          console.warn(`[vision-analysis] JSON recovered on attempt ${attempt}`)
        }
        break
      } catch (parseErr) {
        lastParseError = parseErr
        const repairUser = `The following model output is malformed JSON.
Repair it into ONE valid JSON object and preserve semantics.

Target schema:
${SYSTEM}

Malformed JSON:
${currentRaw}`
        currentRaw = await generateWithModel(plan, repairSystem, repairUser)
      }
    }

    if (!websiteBlueprint) {
      return NextResponse.json(
        { error: `Vision Blueprint JSON parsing failed after retries: ${lastParseError?.message ?? 'unknown parse error'}` },
        { status: 502 },
      )
    }

    return NextResponse.json({ websiteBlueprint })
  } catch (err) {
    console.error('[vision-analysis]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { resolveUserCredits, generateWithModel } from '@lib/ai-clients'

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

    const USER = `Run Vision AI video frame analysis on the website preview video:
URL: ${videoUrl}

STORYBOARD CONTEXT:
${JSON.stringify(storyboard, null, 2)}

EXTRACT:
- Component Layout Tree & hierarchy
- UI Spacing, grid sizing, card materials (glass effects, shadows)
- Volumetric lighting & camera positions
- R3F components & custom 3D models detected in scene
- Interactive animation states (scroll reveal, hovers, button glows)`

    const raw = await generateWithModel(plan, SYSTEM, USER)
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const websiteBlueprint = JSON.parse(clean)

    return NextResponse.json({ websiteBlueprint })
  } catch (err) {
    console.error('[vision-analysis]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

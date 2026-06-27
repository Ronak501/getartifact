import { NextResponse } from 'next/server'
import { resolveUserCredits, generateWithModel } from '@lib/ai-clients'
import { classifyIndustry, getVariation } from '@lib/blueprint-helpers'

const SYSTEM = `You are an elite Creative Director, UI/UX Architect, and cinematic Motion Designer. 
Your task is to take a business prompt and generate a highly detailed website Storyboard JSON.

The Storyboard describes every website section, camera movement, volumetric lighting, transitions, typography, color palette, animations, and interactive cursor movements in a structured cinematic timeline.

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
    "design_big_idea": ""
  },
  "storyboard_scenes": [
    {
      "scene_id": 1,
      "time_range": "0s - 8s",
      "website_section": "Hero / Features / Pricing / Footer",
      "visuals": "Detailed visual description of what UI cards, 3D elements, and photos are visible.",
      "camera_movement": "Dolly, orbit, push, pull, tilt, pan.",
      "lighting": "Volumetric spotlight, ambient color, accent point lights.",
      "interactions": "Cursor hover paths, scroll-bound parallax motion.",
      "audio_mood": "Sound effect cues, background music tone."
    }
  ],
  "color_palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "typography": {
    "heading_font": "",
    "body_font": ""
  },
  "veo_prompt": "ONE continuous detailed paragraph (at least 300 words) describing the site as if it is being filmed in a real cinematic camera shoot, transitioning through all sections, with cursor hovers, volumetric lighting, and glowing buttons. End with the hero CTA glowing."
}`

export async function POST(req) {
  try {
    const { prompt } = await req.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
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
    const industry = classifyIndustry(prompt)
    const variation = getVariation(industry)

    const USER = `Create a Storyboard JSON for: "${prompt}"

ASSIGNED SYSTEM PARAMETERS (incorporate these):
- Industry: ${industry}
- Visual style: "${variation.style}"
- Layout archetype: "${variation.layout}"
- Primary 3D object: "${variation.threeDObj}"
- Colors: background ${variation.palette.bg}, primary ${variation.palette.primary}, secondary ${variation.palette.secondary}, accent ${variation.palette.accent}`

    const raw = await generateWithModel(plan, SYSTEM, USER)
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const storyboard = JSON.parse(clean)

    return NextResponse.json({ storyboard })
  } catch (err) {
    console.error('[generate-storyboard]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

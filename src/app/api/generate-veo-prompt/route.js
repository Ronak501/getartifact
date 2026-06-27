import { NextResponse } from 'next/server'
import { googleAI } from '@lib/ai-clients'

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

export async function POST(req) {
  try {
    const { prompt, blueprint } = await req.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const b = blueprint ?? {}

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
    return NextResponse.json({ veoData })
  } catch (err) {
    console.error('[generate-veo-prompt]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

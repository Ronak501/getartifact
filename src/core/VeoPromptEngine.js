/**
 * VeoPromptEngine — Phase 3 (Gemini-powered)
 *
 * Calls the server's /api/generate-veo-prompt which uses Gemini 2.5 Flash
 * to convert the website idea + blueprint into a production-quality cinematic
 * Veo video prompt JSON.
 *
 * Returns the structured object:
 * {
 *   website_name, business_type, target_audience, brand_personality,
 *   color_palette, typography, ui_style, 3d_elements, motion_effects,
 *   veo_prompt   ← single cinematic AI video generation prompt for Veo 2
 * }
 */

// ─── Master system prompt (the Creative Director persona) ─────────────────────
export const VEO_SYSTEM_PROMPT = `You are an elite Website Creative Director, UI/UX Designer, Motion Designer, and 3D Web Architect.

Your task is to convert a user's website idea into a cinematic AI video generation prompt that can be used with Google Veo 2 to create a photorealistic preview of the final website.

Analyze the user's description and generate a professional website showcase video prompt.
The output must be detailed enough that another AI could recreate the website accurately.

Requirements for the Veo prompt:
- Written as one continuous cinematic prompt (no line breaks, no bullets)
- Describe the website as if it already exists and is being filmed
- Show ALL website sections sequentially with smooth camera transitions
- Include specific camera movements (dolly, orbit, push, pull, tilt, pan)
- Include smooth animated transitions between sections
- Include glassmorphism UI panels with blur and frosted glass effects
- Include 3D floating objects with physics-based motion
- Include particle systems and volumetric lighting
- Include realistic hover interactions shown by a cursor
- Include scroll-triggered animations with parallax depth
- Include premium typography animations (typewriter, fade, slide)
- Include responsive mobile/desktop layout showcase
- Include realistic reflections on glass and metallic surfaces
- Include depth-of-field cinematic blur on edges
- Describe the actual UI content visible on screen (headlines, CTAs, cards)
- End with a dramatic final frame of the hero CTA

Video Specifications: 60 seconds, 4K, 60fps, Cinematic, Volumetric lighting, Photorealistic

Output ONLY valid JSON matching this exact schema — no markdown, no code fences, no extra text:
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

// ─── Build the user message sent to Gemini ────────────────────────────────────

export function buildVeoUserMessage(prompt, blueprint) {
  const b = blueprint

  return `Generate a complete cinematic Veo video prompt for this website:

USER WEBSITE IDEA:
${prompt}

PRE-ANALYZED BLUEPRINT:
- Website Name: ${b.concept?.websiteName}
- Business Type: ${b.concept?.businessType}
- Target Audience: ${b.concept?.targetAudience}
- Design Style: ${b.concept?.designStyle}
- Brand Personality: ${b.concept?.brandPersonality?.join(', ')}
- USP: ${b.concept?.uniqueSellingProposition}
- Primary Color: ${b.palette?.primary}
- Secondary Color: ${b.palette?.secondary}
- Accent: ${b.palette?.accent}
- Background: ${b.palette?.background}
- 3D Objects: ${b.components?.threeD?.join(', ')}
- Pages: ${b.pages?.map(p => p.name).join(', ')}
- Sections: ${b.pages?.flatMap(p => p.sections?.map(s => s.name)).join(', ')}

The Veo prompt should start with: "Create a cinematic showcase video of ${b.concept?.websiteName}, a premium ${b.concept?.designStyle?.toLowerCase()} website..."

Make the veo_prompt at least 500 words long — ultra detailed, production-quality.
Return ONLY the JSON object.`
}

// ─── Call the API ─────────────────────────────────────────────────────────────

/**
 * Generate the Veo prompt via Gemini 2.5 Flash on the server.
 * Falls back to a local template if the API is unavailable.
 *
 * @param {string} prompt      Raw user prompt
 * @param {object} blueprint   Generated blueprint
 * @param {object} [opts]      { onProgress }
 * @returns {Promise<object>}  Veo prompt data object
 */
export async function generateVeoPrompt(prompt, blueprint, opts = {}) {
  const { onProgress } = opts

  try {
    onProgress?.({ label: 'Calling Gemini 2.5 Flash...' })

    const res = await fetch('/api/generate-veo-prompt', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt, blueprint }),
    })

    if (!res.ok) throw new Error(`API ${res.status}`)

    onProgress?.({ label: 'Parsing Veo prompt...' })
    const data = await res.json()

    onProgress?.({ label: 'Veo prompt ready' })
    return data.veoData
  } catch {
    onProgress?.({ label: 'Using local Veo template...' })
    await new Promise(r => setTimeout(r, 300))
    return buildLocalVeoData(prompt, blueprint)
  }
}

// ─── Local fallback ───────────────────────────────────────────────────────────

function buildLocalVeoData(prompt, bp) {
  const name  = bp.concept?.websiteName ?? 'NeoBrand'
  const style = bp.concept?.designStyle ?? 'Futuristic'
  const p     = bp.palette ?? {}
  const objs  = bp.components?.threeD?.filter(c => !['CameraRig'].includes(c)).slice(0, 3) ?? []

  const veoPrompt = `Create a cinematic showcase video of ${name}, a premium ${style.toLowerCase()} website. The video opens in darkness as particles of light slowly coalesce, forming the ${name} logo with a spectacular reveal — letters emerge from a swirling vortex of luminescent particles against a deep ${p.background ?? '#0a0a14'} void, accompanied by volumetric god rays in ${p.primary ?? '#3d5eff'}. Camera slowly pushes forward into the hero section with breathtaking depth-of-field blur on the periphery. The hero section fills the frame: a massive typography headline "${bp.concept?.tagline ?? name}" fades in with a typewriter effect, each character appearing with a subtle glow. Behind the text, ${objs[0] ?? 'a floating 3D neural network'} rotates slowly in three-dimensional space — every node glowing in ${p.secondary ?? '#00d4ff'}, edge connections pulsing with data. Thousands of micro-particles orbit the central object, creating a breathtaking nebula effect. Glassmorphism panels float in the foreground with frosted-glass blur, containing animated metric cards. The camera performs a slow orbital movement around the hero, revealing parallax depth as foreground elements shift at different speeds. A photorealistic cursor glides across the screen and hovers over the primary CTA button — "${bp.pages?.[0]?.sections?.find(s => s.id === 'hero')?.content?.cta?.primary ?? 'Get Started'}" — triggering a mesmerizing ripple effect and glow explosion in ${p.accent ?? '#bf5fff'}. Camera transitions via a cinematic whip pan to the features section. Three glassmorphism cards rise from below with spring physics, each containing an animated icon and feature description. The cards have visible frosted-glass borders, inner light reflections, and soft drop shadows. On hover, each card lifts with a subtle y-translation and brightness increase. Camera continues scrolling to a product showcase section where ${objs[1] ?? 'a 3D crystal object'} rotates on a holographic display platform. Holographic labels project outward with line connectors pointing to key features, text rendered in ${p.secondary ?? '#00d4ff'} with a scanline effect. A cinematic slow-motion sequence shows the 3D object deconstructing into particles and reassembling. The camera pulls back to reveal a full-width metrics section with animated counters — numbers rolling upward to impressive statistics. Smooth transition to a testimonials row where three floating glass cards contain customer quotes, avatar photographs, and animated 5-star ratings. The cards sway gently with ambient floating physics. A pricing section follows with three tier cards rising in sequence — the recommended middle tier highlighted by a neon border glow animation pulsing in ${p.accent ?? '#bf5fff'}. Toggle switches, feature checkmarks, and CTA buttons animate with satisfying micro-interactions. The video climaxes with a dramatic return to the hero — camera pulls back to show the full viewport, then dramatically zooms into the glowing CTA button. The ${name} logo appears centered in the frame, growing from a point of light to full size with chromatic aberration, bloom, and a final particle burst. Fade to the ${p.background ?? '#0a0a14'} background with the tagline "${bp.concept?.tagline ?? 'The Future is Now'}" appearing in elegant thin weight typography. Throughout the entire 60-second showcase, the color palette stays true to ${p.primary ?? '#3d5eff'} primary, ${p.secondary ?? '#00d4ff'} secondary, and ${p.accent ?? '#bf5fff'} accent tones. Every UI element has pixel-perfect spacing, smooth 60fps animations, and photorealistic rendering quality.`

  return {
    website_name:     name,
    business_type:    bp.concept?.businessType ?? 'Technology',
    target_audience:  bp.concept?.targetAudience ?? 'Tech professionals',
    brand_personality: bp.concept?.brandPersonality?.join(', ') ?? 'innovative, bold',
    color_palette:    [p.primary, p.secondary, p.accent, p.background].filter(Boolean),
    typography:       `${bp.typography?.displayFont ?? 'Syne'} display / ${bp.typography?.bodyFont ?? 'Inter'} body`,
    ui_style:         `${style} glassmorphism with particle systems and 3D depth`,
    '3d_elements':    objs,
    motion_effects:   ['parallax scroll', 'particle field', 'orbital camera', 'spring physics'],
    veo_prompt:       veoPrompt,
  }
}

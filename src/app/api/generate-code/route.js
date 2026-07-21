import { NextResponse } from 'next/server'
import { resolveUserCredits, incrementBuildCount, generateWithModel, parseModelJson } from '@lib/ai-clients'
import { buildFileTree, generateAppJSX, generateAllCode } from '@core/CodeGenerator.js'

const SYSTEM = `You are Getartifact — an award-winning senior creative director, 3D web designer, React developer, and Three.js motion designer.

OUTPUT RULE: Generate ONLY a valid JSON object. No markdown, no code blocks, no comments, no extra text.

Your task: write production-ready React + Framer Motion + React Three Fiber (R3F) code that exactly implements the layout_archetype and design_system from the blueprint.

════════════════════════════════════════
RICH MEDIA & UI RULES
════════════════════════════════════════
- Along with the R3F 3D Canvas, incorporate rich UI elements, layout cards, illustrations, and actual photography where applicable.
- For photos, images, and mockups, use high-quality Unsplash image URLs (e.g., 'https://images.unsplash.com/photo-...' with appropriate visual queries).
- Do not make the website look like an empty 3D space. Combine the 3D subject with interactive grid layouts, modern typography cards, image galleries, and rich HTML interfaces.

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
- REQUIRED: Build a scroll-driven WebGL story, not a static site with one 3D hero. Keep a Canvas active through at least three chapters and bind scroll progress to the main 3D group or camera: position, rotation, scale, and emissive/material values must change as the user scrolls.
- Scroll-bound Movable Elements: Incorporate scroll-bound interactions (like parallax offsets, rotation shifts, or zoom scales) on UI cards and 3D subjects using Framer Motion's 'useScroll' and 'useTransform' so that elements physically slide, float, or morph as the user scrolls.

════════════════════════════════════════
3D SCENE RULES
════════════════════════════════════════
- If a modelUrl is provided, use useGLTF(modelUrl) from '@react-three/drei' to load the user's custom generated 3D model as the main subject. Render <primitive object={scene} /> inside the group. Apply dramatic lighting, camera motion, and postprocessing around it.
- If NO modelUrl is provided, Do NOT use a single generic sphere, box, or torus knot as the main subject.
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

export async function POST(req) {
  try {
    const { prompt, blueprint, modelUrl } = await req.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }
    if (!blueprint) {
      return NextResponse.json({ error: 'blueprint is required' }, { status: 400 })
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

    const USER = `Generate custom production-ready React + Three.js code for: "${prompt}"

BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

${modelUrl ? `3D MODEL ASSET: A custom generated .glb model is available at this URL: "${modelUrl}"
In sceneJSX, use: import { useGLTF } from '@react-three/drei' and load it with const { scene } = useGLTF('${modelUrl}'). Render <primitive object={scene} scale={1.5} /> as the hero subject inside the group. Add dramatic lighting around it.` : ''}

STRICT CODE REQUIREMENTS:
1. heroJSX — implement blueprint.hero.layout + blueprint.creative_concept.layout_archetype. Match the layout archetype code rules above EXACTLY. Use blueprint.hero.headline, subheadline, primary_cta, secondary_cta, animation_style. Import and render Cinematic3DScene inside a Canvas.
2. sceneJSX — implement blueprint.cinematic_3d_scene fully. ${modelUrl ? 'Load the provided .glb via useGLTF. Apply cinematic lighting, camera_motion inside useFrame, and user_interaction.' : 'Build the main_3d_subject as a composed group (not a single sphere/torus). Apply cinematic lighting, camera_motion inside useFrame, and user_interaction.'}
3. sampleSection — implement blueprint.sections[1] (or the most interesting non-hero section). Use the section's layout, visual_treatment, animation, and composition fields. Stagger children with Framer Motion.

Return ONLY the JSON object — no other text.`

    let result = null
    let lastParseError = null

    try {
      const baseRaw = await generateWithModel(plan, SYSTEM, USER)
      let currentRaw = baseRaw

      const repairSystem = `You repair malformed JSON.
Return ONLY valid JSON. No markdown, no comments, no trailing commas.
Escape all quotes inside string values correctly.`

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          result = parseModelJson(currentRaw)
          if (attempt > 1) {
            console.warn(`[generate-code] JSON recovered on attempt ${attempt}`)
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
    } catch (llmErr) {
      console.warn('[generate-code] AI code generation/repair failed, using local CodeGenerator fallback. Error:', llmErr.message)
    }

    // If AI generation or parsing failed, fall back to MasterLayoutEngine/local CodeGenerator
    if (!result) {
      console.log('[generate-code] Falling back to MasterLayoutEngine/local CodeGenerator...')
      const fallbackCode = generateAllCode(blueprint)
      return NextResponse.json({ code: fallbackCode })
    }

    const code = {
      fileTree: buildFileTree(blueprint),
      appJSX: generateAppJSX(blueprint),
      heroJSX: result.heroJSX,
      sceneJSX: result.sceneJSX,
      sampleSection: result.sampleSection,
      installCmd: 'npm install framer-motion @react-three/fiber @react-three/drei @react-three/postprocessing three react-router-dom',
      envSetup: 'cp .env.example .env\n# Add your ANTHROPIC_API_KEY / GEMINI_API_KEY to .env',
      modelUrl: modelUrl ?? null,
    }

    return NextResponse.json({ code })
  } catch (err) {
    console.error('[generate-code]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

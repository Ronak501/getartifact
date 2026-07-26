import { NextResponse } from 'next/server'
import { resolveUserCredits, incrementBuildCount, generateWithModel, parseModelJson } from '@lib/ai-clients'

const SYSTEM = `You are Getartifact — an award-winning senior creative director, UI/UX architect, and 3D web designer.
Your task is to generate a rich, highly dynamic, custom website visual blueprint for the user's prompt.

PRIME DIRECTIVE: NEVER reuse the same website structure, text, colors, or 3D visual. Every single website generated MUST be completely custom-tailored to the user's exact domain, industry, and prompt!

1. 3D VISUAL ENGINE:
Pick the most striking 3D object type from this list that matches the user's topic:
- "orbital" (orbiting rings, tech hubs, planetary rings, saas platforms)
- "crystal" (gemstones, diamonds, luxury shards, crypto prisms, finance)
- "neural" (AI networks, brain synapses, connected nodes, data science)
- "dna" (bio-helices, medical strands, organic molecules, healthcare)
- "particles" (floating starfields, magical dust, energy clouds, creative studios)
- "planet" (earth, space spheres, globes, cosmos, travel, sustainability)
- "torus" (twisted knots, geometric sculptures, creative art, design agencies)
- "hologram" (wireframe projections, cyber HUDs, futuristic grids, security)
- "warp" (wormholes, speed tunnels, time portals, automotive, gaming)
- "morph" (liquid metal, lava blobs, organic fluid shapes, modern fashion)
- "matrix" (digital rain, code cascades, hacker streams, developer tools)
- "icosa" (polyhedrons, geometric prisms, architectural shapes, real estate)

2. HERO LAYOUT ENGINE:
Pick one layout archetype (randomize and match brand vibe):
- "split" (50/50 left text, right 3D interactive subject)
- "centered" (cinematic centered headline over immersive background 3D canvas)
- "magazine" (editorial typographic grid with bold oversized headlines)
- "minimal" (clean luxury Scandinavian whitespace with floating 3D accent)

3. COLOR PALETTE ENGINE:
Tailor the hex colors specifically to the mood and industry (e.g. bakery/food = warm golden cream, cocoa brown & honey yellow; crypto/tech = electric neon cyan, violet & dark void black; luxury fashion = ivory, rose gold & velvet black; eco/nature = forest green, sage & warm earth; fitness = electric orange, crimson & deep carbon). Ensure high contrast between background and text!

4. SECTION GENERATOR (Generate 3 to 5 unique sections):
NEVER generate generic "Why Us" or "Instant Performance" unless the site is a generic cloud platform.
If the prompt is about a coffee shop or restaurant, generate sections like: "Artisanal Blends" (features), "Our Roast Process" (process), "Customer Reviews" (testimonials).
If the prompt is about an AI startup, generate sections like: "Autonomous Agents" (features), "10x Speed Multiplier" (stats), "Enterprise Pricing" (pricing).
Supported section types: "features" | "stats" | "testimonials" | "pricing" | "cta" | "process" | "faq" | "about".

OUTPUT RULE: Return ONLY a valid JSON object matching the exact schema below. No markdown fences, no comments, no extra text.

JSON SCHEMA:
{
  "website_name": "Unique Brand Name",
  "business_type": "Specific Industry / Domain",
  "design_style": "Visual style description",
  "color_palette": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex"
  },
  "typography": {
    "heading_font": "Syne | Outfit | Playfair Display | Space Grotesk | Cinzel | Montserrat | Clash Display",
    "body_font": "Inter | Roboto | Plus Jakarta Sans | DM Sans | Lato | Satoshi"
  },
  "navbar": {
    "logo": "Brand Name",
    "links": ["Link 1", "Link 2", "Link 3", "Link 4"]
  },
  "hero": {
    "headline": "Captivating, domain-specific primary headline (3-7 words)",
    "subheadline": "Persuasive subheadline explaining the unique value proposition (10-20 words)",
    "cta_primary": "Action-oriented button text",
    "cta_secondary": "Secondary action text",
    "layout": "split | centered | magazine | minimal",
    "background_type": "gradient_mesh | blobs | radial | editorial",
    "animation": "particle_float | magnetic_hover | pulse_glow",
    "three_d_object": {
      "type": "spiderman | airpods | car | watch | orbital | crystal | neural | dna | particles | planet | torus | hologram | warp | morph | matrix | icosa",
      "material": "glass | metallic | hologram | wireframe | neon",
      "animation": "slow_rotation | floating | pulse"
    }
  },
  "sections": [
    {
      "id": "unique-section-1",
      "type": "features | stats | testimonials | pricing | cta | process | faq | about",
      "title": "Creative Section Heading",
      "subtitle": "ENGAGING SUBTITLE",
      "content": [
        { "icon": "✨", "title": "Specific Feature Title", "description": "Detailed explanation relevant to the user prompt." },
        { "icon": "🔥", "title": "Another Feature", "description": "Tailored domain content." }
      ],
      "animation": "slide_up | count_up | fade_in"
    }
  ],
  "footer": {
    "tagline": "Brand tagline",
    "text": "© 2026 Brand. All rights reserved.",
    "links": ["Privacy Policy", "Terms of Service", "Contact Us"]
  }
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

    const USER = `Generate a stunning, completely unique website visual blueprint for this prompt:
"${prompt}"

Make sure the colors, typography, 3D object type, hero layout, and section text are 100% specific to "${prompt}". Do not use generic tech placeholders!`

    let result = null

    try {
      const raw = await generateWithModel(plan, SYSTEM, USER)
      result = parseModelJson(raw)
    } catch (llmErr) {
      console.warn('[generate-website-blueprint] AI generation failed, using dynamic procedural fallback:', llmErr.message)
      result = buildDynamicFallback(prompt)
    }

    if (!result || !result.hero || !result.sections) {
      result = buildDynamicFallback(prompt)
    }

    return NextResponse.json({ websiteBlueprint: result })
  } catch (err) {
    console.error('[generate-website-blueprint]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Procedural dynamic fallback tailored to prompt keywords if AI is temporarily unreachable
function buildDynamicFallback(prompt) {
  const p = (prompt ?? '').toLowerCase()
  
  let type = 'orbital', bg = '#0a0a14', primary = '#3d5eff', secondary = '#00d4ff', accent = '#bf5fff'
  let layout = 'split', headingFont = 'Syne', businessType = 'Technology'
  let sections = []

  if (/spider|marvel|hero|comic|avenger|batman|super/i.test(p)) {
    type = 'spiderman'; bg = '#06060c'; primary = '#e60026'; secondary = '#0055ff'; accent = '#ff003c'
    layout = 'split'; headingFont = 'Clash Display'; businessType = 'Superhero & Comics'
    sections = [
      {
        id: 'powers', type: 'features', title: 'Web-Slinging Tech', subtitle: 'WITH GREAT POWER',
        content: [
          { icon: '🕸️', title: 'Organic Webbing', description: 'High-tensile synthetic polymers stronger than steel wire.' },
          { icon: '🕷️', title: 'Spider-Sense AI', description: 'Early warning predictive threat perception engine.' },
          { icon: '⚡', title: 'Wall-Crawling Grip', description: 'Molecular electrostatic adhesion on any urban surface.' }
        ],
        animation: 'slide_up'
      },
      {
        id: 'stats', type: 'stats', title: 'Hero Record', subtitle: 'CITY PROTECTED',
        content: [
          { value: '1,400+', label: 'Citizens Saved' }, { value: '0', label: 'Villains Escaped' },
          { value: '300 mph', label: 'Web Velocity' }, { value: '24/7', label: 'Vigilance' }
        ],
        animation: 'count_up'
      }
    ]
  } else if (/airpod|earbud|headphone|audio|sound|music|podcast|speaker/i.test(p)) {
    type = 'airpods'; bg = '#09090b'; primary = '#ffffff'; secondary = '#0071e3'; accent = '#2997ff'
    layout = 'centered'; headingFont = 'Inter'; businessType = 'Audio & Tech'
    sections = [
      {
        id: 'features', type: 'features', title: 'Acoustic Perfection', subtitle: 'SOUND REIMAGINED',
        content: [
          { icon: '🎧', title: 'Active Noise Cancellation', description: 'Silences the world with dual-beamforming microphones.' },
          { icon: '✨', title: 'Spatial Audio', description: 'Personalized 3D theater-like surround sound tracking.' },
          { icon: '🔋', title: '30-Hour Battery', description: 'All-day listening with the MagSafe charging case.' }
        ],
        animation: 'slide_up'
      },
      {
        id: 'stats', type: 'stats', title: 'Acoustic Specs', subtitle: 'THE HARDWARE',
        content: [
          { value: '2x', label: 'More Noise Cancelling' }, { value: '30 hrs', label: 'Total Listening Time' },
          { value: 'H2', label: 'Custom Bionic Chip' }, { value: '<1ms', label: 'Audio Latency' }
        ],
        animation: 'count_up'
      }
    ]
  } else if (/car|auto|racing|vehicle|drive|motor|speed/i.test(p)) {
    type = 'car'; bg = '#08080a'; primary = '#ff1e00'; secondary = '#ff8800'; accent = '#00f0ff'
    layout = 'split'; headingFont = 'Space Grotesk'; businessType = 'Automotive & Racing'
    sections = [
      {
        id: 'features', type: 'features', title: 'Engineered for Speed', subtitle: 'PEAK AERODYNAMICS',
        content: [
          { icon: '⚡', title: '0-60 in 1.8s', description: 'Instant electric torque delivered via quad-motor AWD.' },
          { icon: '🔋', title: '520 Mile Range', description: 'Solid-state battery architecture for cross-country endurance.' },
          { icon: '🤖', title: 'Autopilot AI', description: '360-degree neural vision processing 2,500 frames per second.' }
        ],
        animation: 'slide_up'
      },
      {
        id: 'stats', type: 'stats', title: 'Performance Metrics', subtitle: 'TRACK TESTED',
        content: [
          { value: '1.8s', label: '0-60 mph' }, { value: '210 mph', label: 'Top Speed' },
          { value: '1,020 HP', label: 'Horsepower' }, { value: '0.20 Cd', label: 'Drag Coefficient' }
        ],
        animation: 'count_up'
      }
    ]
  } else if (/food|bakery|restaurant|cafe|coffee|pizza|cake|burger/i.test(p)) {
    type = 'morph'; bg = '#1a120b'; primary = '#e5a93b'; secondary = '#d47a2a'; accent = '#ffc857'
    layout = 'magazine'; headingFont = 'Playfair Display'; businessType = 'Food & Beverage'
    sections = [
      {
        id: 'menu-highlights', type: 'features', title: 'Artisanal Selection', subtitle: 'HANDCRAFTED DAILY',
        content: [
          { icon: '☕', title: 'Specialty Roasts', description: 'Ethically sourced beans from organic high-altitude farms.' },
          { icon: '🥐', title: 'Fresh Pastries', description: 'Baked fresh every morning using imported French butter.' },
          { icon: '🌿', title: '100% Organic', description: 'No artificial additives, preservatives, or refined sugars.' }
        ],
        animation: 'slide_up'
      },
      {
        id: 'stats', type: 'stats', title: 'Our Love for Craft', subtitle: 'BY THE NUMBERS',
        content: [
          { value: '15K+', label: 'Happy Customers' }, { value: '100%', label: 'Organic Ingredients' },
          { value: '24/7', label: 'Fresh Baking' }, { value: '4.9★', label: 'Average Rating' }
        ],
        animation: 'count_up'
      }
    ]
  } else if (/crypto|nft|web3|blockchain|token|defi|coin/i.test(p)) {
    type = 'crystal'; bg = '#05050a'; primary = '#00ffcc'; secondary = '#7928ca'; accent = '#ff007a'
    layout = 'centered'; headingFont = 'Space Grotesk'; businessType = 'Web3 & Blockchain'
    sections = [
      {
        id: 'features', type: 'features', title: 'Next-Gen Protocol', subtitle: 'DECENTRALIZED POWER',
        content: [
          { icon: '💎', title: 'Zero-Gas Swaps', description: 'Instant liquidity execution with optimized cryptographic routing.' },
          { icon: '🛡️', title: 'Audited Security', description: 'Multi-sig vault protection verified by leading security firms.' },
          { icon: '⚡', title: 'Cross-Chain Bridge', description: 'Seamless asset transfer across 15+ EVM and non-EVM networks.' }
        ],
        animation: 'slide_up'
      },
      {
        id: 'stats', type: 'stats', title: 'Protocol Volume', subtitle: 'LIVE METRICS',
        content: [
          { value: '$4.2B', label: 'Total Value Locked' }, { value: '350K+', label: 'Active Wallets' },
          { value: '0.01s', label: 'Block Time' }, { value: '$0', label: 'Gas Failures' }
        ],
        animation: 'count_up'
      }
    ]
  } else if (/gym|fitness|workout|health|yoga|sport|athlete/i.test(p)) {
    type = 'torus'; bg = '#0d0d0d'; primary = '#ff3e00'; secondary = '#ff8c00'; accent = '#00e5ff'
    layout = 'split'; headingFont = 'Outfit'; businessType = 'Fitness & Health'
    sections = [
      {
        id: 'programs', type: 'features', title: 'Elite Training Programs', subtitle: 'PUSH YOUR LIMITS',
        content: [
          { icon: '🔥', title: 'HIIT Conditioning', description: 'High-intensity interval sessions designed for maximum caloric burn.' },
          { icon: '💪', title: 'Strength & Power', description: 'Olympic lifting and functional hypertrophy coaching.' },
          { icon: '🧘', title: 'Active Recovery', description: 'Guided mobility, cryotherapy, and deep tissue restoration.' }
        ],
        animation: 'slide_up'
      },
      {
        id: 'stats', type: 'stats', title: 'Proven Transformations', subtitle: 'THE RESULTS',
        content: [
          { value: '5,000+', label: 'Lives Transformed' }, { value: '50+', label: 'Elite Coaches' },
          { value: '100%', label: 'Commitment' }, { value: '15', label: 'Global Studio Locations' }
        ],
        animation: 'count_up'
      }
    ]
  } else {
    // Default dynamic modern tech
    type = 'neural'; bg = '#07080f'; primary = '#4f7fff'; secondary = '#00e5ff'; accent = '#9f5fff'
    layout = 'split'; headingFont = 'Syne'; businessType = 'Innovation & Technology'
    sections = [
      {
        id: 'features', type: 'features', title: 'Core Capabilities', subtitle: 'BUILT FOR TOMORROW',
        content: [
          { icon: '🚀', title: 'Intelligent Architecture', description: 'Self-optimizing workflows powered by real-time neural processing.' },
          { icon: '🌐', title: 'Universal Integration', description: 'Connect seamlessly with your entire enterprise software stack.' },
          { icon: '🛡️', title: 'Quantum-Ready Security', description: 'Next-generation encryption protocols to protect your vital data.' }
        ],
        animation: 'slide_up'
      },
      {
        id: 'stats', type: 'stats', title: 'Global Impact', subtitle: 'PERFORMANCE METRICS',
        content: [
          { value: '10x', label: 'Productivity Boost' }, { value: '99.99%', label: 'Reliability SLA' },
          { value: '1M+', label: 'Daily Operations' }, { value: '<5ms', label: 'Processing Speed' }
        ],
        animation: 'count_up'
      }
    ]
  }

  const cleanPrompt = prompt.charAt(0).toUpperCase() + prompt.slice(1)

  return {
    website_name: cleanPrompt.split(' ').slice(0, 3).join(' ') || 'Apex',
    business_type: businessType,
    design_style: 'Modern Dynamic',
    color_palette: { primary, secondary, accent, background: bg, text: '#f0f0ff' },
    typography: { heading_font: headingFont, body_font: 'Inter' },
    navbar: { logo: cleanPrompt.split(' ')[0] || 'Brand', links: ['Features', 'About', 'Testimonials', 'Contact'] },
    hero: {
      headline: `The Next Evolution of ${businessType}`,
      subheadline: `Experience unmatched quality, innovative design, and powerful performance tailored for ${prompt}.`,
      cta_primary: 'Explore Now',
      cta_secondary: 'Learn More',
      layout: layout,
      background_type: 'radial',
      animation: 'particle_float',
      three_d_object: { type: type, material: 'glass', animation: 'slow_rotation' }
    },
    sections: sections,
    footer: {
      tagline: `Redefining ${businessType} for a modern world.`,
      text: `© 2026 ${cleanPrompt.split(' ')[0] || 'Brand'}. All rights reserved.`,
      links: ['Privacy', 'Terms', 'Contact']
    }
  }
}

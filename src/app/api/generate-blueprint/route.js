import { NextResponse } from "next/server";
import {
  resolveUserCredits,
  incrementBuildCount,
  generateWithModel,
} from "@lib/ai-clients";
import { classifyIndustry, getVariation } from "@lib/blueprint-helpers";
import { buildLocalBlueprint } from "@core/BlueprintGenerator";

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
  "model_subject": "Short noun phrase (2-5 words) describing the hero 3D object to generate. Examples: 'futuristic wristwatch', 'luxury sports sneaker', 'AI microchip', 'geometric crystal gem', 'space rocket engine'. Must be a single concrete physical object that Meshy AI can sculpt.",
  "model_style": "<realistic|cartoon|pbr|sculpture|voxel>  — choose the Meshy art style that best matches the brand",
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
  "tech": {
    "framework": "React 18", "renderer": "React Three Fiber", "helpers": ["Drei", "Leva"],
    "animation": ["GSAP", "Framer Motion"], "styling": "Tailwind CSS v3", "state": "Zustand", "build": "Vite 5"
  },
  "components": {
    "layout": ["Navbar", "Footer", "ScrollProgress"],
    "sections": [], "threeD": ["ParticleField", "CameraRig"], "pages": []
  },
  "seo": { "title": "", "description": "", "keywords": [], "ogImage": "/og-image.jpg" }
}`;

export async function POST(req) {
  try {
    const { prompt, intent } = await req.json();
    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 },
      );
    }

    const authHeader = req.headers.get("authorization");
    const credits = await resolveUserCredits(authHeader);

    if (credits && !credits.can_build) {
      return NextResponse.json(
        {
          error: "Build limit reached",
          code: "LIMIT_REACHED",
          plan: credits.plan,
          used: credits.builds_used,
          limit: credits.builds_limit,
        },
        { status: 402 },
      );
    }

    const plan = credits?.plan ?? "free";
    const industry = classifyIndustry(prompt);
    const variation = getVariation(industry);

    const USER = `Generate a complete website blueprint for:
"${prompt}"

MANDATORY DESIGN SPECIFICATION — follow exactly:
- Industry: ${industry}
- Visual style: "${variation.style}"
- Layout: "${variation.layout}"
- Primary 3D object: "${variation.threeDObj}"
- Secondary 3D object: "${variation.threeDObj2}"
- Animation style: "${variation.animation}"
- Colors: background ${variation.palette.bg}, primary ${variation.palette.primary}, secondary ${variation.palette.secondary}, accent ${variation.palette.accent}

Pre-analyzed intent:
- Website Name: ${intent?.websiteName ?? "unknown"}
- Pages: ${intent?.pages?.join(", ") ?? "Home, About, Services, Contact"}

IMPORTANT: Set "model_subject" to a short 2-5 word noun phrase for the single hero 3D object that Meshy AI will sculpt (e.g. "futuristic wristwatch", "luxury sneaker", "AI microchip"). Make it match the brand and industry.
Set "model_style" to one of: realistic, cartoon, pbr, sculpture, voxel.

Generate 3-5 pages, 3-6 sections each.
Return ONLY the JSON blueprint object.`;

    const raw = await generateWithModel(plan, SYSTEM, USER);
    const clean = raw
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    let blueprint;

    try {
      blueprint = JSON.parse(clean);
    } catch (parseErr) {
      console.warn(
        "[generate-blueprint] Model returned malformed JSON, using local fallback:",
        parseErr.message,
      );
      blueprint = buildLocalBlueprint({
        prompt,
        websiteName: intent?.websiteName ?? prompt.slice(0, 40),
        style: variation.style,
        palette: variation.palette,
        brandPersonality: intent?.brandPersonality ?? [
          variation.style,
          industry,
          "custom",
        ],
        pages: intent?.pages?.length
          ? intent.pages
          : ["Home", "About", "Services", "Contact"],
        threeObjects: [variation.threeDObj, variation.threeDObj2],
      });
    }

    if (credits?.sb && credits.userId) {
      incrementBuildCount(credits.sb, credits.userId);
    }

    return NextResponse.json({ blueprint, plan });
  } catch (err) {
    console.error("[generate-blueprint]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

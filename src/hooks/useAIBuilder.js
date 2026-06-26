/**
 * useAIBuilder — full Prompt → Blueprint → Website Blueprint → Veo → Code pipeline.
 *
 * Phase 1: ANALYZING  — AIArchitect.analyzePrompt()              (local)
 * Phase 2: GENERATING — BlueprintGenerator.generateBlueprint()   (Claude)
 * Phase 3: WEBSITE    — WebsiteBlueprintEngine.generateWebsite() (Claude)
 * Phase 4: VEO        — VeoPromptEngine.generateVeoPrompt()      (Gemini 2.5 Flash)
 * Phase 5: BUILDING   — CodeGenerator.generateAllCode()          (local)
 * Phase 6: READY      → finishGeneration() + Supabase save
 */

import { useCallback } from 'react'
import { analyzePrompt }            from '@core/AIArchitect'
import { generateBlueprint }        from '@core/BlueprintGenerator'
import { generateWebsiteBlueprint } from '@core/WebsiteBlueprintEngine'
import { generateVeoPrompt }        from '@core/VeoPromptEngine'
import { generateAllCode }          from '@core/CodeGenerator'
import useBlueprintStore, { PHASES, OUTPUT_TABS } from '@store/blueprintStore'
import useAuthStore from '@store/authStore'
import useCreditStore from '@store/creditStore'
import { supabase } from '@lib/supabase'

export function useAIBuilder() {
  const {
    prompt,
    setPhase,
    finishGeneration,
    setError,
  } = useBlueprintStore()

  const run = useCallback(async (customPrompt) => {
    const input = customPrompt ?? prompt
    if (!input?.trim()) return

    // ── Credit gate ───────────────────────────────────────────────────────────
    const credits = useCreditStore.getState()
    if (credits.loaded && !credits.can_build) {
      setError(`Build limit reached (${credits.builds_used}/${credits.builds_limit} used on ${credits.plan} plan). Upgrade to continue.`)
      return
    }

    try {
      // ── Phase 1: Analyze ──────────────────────────────────────────────────
      setPhase(PHASES.ANALYZING, 'Analyzing intent...', 5)
      await tick()
      const intent = analyzePrompt(input)

      // ── Phase 2: Architecture Blueprint (Claude) ───────────────────────────
      setPhase(PHASES.GENERATING, 'Generating architecture blueprint...', 16)
      const blueprint = await generateBlueprint(intent, {
        onProgress: ({ phase: p, label }) => {
          const map = { 1: 22, 2: 32, 3: 40 }
          setPhase(PHASES.GENERATING, label, map[p] ?? 28)
        },
      })

      // ── Phase 3: Render-ready Website Blueprint (Claude) ──────────────────
      setPhase(PHASES.WEBSITE, 'Generating render-ready website blueprint...', 48)
      const websiteBlueprint = await generateWebsiteBlueprint(input, label => {
        setPhase(PHASES.WEBSITE, label, 56)
      })
      blueprint.websiteBlueprint = websiteBlueprint

      // ── Phase 4: Veo Prompt (Gemini 2.5 Flash) ─────────────────────────────
      setPhase(PHASES.VEO, 'Building Veo 2 cinematic prompt...', 65)
      const veoData = await generateVeoPrompt(input, blueprint, {
        onProgress: ({ label }) => setPhase(PHASES.VEO, label, 72),
      })
      blueprint.veoData = veoData

      // ── Phase 5: Code Generation (AI-driven with local fallback) ───────────
      setPhase(PHASES.BUILDING, 'Generating React + Three.js components...', 84)
      try {
        const codeRes = await fetch('/api/generate-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: input, blueprint }),
        })
        if (!codeRes.ok) throw new Error(`Code API responded with status ${codeRes.status}`)
        const { code } = await codeRes.json()
        blueprint.generatedCode = code
      } catch (err) {
        console.warn('[useAIBuilder] Dynamic code generation failed, using local templates fallback:', err.message)
        blueprint.generatedCode = generateAllCode(blueprint)
      }

      // ── Phase 6: Done — single atomic state update ─────────────────────────
      finishGeneration(blueprint, intent, websiteBlueprint, veoData)

      // ── Optimistic credit decrement ────────────────────────────────────────
      useCreditStore.getState().optimisticDecrement()

      // ── Cloud Save (if authenticated) ──────────────────────────────────────
      const user = useAuthStore.getState().user
      if (user) {
        supabase.from('blueprints').insert({
          user_id:                user.id,
          name:                   blueprint.concept?.websiteName ?? 'Untitled',
          prompt:                 input,
          design_style:           blueprint.concept?.designStyle  ?? null,
          color_primary:          blueprint.palette?.primary       ?? null,
          color_secondary:        blueprint.palette?.secondary     ?? null,
          color_accent:           blueprint.palette?.accent        ?? null,
          blueprint_json:         blueprint,
          website_blueprint_json: websiteBlueprint,
          veo_data_json:          veoData,
          generated_code_json:    blueprint.generatedCode ?? null,
        }).then(({ error }) => {
          if (error) console.warn('[Supabase] Blueprint save failed:', error.message)
        })
      }

    } catch (err) {
      setError(err?.message ?? 'Generation failed')
    } finally {
      // Refresh real credit count from server
      useCreditStore.getState().fetchCredits()
    }
  }, [prompt, setPhase, finishGeneration, setError])

  return { run }
}

const tick = () => new Promise(r => setTimeout(r, 60))

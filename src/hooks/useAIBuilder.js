"use client"

import { useCallback } from 'react'
import useBlueprintStore, { PHASES, OUTPUT_TABS } from '@store/blueprintStore'
import useAuthStore    from '@store/authStore'
import useCreditStore  from '@store/creditStore'
import { supabase }    from '@lib/supabase'
import { addArtifact } from '@lib/artifactStore'

/**
 * useAIBuilder — orchestrates the new parallel dual-track pipeline:
 *
 *   Step 1 (sequential):  Blueprint generation
 *   Step 2 (parallel):    Track A: 3D model (Meshy)  +  Track B: Code (LLM)
 *   Step 3 (sequential):  Assemble → READY
 */
export function useAIBuilder() {
  const { prompt, setPhase, setError, setModelAsset, setTrackStatus } = useBlueprintStore()

  const run = useCallback(async (customPrompt) => {
    const input = customPrompt ?? prompt
    if (!input?.trim()) return

    const credits = useCreditStore.getState()
    if (credits.loaded && !credits.can_build) {
      setError(`Build limit reached (${credits.builds_used}/${credits.builds_limit} used). Upgrade to continue.`)
      return
    }

    const authHeader = useAuthStore.getState().session?.access_token
      ? `Bearer ${useAuthStore.getState().session.access_token}`
      : null

    const headers = {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    }

    try {
      // ─────────────────────────────────────────────────────────────────────
      // STEP 1 — Generate Blueprint (sequential, needed for both tracks)
      // ─────────────────────────────────────────────────────────────────────
      setPhase(PHASES.BLUEPRINT, 'Generating design blueprint & 3D concept...', 10)
      useBlueprintStore.setState({ trackStatus: { blueprint: 'running', asset3d: 'idle', code: 'idle' } })

      const bpRes = await fetch('/api/generate-blueprint', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: input }),
      })
      if (!bpRes.ok) throw new Error(`Blueprint generation failed: ${bpRes.status}`)
      const { blueprint: rawBlueprint } = await bpRes.json()
      useBlueprintStore.setState({ trackStatus: { blueprint: 'done', asset3d: 'idle', code: 'idle' } })

      // Extract 3D model hints from blueprint
      const modelSubject = rawBlueprint.model_subject ?? rawBlueprint.concept?.websiteName ?? 'abstract 3D sculpture'
      const modelStyle   = rawBlueprint.model_style ?? 'realistic'

      // ─────────────────────────────────────────────────────────────────────
      // STEP 2 — Parallel: Track A (3D Asset) + Track B (Code)
      // ─────────────────────────────────────────────────────────────────────
      setPhase(PHASES.ASSET_3D, 'Generating 3D model asset & writing React components...', 30)
      useBlueprintStore.setState({
        trackStatus: { blueprint: 'done', asset3d: 'running', code: 'running' },
      })

      const [assetResult, codeResult] = await Promise.allSettled([
        // ── Track A: Meshy 3D Model ─────────────────────────────────────────
        (async () => {
          const res = await fetch('/api/generate-3d-model', {
            method: 'POST',
            headers,
            body: JSON.stringify({ modelPrompt: modelSubject, style: modelStyle }),
          })
          if (!res.ok) return { modelUrl: null, previewUrl: null, fallback: true, status: 'http_error' }
          return res.json()
        })(),

        // ── Track B: Website Blueprint + Code ───────────────────────────────
        (async () => {
          // 2b-i: Generate rich visual website blueprint
          setPhase(PHASES.CODE_GENERATION, 'Generating React + Three.js components...', 50)

          const wbRes = await fetch('/api/generate-website-blueprint', {
            method: 'POST',
            headers,
            body: JSON.stringify({ prompt: input }),
          }).catch(() => null)

          let websiteBlueprint = null
          if (wbRes?.ok) {
            const wbData = await wbRes.json()
            websiteBlueprint = wbData.websiteBlueprint ?? null
          }

          // Fall back to raw blueprint if the website-blueprint route fails
          const blueprintForCode = websiteBlueprint ?? rawBlueprint

          // 2b-ii: Generate code — NOTE: modelUrl not yet available here (parallel)
          //        We pass null and let assembly re-call if needed, or accept procedural fallback.
          const codeRes = await fetch('/api/generate-code', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              prompt: input,
              blueprint: blueprintForCode,
              // modelUrl is null here — if Meshy succeeds, it's stored in modelAsset
              // and injected into the final blueprint for the code output panel
            }),
          })
          if (!codeRes.ok) throw new Error(`Code generation failed: ${codeRes.status}`)
          const codeData = await codeRes.json()
          return { code: codeData.code, websiteBlueprint: blueprintForCode }
        })(),
      ])

      // ─────────────────────────────────────────────────────────────────────
      // STEP 3 — Assembly: merge Track A + Track B results
      // ─────────────────────────────────────────────────────────────────────
      setPhase(PHASES.ASSEMBLING, 'Assembling your site...', 90)

      // Extract Track A result
      const assetData = assetResult.status === 'fulfilled'
        ? assetResult.value
        : { modelUrl: null, previewUrl: null, fallback: true, status: 'rejected' }

      setModelAsset(assetData)
      useBlueprintStore.setState({
        trackStatus: {
          blueprint: 'done',
          asset3d:   assetData.fallback ? 'fallback' : 'done',
          code:      codeResult.status === 'fulfilled' ? 'done' : 'error',
        },
      })

      if (codeResult.status === 'rejected') {
        throw new Error(`Code generation failed: ${codeResult.reason?.message ?? 'unknown error'}`)
      }

      const { code, websiteBlueprint } = codeResult.value

      // Build the unified blueprint object
      const unifiedBlueprint = {
        ...rawBlueprint,
        websiteBlueprint,
        modelAsset: assetData,
        tech: {
          framework: 'Next.js 14',
          renderer:  'React Three Fiber',
          helpers:   ['Drei', 'Leva'],
          animation: ['Framer Motion', 'GSAP'],
          styling:   'Tailwind CSS v3',
          state:     'Zustand',
          build:     'Next',
        },
        generatedCode: {
          heroJSX:       code?.heroJSX       ?? null,
          sceneJSX:      code?.sceneJSX      ?? null,
          sampleSection: code?.sampleSection ?? null,
          appJSX:        code?.appJSX        ?? null,
          fileTree:      code?.fileTree      ?? null,
          installCmd:    code?.installCmd    ?? null,
          modelUrl:      assetData.modelUrl  ?? null,
        },
      }

      // ─────────────────────────────────────────────────────────────────────
      // Finish — commit to store
      // ─────────────────────────────────────────────────────────────────────
      useBlueprintStore.getState().finishGeneration(unifiedBlueprint, null)

      // Cloud Save
      const user = useAuthStore.getState().user
      if (user) {
        supabase.from('blueprints').insert({
          user_id:             user.id,
          name:                rawBlueprint.concept?.websiteName ?? '3D Site',
          prompt:              input,
          design_style:        rawBlueprint.concept?.designStyle ?? '3D Interactive',
          color_primary:       rawBlueprint.palette?.primary ?? null,
          color_secondary:     rawBlueprint.palette?.secondary ?? null,
          color_accent:        rawBlueprint.palette?.accent ?? null,
          blueprint_json:      unifiedBlueprint,
          veo_data_json:       null,
          generated_code_json: unifiedBlueprint.generatedCode,
        }).then(({ error }) => {
          if (error) console.warn('[Supabase] Sync failed:', error.message)
        })

        addArtifact({
          user_id: user.id,
          prompt: input,
          output: unifiedBlueprint,
          model_used: rawBlueprint?.meta?.model ?? null,
          metadata: {
            source: 'builder',
            plan,
            hasModelAsset: Boolean(assetData?.modelUrl),
            usedFallbackAsset: Boolean(assetData?.fallback),
          },
        }).then(({ error }) => {
          if (error) console.warn('[Artifacts] Save failed:', error.message)
        })
      }

      useCreditStore.getState().optimisticDecrement()

    } catch (err) {
      setError(err?.message ?? 'Generation failed')
    } finally {
      useCreditStore.getState().fetchCredits()
    }
  }, [prompt, setPhase, setError, setModelAsset, setTrackStatus])

  return { run }
}

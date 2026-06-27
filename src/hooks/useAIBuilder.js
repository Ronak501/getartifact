"use client"

import { useCallback } from 'react'
import useBlueprintStore, { PHASES, OUTPUT_TABS } from '@store/blueprintStore'
import useAuthStore    from '@store/authStore'
import useCreditStore  from '@store/creditStore'
import { supabase }    from '@lib/supabase'

export function useAIBuilder() {
  const {
    prompt,
    setPhase,
    setVideoUrl,
    setVideoProgress,
    setVideoSite,
    setError,
  } = useBlueprintStore()

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

    try {
      // ── Step 1: Generate Storyboard & Veo Prompt ───────────────────────────
      setPhase(PHASES.STORYBOARD, 'Generating website storyboard and design layout...', 15)
      
      const sbRes = await fetch('/api/generate-storyboard', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ prompt: input }),
      })
      if (!sbRes.ok) throw new Error(`Storyboard generation failed: ${sbRes.status}`)
      const { storyboard } = await sbRes.json()

      useBlueprintStore.setState({ storyboard, approved: false, videoUrl: null, videoSite: null })

      // ── Step 2: Render Cinematic 3D Preview Video ─────────────────────────
      setPhase(PHASES.VIDEO_RENDERING, 'Rendering 3D preview video (Veo 2)...', 40)
      
      const veoPrompt = storyboard.veo_prompt
      const videoRes = await fetch('/api/generate-video', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ veoPrompt }),
      })

      if (!videoRes.ok) throw new Error(`Video API failed: ${videoRes.status}`)

      const reader  = videoRes.body.getReader()
      const decoder = new TextDecoder()
      let finalUrl = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            if (data.status === 'processing') {
              setVideoProgress(data.progress || 0.5)
              setPhase(PHASES.VIDEO_RENDERING, data.message || 'Rendering video...', Math.round(40 + (data.progress || 0) * 40))
            } else if (data.status === 'complete') {
              finalUrl = data.videoUri
            } else if (data.status === 'error') {
              throw new Error(data.message || 'Video generation error')
            }
          }
        }
      }

      if (!finalUrl) throw new Error('Video generation completed but no video URL returned')

      // Convert Google Storage gs:// URI to our authenticated Proxy URL
      const proxyUrl = `/api/video-proxy?uri=${encodeURIComponent(finalUrl)}`
      setVideoUrl(proxyUrl)

      // ── Step 3: Enter User Review Gate ────────────────────────────────────
      setPhase(PHASES.USER_REVIEW, 'Review your website 3D preview video to proceed', 100)
      useBlueprintStore.setState({ activeTab: OUTPUT_TABS.VIDEO })

    } catch (err) {
      setError(err?.message ?? 'Generation failed')
    }
  }, [prompt, setPhase, setError, setVideoProgress, setVideoUrl])

  // ── Step 4 & 5: Vision AI Analysis & Code Generation (Post-Approval) ─────
  const approveAndBuild = useCallback(async () => {
    const state = useBlueprintStore.getState()
    const { videoUrl, storyboard, prompt: input } = state
    if (!videoUrl || !storyboard) return

    const authHeader = useAuthStore.getState().session?.access_token
      ? `Bearer ${useAuthStore.getState().session.access_token}`
      : null

    try {
      useBlueprintStore.setState({ approved: true })

      // ── Step 4: Vision AI Analysis on Video Frames ─────────────────────────
      setPhase(PHASES.VISION_ANALYSIS, 'Analyzing video frames via Vision AI pipeline...', 25)

      const visRes = await fetch('/api/vision-analysis', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ videoUrl, storyboard }),
      })
      if (!visRes.ok) throw new Error(`Vision analysis failed: ${visRes.status}`)
      const { websiteBlueprint } = await visRes.json()

      useBlueprintStore.setState({ websiteBlueprint })

      // ── Step 5: Generate custom Components & Code ────────────────────────
      setPhase(PHASES.CODE_GENERATION, 'Generating Next.js components & assembling site...', 65)

      const codeRes = await fetch('/api/generate-code', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ prompt: input, blueprint: websiteBlueprint }),
      })
      if (!codeRes.ok) throw new Error(`Code generation failed: ${codeRes.status}`)
      const { code } = await codeRes.json()

      const unifiedBlueprint = {
        ...websiteBlueprint,
        tech: {
          framework: 'Next.js 14', renderer: 'React Three Fiber', helpers: ['Drei'],
          animation: ['Framer Motion', 'GSAP'], styling: 'Tailwind CSS v3', state: 'Zustand', build: 'Next'
        },
        generatedCode: {
          heroJSX:       code.heroJSX,
          sceneJSX:      code.sceneJSX,
          sampleSection: code.sampleSection,
          appJSX:        code.appJSX,
          fileTree:      code.fileTree,
          installCmd:    code.installCmd,
        },
      }

      useBlueprintStore.setState({
        blueprint:        unifiedBlueprint,
        phase:            PHASES.READY,
        phaseProgress:    100,
        phaseLabel:       'Your site is built and live!',
        activeTab:        OUTPUT_TABS.PREVIEW,
      })

      // Cloud Save
      const user = useAuthStore.getState().user
      if (user) {
        supabase.from('blueprints').insert({
          user_id:             user.id,
          name:                websiteBlueprint.creative_concept?.website_name ?? '3D Site',
          prompt:              input,
          design_style:        websiteBlueprint.creative_concept?.design_style ?? '3D Interactive',
          color_primary:       websiteBlueprint.design_system?.color_palette?.primary ?? null,
          color_secondary:     websiteBlueprint.design_system?.color_palette?.secondary ?? null,
          color_accent:        websiteBlueprint.design_system?.color_palette?.accent ?? null,
          blueprint_json:      unifiedBlueprint,
          veo_data_json:       storyboard,
          generated_code_json: unifiedBlueprint.generatedCode,
        }).then(({ error }) => {
          if (error) console.warn('[Supabase] Sync failed:', error.message)
        })
      }

      useCreditStore.getState().optimisticDecrement()

    } catch (err) {
      setError(err?.message ?? 'Build pipeline failed')
    } finally {
      useCreditStore.getState().fetchCredits()
    }
  }, [setPhase, setError])

  return { run, approveAndBuild }
}

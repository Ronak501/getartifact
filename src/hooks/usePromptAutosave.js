/**
 * usePromptAutosave
 *
 * Debounces the current prompt and persists it to `profiles.draft_prompt`
 * in Supabase so users can resume after a refresh or dropped connection.
 *
 * Behaviour:
 *  - Restores a saved draft on mount (only when prompt is empty + phase is IDLE)
 *  - Saves after 1 200 ms of inactivity — skips while the pipeline is running
 *  - Clears the draft once generation completes successfully (READY phase)
 *  - Silently no-ops when there is no authenticated user
 *
 * Returns: saveStatus — 'idle' | 'saving' | 'saved' | 'error'
 */

import { useEffect, useRef, useState } from 'react'
import useBlueprintStore, { PHASES } from '@store/blueprintStore'
import useAuthStore from '@store/authStore'
import { supabase } from '@lib/supabase'

const DEBOUNCE_MS   = 1200
const SAVED_TTL_MS  = 2500   // how long "draft saved" lingers before resetting

const ACTIVE_PHASES = new Set([
  PHASES.ANALYZING,
  PHASES.GENERATING,
  PHASES.WEBSITE,
  PHASES.VEO,
  PHASES.BUILDING,
])

export function usePromptAutosave() {
  const prompt    = useBlueprintStore(s => s.prompt)
  const setPrompt = useBlueprintStore(s => s.setPrompt)
  const phase     = useBlueprintStore(s => s.phase)
  const user      = useAuthStore(s => s.user)

  const [saveStatus, setSaveStatus] = useState('idle')
  const timerRef      = useRef(null)
  const savedTtlRef   = useRef(null)
  const restoredRef   = useRef(false)   // guard: only restore once per session

  // ── Restore draft on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user || restoredRef.current) return
    restoredRef.current = true

    const { prompt: currentPrompt, phase: currentPhase } = useBlueprintStore.getState()
    if (currentPhase !== PHASES.IDLE || currentPrompt.trim()) return

    supabase
      .from('profiles')
      .select('draft_prompt')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.draft_prompt) {
          setPrompt(data.draft_prompt)
        }
      })
  }, [user, setPrompt])

  // ── Debounced save on prompt change ───────────────────────────────────────
  useEffect(() => {
    if (!user) return
    if (ACTIVE_PHASES.has(phase)) return   // never save while the pipeline runs
    if (!prompt.trim()) return             // nothing to persist

    clearTimeout(timerRef.current)
    clearTimeout(savedTtlRef.current)

    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')

      const { error } = await supabase
        .from('profiles')
        .update({ draft_prompt: prompt })
        .eq('id', user.id)

      if (error) {
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        savedTtlRef.current = setTimeout(() => setSaveStatus('idle'), SAVED_TTL_MS)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timerRef.current)
  }, [prompt, user, phase])

  // ── Clear draft after successful generation ────────────────────────────────
  useEffect(() => {
    if (phase !== PHASES.READY || !user) return

    supabase
      .from('profiles')
      .update({ draft_prompt: null })
      .eq('id', user.id)

    setSaveStatus('idle')
  }, [phase, user])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      clearTimeout(savedTtlRef.current)
    }
  }, [])

  return saveStatus
}

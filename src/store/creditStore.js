/**
 * creditStore — Zustand store for user credit state.
 *
 * Fetches from /api/check-credits using the current Supabase session JWT.
 * Automatically refreshed after each build completes.
 */

import { create } from 'zustand'
import { supabase } from '@lib/supabase'

const API = ''

const useCreditStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  plan:         'free',
  builds_used:  0,
  builds_limit: 3,
  video_used:   0,
  video_limit:  0,
  can_build:    true,
  loading:      false,
  loaded:       false,

  // ── Derived ────────────────────────────────────────────────────────────────
  buildsRemaining: () => {
    const { builds_limit, builds_used } = get()
    if (builds_limit === -1) return Infinity
    return Math.max(0, builds_limit - builds_used)
  },

  usagePercent: () => {
    const { builds_limit, builds_used } = get()
    if (builds_limit === -1 || builds_limit === 0) return 0
    return Math.min(100, Math.round((builds_used / builds_limit) * 100))
  },

  // ── Actions ────────────────────────────────────────────────────────────────
  fetchCredits: async () => {
    set({ loading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = session?.access_token
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
        : { 'Content-Type': 'application/json' }

      const res  = await fetch(`${API}/api/check-credits`, { method: 'POST', headers })
      const data = await res.json()

      if (data.authenticated) {
        set({
          plan:         data.plan         ?? 'free',
          builds_used:  data.builds_used  ?? 0,
          builds_limit: data.builds_limit ?? 3,
          video_used:   data.video_used   ?? 0,
          video_limit:  data.video_limit  ?? 0,
          can_build:    data.can_build    ?? true,
          loaded:       true,
        })
      } else {
        set({ loaded: true, can_build: true })
      }
    } catch {
      set({ loaded: true, can_build: true })
    } finally {
      set({ loading: false })
    }
  },

  // Optimistically decrement after a build (server also decrements)
  optimisticDecrement: () => {
    const { builds_used, builds_limit } = get()
    const next = builds_used + 1
    set({
      builds_used:  next,
      can_build:    builds_limit === -1 || next < builds_limit,
    })
  },

  reset: () => set({
    plan: 'free', builds_used: 0, builds_limit: 3,
    video_used: 0, video_limit: 0, can_build: true, loaded: false,
  }),
}))

export default useCreditStore

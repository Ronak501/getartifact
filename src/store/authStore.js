/**
 * authStore — Zustand store for Supabase auth state.
 *
 * Call authStore.getState().init() once on app mount to subscribe to
 * Supabase auth changes and populate user / profile.
 */

import { create } from 'zustand'
import { supabase } from '@lib/supabase'

// Deferred getter avoids import-time circular reference
// (creditStore imports supabase → authStore imports supabase — no actual cycle)
let _creditStore = null
const getCreditStore = async () => {
  if (!_creditStore) _creditStore = (await import('@store/creditStore')).default
  return _creditStore.getState()
}

const useAuthStore = create((set, get) => ({
  user:    null,   // supabase User object
  profile: null,   // row from public.profiles
  loading: true,   // true until first session check resolves
  error:   null,

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  // ── Plan update ───────────────────────────────────────────────────────────
  updatePlan: async (plan) => {
    const { user } = get()
    if (!user) return
    await supabase.from('profiles').update({ plan }).eq('id', user.id)
    set(s => ({ profile: s.profile ? { ...s.profile, plan } : s.profile }))
    getCreditStore().then(cs => cs.fetchCredits())
  },

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  init: async () => {
    // Get existing session
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    set({ user, loading: false })
    if (user) {
      get()._loadProfile(user.id)
      getCreditStore().then(cs => cs.fetchCredits())
    }

    // Subscribe to future changes (login, logout, token refresh)
    supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      set({ user: u })
      if (u) {
        get()._loadProfile(u.id)
        getCreditStore().then(cs => cs.fetchCredits())
      } else {
        set({ profile: null })
        getCreditStore().then(cs => cs.reset())
      }
    })
  },

  // ── Internal: load profile row ─────────────────────────────────────────────
  _loadProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) set({ profile: data })
  },

  // ── Sign up ────────────────────────────────────────────────────────────────
  signUp: async (email, password, displayName) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) { set({ error: error.message }); throw error }
    return data
  },

  // ── Sign in ────────────────────────────────────────────────────────────────
  signIn: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { set({ error: error.message }); throw error }
    set({ user: data.user })
    return data
  },

  // ── Google OAuth ───────────────────────────────────────────────────────────
  signInWithGoogle: async () => {
    set({ error: null })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) { set({ error: error.message }); throw error }
  },

  // ── Sign out ───────────────────────────────────────────────────────────────
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, error: null })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore

/**
 * Zustand store — single source of truth for the builder pipeline state.
 *
 * Pipeline:
 *   idle → analyzing → generating → website → veo → building → ready
 */

import { create } from 'zustand'

export const PHASES = {
  IDLE:       'idle',
  ANALYZING:  'analyzing',
  GENERATING: 'generating',   // Claude → architecture blueprint
  WEBSITE:    'website',      // Claude → render-ready website JSON
  VEO:        'veo',          // Gemini → cinematic Veo prompt
  BUILDING:   'building',     // local  → React + Three.js code
  READY:      'ready',
  ERROR:      'error',
}

export const OUTPUT_TABS = {
  PREVIEW:   'preview',   // ← Code + Live Preview split pane (NEW default)
  BLUEPRINT: 'blueprint', // ← Architecture JSON
  VIDEO:     'video',     // ← Veo prompt + video player
  SCRIPT:    'script',    // ← Storyboard
  CODE:      'code',      // ← React code output
}

const useBlueprintStore = create((set, get) => ({
  // ── Input ─────────────────────────────────────────────────────────────────
  prompt:    '',
  setPrompt: prompt => set({ prompt }),

  // ── Pipeline state ────────────────────────────────────────────────────────
  phase:         PHASES.IDLE,
  phaseLabel:    '',
  phaseProgress: 0,
  error:         null,

  setPhase: (phase, label = '', progress = 0) =>
    set({ phase, phaseLabel: label, phaseProgress: progress, error: null }),

  setError: error => set({ phase: PHASES.ERROR, error }),

  // ── Generated output ──────────────────────────────────────────────────────
  blueprint:        null,   // architecture blueprint (old schema)
  websiteBlueprint: null,   // render-ready website JSON (new schema)
  intent:           null,
  veoData:          null,

  // Atomic finish — sets all final state in one call to avoid race conditions
  finishGeneration: (blueprint, intent, websiteBlueprint, veoData) => {
    const merged = { ...blueprint, websiteBlueprint, veoData }
    const prev = get().history
    set({
      blueprint:        merged,
      websiteBlueprint,
      veoData,
      intent,
      phase:            PHASES.READY,
      phaseProgress:    100,
      phaseLabel:       'All done!',
      activeTab:        OUTPUT_TABS.PREVIEW,
      error:            null,
      history: [
        { id: Date.now(), blueprint: merged, intent, prompt: get().prompt },
        ...prev,
      ].slice(0, 5),
    })
  },

  setBlueprint: (blueprint, intent) => {
    set({ blueprint, intent, phase: PHASES.READY })
    const prev = get().history
    set({
      history: [
        { id: Date.now(), blueprint, intent, prompt: get().prompt },
        ...prev,
      ].slice(0, 5),
    })
  },

  setWebsiteBlueprint: (websiteBlueprint) => {
    set({ websiteBlueprint })
    const bp = get().blueprint
    if (bp) set({ blueprint: { ...bp, websiteBlueprint } })
  },

  setVeoData: (veoData) => {
    set({ veoData })
    const bp = get().blueprint
    if (bp) set({ blueprint: { ...bp, veoData } })
  },

  clearBlueprint: () => set({
    blueprint: null, websiteBlueprint: null, intent: null,
    veoData: null, phase: PHASES.IDLE,
  }),

  // ── UI state ──────────────────────────────────────────────────────────────
  activeTab:    OUTPUT_TABS.PREVIEW,   // default to preview
  setActiveTab: tab => set({ activeTab: tab }),

  sidebarOpen:   true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  // ── History ───────────────────────────────────────────────────────────────
  history: [],
  loadFromHistory: entry => set({
    blueprint:        entry.blueprint,
    websiteBlueprint: entry.blueprint?.websiteBlueprint ?? null,
    veoData:          entry.blueprint?.veoData ?? null,
    intent:           entry.intent,
    prompt:           entry.prompt,
    phase:            PHASES.READY,
    activeTab:        OUTPUT_TABS.PREVIEW,
  }),
  clearHistory: () => set({ history: [] }),
}))

export default useBlueprintStore

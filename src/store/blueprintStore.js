/**
 * Zustand store — single source of truth for the builder pipeline state.
 *
 * Pipeline (new parallel flow):
 *   idle → blueprint → [asset_3d + code_generation in parallel] → assembling → ready
 */

import { create } from 'zustand'

export const PHASES = {
  IDLE:            'idle',
  BLUEPRINT:       'blueprint',       // Step 1: generating website blueprint
  ASSET_3D:        'asset_3d',        // Track A: Meshy 3D model generation
  CODE_GENERATION: 'code_generation', // Track B: R3F + React code generation
  ASSEMBLING:      'assembling',      // Step 3: merging tracks
  READY:           'ready',
  ERROR:           'error',
}

export const OUTPUT_TABS = {
  PREVIEW:   'preview',   // ← Code + Live Preview split pane
  CODE:      'code',      // ← React code output
  BLUEPRINT: 'blueprint', // ← Architecture JSON
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
  blueprint:        null,   // full unified blueprint (final output)
  websiteBlueprint: null,   // render-ready website JSON (new schema)
  intent:           null,

  // ── 3D Model Asset (Track A) ──────────────────────────────────────────────
  modelAsset: null,   // { modelUrl, previewUrl, fallback, status }
  setModelAsset: (asset) => set({ modelAsset: asset }),

  // ── Track status (for parallel UI feedback) ───────────────────────────────
  trackStatus: {
    blueprint:  'idle',  // idle | running | done | error
    asset3d:    'idle',  // idle | running | done | error | fallback
    code:       'idle',  // idle | running | done | error
  },
  setTrackStatus: (track, status) => set(s => ({
    trackStatus: { ...s.trackStatus, [track]: status },
  })),

  // Atomic finish — sets all final state in one call to avoid race conditions
  finishGeneration: (blueprint, intent) => {
    const prev = get().history
    set({
      blueprint,
      websiteBlueprint: blueprint.websiteBlueprint ?? null,
      intent,
      phase:            PHASES.READY,
      phaseProgress:    100,
      phaseLabel:       'Your site is ready!',
      activeTab:        OUTPUT_TABS.PREVIEW,
      error:            null,
      history: [
        { id: Date.now(), blueprint, intent, prompt: get().prompt },
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

  clearBlueprint: () => set({
    blueprint:        null,
    websiteBlueprint: null,
    intent:           null,
    modelAsset:       null,
    phase:            PHASES.IDLE,
    phaseLabel:       '',
    phaseProgress:    0,
    error:            null,
    trackStatus:      { blueprint: 'idle', asset3d: 'idle', code: 'idle' },
  }),

  // ── UI state ──────────────────────────────────────────────────────────────
  activeTab:    OUTPUT_TABS.PREVIEW,
  setActiveTab: tab => set({ activeTab: tab }),

  sidebarOpen:   true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  // ── History ───────────────────────────────────────────────────────────────
  history: [],
  loadFromHistory: entry => set({
    blueprint:        entry.blueprint,
    websiteBlueprint: entry.blueprint?.websiteBlueprint ?? null,
    modelAsset:       entry.blueprint?.modelAsset ?? null,
    intent:           entry.intent,
    prompt:           entry.prompt,
    phase:            PHASES.READY,
    activeTab:        OUTPUT_TABS.PREVIEW,
  }),
  clearHistory: () => set({ history: [] }),
}))

export default useBlueprintStore

/**
 * Zustand store — single source of truth for the builder pipeline state.
 *
 * Pipeline:
 *   idle → analyzing → generating → website → veo → building → ready
 */

import { create } from 'zustand'

export const PHASES = {
  IDLE:            'idle',
  STORYBOARD:      'storyboard',      // AI generates storyboard
  VIDEO_RENDERING: 'video_rendering', // Veo rendering
  USER_REVIEW:     'user_review',     // Gated review state
  VISION_ANALYSIS: 'vision_analysis',  // Vision AI analysis
  CODE_GENERATION: 'code_generation',  // Generating React/Next.js/R3F components
  READY:           'ready',
  ERROR:           'error',
}

export const OUTPUT_TABS = {
  PREVIEW:   'preview',   // ← Code + Live Preview split pane
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
  storyboard:       null,   // Storyboard document
  approved:         false,  // User review approval state

  // ── Video-first output ────────────────────────────────────────────────────
  videoUrl:      null,    // URL of the rendered Veo 2 video (null while rendering)
  videoProgress: 0,       // 0–1 progress of background video render
  videoSite:     null,    // { heroJSX, sectionsJSX, navbarJSX, ... } from video-site pipeline

  setVideoUrl: (url) => {
    set({ videoUrl: url })
    // Inject the URL into the hero component if videoSite is already built
    const vs = useBlueprintStore.getState().videoSite
    if (vs?.heroJSX) {
      set({ videoSite: { ...vs, heroJSX: vs.heroJSX.replace(/const VIDEO_URL = '[^']*'/, `const VIDEO_URL = '${url}'`) } })
    }
  },

  setVideoProgress: (p) => set({ videoProgress: p }),

  setVideoSite: (site) => set({ videoSite: site }),

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
    veoData: null, videoUrl: null, videoProgress: 0, videoSite: null,
    storyboard: null, approved: false,
    phase: PHASES.IDLE,
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
    videoSite:        entry.blueprint?.videoSite ?? null,
    videoUrl:         entry.blueprint?.videoUrl ?? null,
    storyboard:       entry.blueprint?.storyboard ?? null,
    approved:         entry.blueprint?.approved ?? false,
    intent:           entry.intent,
    prompt:           entry.prompt,
    phase:            PHASES.READY,
    activeTab:        OUTPUT_TABS.PREVIEW,
  }),
  clearHistory: () => set({ history: [] }),
}))

export default useBlueprintStore

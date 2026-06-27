"use client"

import { useState } from 'react'
import { Link } from '@lib/router-shim'
import { motion, AnimatePresence } from 'framer-motion'
import useBlueprintStore, { OUTPUT_TABS, PHASES } from '@store/blueprintStore'
import useAuthStore from '@store/authStore'
import PromptInput     from '@components/builder/PromptInput'
import CodeAndPreview  from '@components/builder/CodeAndPreview'
import BlueprintViewer from '@components/builder/BlueprintViewer'
import VideoScript     from '@components/builder/VideoScript'
import VeoPanel        from '@components/builder/VeoPanel'
import CodeOutput      from '@components/builder/CodeOutput'
import VideoReviewGate from '@components/builder/VideoReviewGate'
import GlassCard       from '@components/ui/GlassCard'
import Badge           from '@components/ui/Badge'

const OUTPUT_TAB_LIST = [
  { id: OUTPUT_TABS.PREVIEW, label: 'Live Preview', icon: '🖥️', desc: 'Interactive preview' },
  { id: OUTPUT_TABS.CODE,    label: 'Source Code',  icon: '⚡',  desc: 'React + Tailwind' },
]

export default function Builder() {
  const { blueprint, phase, activeTab, setActiveTab, history, loadFromHistory } = useBlueprintStore()
  const { user } = useAuthStore()
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    /*
     * Layout:
     *  h-screen flex-col → full viewport, no scroll bleed
     *  ├─ h-16  spacer   → clears the fixed Navbar
     *  ├─ sub-header     → sticky within flex, no overlap
     *  └─ flex-1 overflow-y-auto → scrollable content area
     */
    <div className="h-screen flex flex-col bg-[#0a0a14] overflow-hidden">

      {/* Spacer for fixed Navbar */}
      <div className="h-16 flex-shrink-0" />

      {/* Sub-header ─ fixed within flex, never overlaps content */}
      <div className="flex-shrink-0 border-b border-white/[0.05] bg-[#0a0a14]/90 backdrop-blur-sm z-30">
        <div className="max-w-[1700px] mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">

          {/* Title */}
          <div className="flex-shrink-0">
            <h1 className="font-display text-base font-bold text-white leading-none">Getartifactact AI Website Builder</h1>
            <p className="text-2xs text-white/20 mt-0.5">
              Describe your idea — get a complete, deployable website
            </p>
          </div>

          {/* Blueprint badges */}
          {blueprint && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden flex-1 min-w-0">
              <Badge color="green" dot>{blueprint.concept?.websiteName}</Badge>
              <Badge color="purple">{blueprint.concept?.designStyle}</Badge>
              {blueprint.websiteBlueprint && <Badge color="neon">Preview Ready</Badge>}
              {blueprint.veoData          && <Badge color="blue">Veo Ready</Badge>}
            </div>
          )}

          {/* Right actions */}
          <div className="flex-shrink-0 flex items-center gap-3">
            {/* Cloud save indicator */}
            {user && blueprint && (
              <span className="text-2xs text-green-400/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Saved to cloud
              </span>
            )}
            {!user && (
              <Link to="/login"
                className="text-xs text-white/30 hover:text-white/60 transition-colors border border-white/[0.10] rounded-lg px-3 py-1.5">
                Sign in to save
              </Link>
            )}
            {history.length > 0 && (
              <button
                onClick={() => setHistoryOpen(o => !o)}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                History ({history.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main scrollable area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-[1700px] mx-auto px-6 py-5">
          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5 items-start">

            {/* ── Left Panel ──────────────────────────────────────────────── */}
            <aside className="flex flex-col gap-4 xl:sticky xl:top-5">
              <GlassCard padding="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-brand-500/20 flex items-center justify-center text-sm">✍️</div>
                  <p className="text-sm font-semibold text-white">Describe Your Website</p>
                </div>
                <PromptInput />
              </GlassCard>

              {/* Generation tips */}
              <GlassCard padding="p-4">
                <p className="text-2xs text-white/25 uppercase tracking-widest mb-3 font-medium">Tips for Best Results</p>
                <div className="flex flex-col gap-2.5">
                  {[
                    { icon: '🎯', tip: 'Be specific about your industry and audience' },
                    { icon: '🎨', tip: 'Mention colors, mood, or visual style you want' },
                    { icon: '📄', tip: 'List key pages or sections to include' },
                    { icon: '✨', tip: 'Add unique features that make your site stand out' },
                  ].map(item => (
                    <div key={item.tip} className="flex items-start gap-2.5">
                      <span className="text-sm flex-shrink-0">{item.icon}</span>
                      <p className="text-xs text-white/45 leading-snug">{item.tip}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* History */}
              <AnimatePresence>
                {historyOpen && history.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <GlassCard padding="p-4">
                      <p className="text-2xs text-white/25 uppercase tracking-widest mb-3">Recent</p>
                      <div className="flex flex-col gap-2">
                        {history.map(entry => (
                          <button key={entry.id}
                            onClick={() => { loadFromHistory(entry); setHistoryOpen(false) }}
                            className="text-left px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07]
                              border border-white/[0.06] transition-all">
                            <p className="text-xs font-medium text-white/70">{entry.blueprint?.concept?.websiteName}</p>
                            <p className="text-2xs text-white/25 truncate mt-0.5">{entry.prompt}</p>
                          </button>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </aside>

            {/* ── Right Panel ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 min-w-0">
              {blueprint ? (
                <>
                  {/* Tab bar */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto scrollbar-hidden flex-shrink-0">
                    {OUTPUT_TAB_LIST.map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium
                          whitespace-nowrap transition-all duration-200 flex-shrink-0
                          ${activeTab === tab.id ? 'bg-white/[0.10] text-white' : 'text-white/35 hover:text-white/65'}
                        `}>
                        <span className="text-base">{tab.icon}</span>
                        <span>{tab.label}</span>
                        <span className={`text-2xs hidden lg:inline ${activeTab === tab.id ? 'text-white/35' : 'text-white/15'}`}>
                          {tab.desc}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Output panel — fixed height so inner h-full works */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden"
                    style={{ height: 'calc(100vh - 16rem)' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="h-full p-4 overflow-hidden"
                      >
                        {activeTab === OUTPUT_TABS.PREVIEW   && <CodeAndPreview />}
                        {activeTab === OUTPUT_TABS.BLUEPRINT && <BlueprintViewer />}
                        {activeTab === OUTPUT_TABS.VIDEO     && <VeoPanel />}
                        {activeTab === OUTPUT_TABS.SCRIPT    && <VideoScript />}
                        {activeTab === OUTPUT_TABS.CODE      && <CodeOutput />}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </>
              ) : (useBlueprintStore.getState().storyboard || [PHASES.STORYBOARD, PHASES.VIDEO_RENDERING, PHASES.USER_REVIEW].includes(phase)) ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden p-4 animate-fade-in"
                  style={{ height: 'calc(100vh - 16rem)' }}>
                  <VideoReviewGate />
                </div>
              ) : (
                <EmptyOutput phase={phase} />
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Empty / loading state ───────────────────────────────────────────────── */
function EmptyOutput({ phase }) {
  const isGen = [PHASES.STORYBOARD, PHASES.VIDEO_RENDERING, PHASES.VISION_ANALYSIS, PHASES.CODE_GENERATION].includes(phase)

  const cfg = {
    [PHASES.STORYBOARD]:      { icon: '🧠', label: 'Generating creative storyboard & visual specification...' },
    [PHASES.VIDEO_RENDERING]: { icon: '🎬', label: 'Rendering cinematic 3D preview video via Google Veo 2...' },
    [PHASES.VISION_ANALYSIS]: { icon: '👁️', label: 'Vision AI pipeline extracting blueprint elements...' },
    [PHASES.CODE_GENERATION]: { icon: '⚡', label: 'Assembling custom Next.js & React Three Fiber components...' },
    [PHASES.ERROR]:           { icon: '❌', label: 'Something went wrong' },
  }[phase] ?? { icon: '🚀', label: 'Enter a prompt to begin' }

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 14rem)' }}>
      <GlassCard padding="p-12" className="text-center max-w-xl w-full">
        <motion.div
          animate={isGen ? { scale: [1, 1.08, 1] } : {}}
          transition={isGen ? { duration: 1.6, repeat: Infinity } : {}}
          className="text-5xl mb-5 inline-block"
        >
          {cfg.icon}
        </motion.div>
        <h3 className="font-display text-2xl font-bold text-white mb-3">
          {isGen ? 'Generating...' : phase === PHASES.ERROR ? 'Error' : 'Ready to Build'}
        </h3>
        <p className="text-white/35 text-sm leading-relaxed">{cfg.label}</p>

        {!isGen && phase === PHASES.IDLE && (
          <p className="text-xs text-white/20 mt-6">
            Describe any website — your idea becomes a fully designed, deployable site.
          </p>
        )}
      </GlassCard>
    </div>
  )
}

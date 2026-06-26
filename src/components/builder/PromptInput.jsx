import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useBlueprintStore, { PHASES } from '@store/blueprintStore'
import { useAIBuilder } from '@hooks/useAIBuilder'
import { sampleBlueprints } from '@templates/sampleBlueprints'
import Button from '@components/ui/Button'
import PhaseIndicator from '@components/ui/PhaseIndicator'

const PLACEHOLDER = 'Describe your website... e.g. "Build a futuristic AI SaaS platform called NeuroTech that automates enterprise neural workflows"'

export default function PromptInput() {
  const { prompt, setPrompt, phase, phaseLabel, phaseProgress } = useBlueprintStore()
  const { run } = useAIBuilder()
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef(null)

  const isRunning = [PHASES.ANALYZING, PHASES.GENERATING, PHASES.BUILDING].includes(phase)

  const handleSubmit = e => {
    e.preventDefault()
    if (!prompt.trim() || isRunning) return
    run()
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e)
  }

  const useSample = sample => {
    setPrompt(sample.prompt)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sample prompts */}
      <div>
        <p className="text-xs text-white/30 uppercase tracking-widest mb-2.5 font-medium">
          Quick examples
        </p>
        <div className="flex flex-wrap gap-2">
          {sampleBlueprints.map(s => (
            <button
              key={s.id}
              onClick={() => useSample(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] hover:border-white/[0.18]
                text-white/50 hover:text-white transition-all duration-200"
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <form onSubmit={handleSubmit}>
        <div className={`
          relative rounded-2xl border transition-all duration-200
          ${focused
            ? 'border-brand-500/60 shadow-[0_0_0_3px_rgba(61,94,255,0.12)]'
            : 'border-white/[0.10] hover:border-white/[0.18]'}
          bg-white/[0.04]
        `}>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER}
            rows={4}
            disabled={isRunning}
            className="w-full bg-transparent px-5 pt-4 pb-16 text-sm text-white/90
              placeholder:text-white/25 resize-none outline-none font-sans
              disabled:opacity-50"
          />

          {/* Bottom bar */}
          <div className="absolute bottom-3 inset-x-3 flex items-center justify-between">
            <span className="text-2xs text-white/20 font-mono select-none">
              {prompt.length} chars · ⌘+Enter to generate
            </span>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isRunning}
              disabled={!prompt.trim()}
            >
              {isRunning ? 'Generating...' : 'Generate'}
              {!isRunning && <ArrowIcon />}
            </Button>
          </div>
        </div>
      </form>

      {/* Phase indicator */}
      <AnimatePresence>
        {phase !== PHASES.IDLE && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <PhaseIndicator
              phase={phase}
              phaseLabel={phaseLabel}
              phaseProgress={phaseProgress}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

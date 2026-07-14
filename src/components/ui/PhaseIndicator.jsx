import { motion, AnimatePresence } from 'framer-motion'
import { PHASES } from '@store/blueprintStore'
import LoadingSpinner from './LoadingSpinner'
const PHASE_STEPS = [
  { id: PHASES.STORYBOARD,      label: 'Planning',   num: 1 },
  { id: PHASES.VIDEO_RENDERING, label: 'Scripting',  num: 2 },
  { id: PHASES.USER_REVIEW,     label: 'Reviewing',  num: 3 },
  { id: PHASES.VISION_ANALYSIS, label: 'Designing',  num: 4 },
  { id: PHASES.CODE_GENERATION, label: 'Building',   num: 5 },
  { id: PHASES.READY,           label: 'Done',       num: 6 },
]
export default function PhaseIndicator({ phase, phaseLabel, phaseProgress }) {
  const activeIdx = PHASE_STEPS.findIndex(s => s.id === phase)

  if (phase === PHASES.IDLE) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full"
      >
        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #3d5eff, #00d4ff, #bf5fff)' }}
            initial={{ width: 0 }}
            animate={{ width: `${phaseProgress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Steps */}
        <div className="flex items-center gap-1">
          {PHASE_STEPS.map((step, i) => {
            const done    = i < activeIdx
            const active  = i === activeIdx
            const pending = i > activeIdx

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all duration-300
                    ${done    ? 'bg-brand-500 text-white' : ''}
                    ${active  ? 'bg-brand-500/20 border border-brand-500 text-brand-400' : ''}
                    ${pending ? 'bg-white/5 border border-white/10 text-white/30' : ''}
                  `}>
                    {active && phase !== PHASES.READY
                      ? <LoadingSpinner size={14} color="#3d5eff" />
                      : done
                        ? <CheckIcon />
                        : step.num
                    }
                  </div>
                  <span className={`text-2xs font-medium transition-colors hidden sm:block ${
                    active  ? 'text-white' :
                    done    ? 'text-white/50' :
                    'text-white/20'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {i < PHASE_STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1 transition-colors ${done ? 'bg-brand-500/40' : 'bg-white/10'}`} />
                )}
              </div>
            )
          })}
        </div>

        {phaseLabel && phase !== PHASES.READY && (
          <p className="text-xs text-white/35 mt-3 text-center">{phaseLabel}</p>
        )}

        {phase === PHASES.READY && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-green-400/70 mt-3 text-center"
          >
            Your website is ready — preview, export, and deploy.
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

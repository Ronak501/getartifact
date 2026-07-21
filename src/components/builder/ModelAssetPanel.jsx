/**
 * ModelAssetPanel — displays the Track A (Meshy 3D) generation status
 * and a preview image of the generated model when available.
 *
 * Shows in the left sidebar of Builder.jsx during/after generation.
 */
import { motion, AnimatePresence } from 'framer-motion'
import useBlueprintStore, { PHASES } from '@store/blueprintStore'

export default function ModelAssetPanel() {
  const { phase, modelAsset, trackStatus } = useBlueprintStore()

  const isGenerating = [PHASES.ASSET_3D, PHASES.CODE_GENERATION, PHASES.ASSEMBLING].includes(phase)
  const track3dStatus = trackStatus?.asset3d ?? 'idle'

  // Nothing to show in idle state
  if (phase === PHASES.IDLE || phase === PHASES.BLUEPRINT) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.35 }}
        className="overflow-hidden"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-sm">
              🧊
            </div>
            <p className="text-sm font-semibold text-white">3D Model Asset</p>
            <TrackBadge status={track3dStatus} />
          </div>

          {/* Content */}
          {track3dStatus === 'running' || (isGenerating && track3dStatus === 'idle') ? (
            <GeneratingState />
          ) : track3dStatus === 'done' && modelAsset?.previewUrl ? (
            <SuccessState asset={modelAsset} />
          ) : track3dStatus === 'fallback' ? (
            <FallbackState message={modelAsset?.message} />
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function TrackBadge({ status }) {
  const MAP = {
    idle:     { label: 'Queued',      cls: 'bg-white/[0.05] text-white/30' },
    running:  { label: 'Generating',  cls: 'bg-violet-500/15 text-violet-300 animate-pulse' },
    done:     { label: '✓ Done',      cls: 'bg-emerald-500/15 text-emerald-300' },
    fallback: { label: 'Procedural',  cls: 'bg-amber-500/15 text-amber-300' },
    error:    { label: 'Error',       cls: 'bg-red-500/15 text-red-300' },
  }
  const cfg = MAP[status] ?? MAP.idle
  return (
    <span className={`ml-auto text-2xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* Animated 3D cube spinner */}
      <div className="relative w-14 h-14" style={{ perspective: 200 }}>
        <motion.div
          className="w-full h-full rounded-xl border border-violet-500/40 bg-violet-500/10"
          animate={{
            rotateX: [0, 360],
            rotateY: [0, 360],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ transformStyle: 'preserve-3d' }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🧊</div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-white/70">Meshy AI sculpting...</p>
        <p className="text-2xs text-white/25 mt-0.5">This may take up to 60s</p>
      </div>
      {/* Animated progress bar */}
      <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '50%' }}
        />
      </div>
    </div>
  )
}

function SuccessState({ asset }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-2"
    >
      {/* Preview image */}
      <div className="relative rounded-xl overflow-hidden border border-white/[0.08] aspect-square bg-black/30">
        <img
          src={asset.previewUrl}
          alt="Generated 3D model preview"
          className="w-full h-full object-contain"
          onError={e => { e.target.style.display = 'none' }}
        />
        <div className="absolute bottom-2 right-2">
          <span className="text-2xs px-2 py-0.5 rounded-full bg-black/60 text-emerald-300 font-medium backdrop-blur">
            .GLB ready
          </span>
        </div>
      </div>
      {/* GLB URL */}
      {asset.modelUrl && (
        <a
          href={asset.modelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-2xs text-white/25 hover:text-cyan-400 font-mono truncate transition-colors"
          title={asset.modelUrl}
        >
          {asset.modelUrl.split('/').pop()}
        </a>
      )}
    </motion.div>
  )
}

function FallbackState({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-start gap-2.5 py-1"
    >
      <span className="text-lg flex-shrink-0">⚡</span>
      <div>
        <p className="text-xs font-medium text-amber-300/80">Using procedural geometry</p>
        <p className="text-2xs text-white/25 mt-0.5 leading-relaxed">
          {message ?? 'No MESHY_API_KEY — R3F geometry generated by the AI instead.'}
        </p>
      </div>
    </motion.div>
  )
}

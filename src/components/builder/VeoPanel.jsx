/**
 * VeoPanel — Veo 2 video generation UI.
 *
 * Left column  : Veo prompt JSON breakdown (structured metadata)
 * Right column : Generate button → progress → video player
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useBlueprintStore from '@store/blueprintStore'
import { useVideoGenerator, VIDEO_GEN_STATUS } from '@hooks/useVideoGenerator'
import GlassCard from '@components/ui/GlassCard'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import { copyToClipboard } from '@utils/exportUtils'

export default function VeoPanel() {
  const { blueprint } = useBlueprintStore()
  const veoData = blueprint?.veoData
  const { status, message, progress, videoUrl, videoUri, elapsed, generate, cancel, reset, isRunning } = useVideoGenerator()
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')

  if (!blueprint) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-white/30 text-sm">Generate a blueprint first to unlock Veo video generation</p>
    </div>
  )

  if (!veoData) return (
    <div className="h-full flex items-center justify-center text-center">
      <div>
        <div className="text-4xl mb-4">🎬</div>
        <p className="text-white/50 text-sm mb-2">Veo prompt not yet generated</p>
        <p className="text-white/25 text-xs">Re-generate the blueprint to include Veo data</p>
      </div>
    </div>
  )

  const handleCopy = async () => {
    await copyToClipboard(veoData.veo_prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerate = () => generate(veoData.veo_prompt)

  const SECTIONS = [
    { key: 'overview', label: 'Overview' },
    { key: 'prompt', label: 'Veo Prompt' },
    { key: 'video', label: 'Video' },
  ]

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.07] w-fit">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`
              px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${activeSection === s.key
                ? 'bg-white/[0.10] text-white'
                : 'text-white/40 hover:text-white/70'}
            `}
          >
            {s.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          {activeSection === 'overview' && <OverviewSection data={veoData} />}
          {activeSection === 'prompt' && (
            <PromptSection
              data={veoData}
              copied={copied}
              onCopy={handleCopy}
            />
          )}
          {activeSection === 'video' && (
            <VideoSection
              status={status}
              message={message}
              progress={progress}
              videoUrl={videoUrl}
              videoUri={videoUri}
              elapsed={elapsed}
              isRunning={isRunning}
              onGenerate={handleGenerate}
              onCancel={cancel}
              onReset={reset}
              veoPromptLength={veoData.veo_prompt?.length ?? 0}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Overview section ─────────────────────────────────────────────────────────

function OverviewSection({ data }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: metadata */}
      <GlassCard padding="p-5" className="flex flex-col gap-4">
        <p className="text-xs text-white/30 uppercase tracking-widest">Website Profile</p>
        {[
          ['Name', data.website_name],
          ['Type', data.business_type],
          ['Audience', data.target_audience],
          ['Personality', data.brand_personality],
          ['Typography', data.typography],
          ['UI Style', data.ui_style],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-2xs text-white/25 uppercase tracking-widest">{k}</p>
            <p className="text-sm text-white/80 mt-0.5">{v}</p>
          </div>
        ))}
      </GlassCard>

      {/* Right: visual elements */}
      <div className="flex flex-col gap-4">
        {/* Color palette */}
        <GlassCard padding="p-5">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Color Palette</p>
          <div className="flex gap-2 flex-wrap">
            {data.color_palette?.map(hex => (
              <div key={hex} className="flex flex-col items-center gap-1">
                <div
                  className="w-10 h-10 rounded-xl border border-white/10"
                  style={{ background: hex }}
                />
                <span className="text-2xs text-white/40 font-mono">{hex}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* 3D elements */}
        <GlassCard padding="p-4">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-2">3D Elements</p>
          <div className="flex flex-wrap gap-1.5">
            {data['3d_elements']?.map(el => (
              <Badge key={el} color="neon">{el}</Badge>
            ))}
          </div>
        </GlassCard>

        {/* Motion effects */}
        <GlassCard padding="p-4">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Motion Effects</p>
          <div className="flex flex-wrap gap-1.5">
            {data.motion_effects?.map(ef => (
              <Badge key={ef} color="purple">{ef}</Badge>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

// ─── Prompt section ───────────────────────────────────────────────────────────

function PromptSection({ data, copied, onCopy }) {
  return (
    <GlassCard padding="p-0" className="flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <span className="text-base">🎬</span>
          <p className="text-sm font-semibold text-white">Veo 2 Generation Prompt</p>
          <Badge color="green">{data.veo_prompt?.length ?? 0} chars</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          {copied ? '✓ Copied' : 'Copy Prompt'}
        </Button>
      </div>

      {/* Prompt text */}
      <div className="p-5 overflow-auto max-h-[500px]">
        <p className="text-sm text-white/70 leading-relaxed font-mono whitespace-pre-wrap">
          {data.veo_prompt}
        </p>
      </div>

      {/* Usage hint */}
      <div className="px-5 py-3 border-t border-white/[0.07] bg-white/[0.02]">
        <p className="text-xs text-white/25">
          Use this prompt in <strong className="text-white/40">Google Veo 2</strong> via Vertex AI or the Gemini API.
          Switch to the <strong className="text-white/40">Video</strong> tab to generate directly from this builder.
        </p>
      </div>
    </GlassCard>
  )
}

// ─── Video section ─────────────────────────────────────────────────────────────

function VideoSection({ status, message, progress, videoUrl, videoUri, elapsed, isRunning, onGenerate, onCancel, onReset, veoPromptLength }) {
  const isComplete = status === VIDEO_GEN_STATUS.COMPLETE
  const isError = status === VIDEO_GEN_STATUS.ERROR
  const isIdle = status === VIDEO_GEN_STATUS.IDLE

  return (
    <div className="flex flex-col gap-4">
      {/* Control card */}
      <GlassCard padding="p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Status icon */}
          <motion.div
            animate={isRunning ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{
              background: isComplete ? 'rgba(0,200,83,0.15)' :
                isError ? 'rgba(255,45,85,0.15)' :
                  isRunning ? 'rgba(61,94,255,0.15)' :
                    'rgba(255,255,255,0.05)',
              border: `1px solid ${isComplete ? 'rgba(0,200,83,0.3)' :
                  isError ? 'rgba(255,45,85,0.3)' :
                    isRunning ? 'rgba(61,94,255,0.4)' :
                      'rgba(255,255,255,0.1)'
                }`,
            }}
          >
            {isComplete ? '✅' : isError ? '❌' : isRunning ? '🎬' : '🎥'}
          </motion.div>

          <div>
            <p className="text-base font-semibold text-white">
              {isComplete ? 'Video Generated!' :
                isError ? 'Generation Failed' :
                  isRunning ? 'Generating Video...' :
                    'Generate Video with Veo 2'}
            </p>
            <p className="text-sm text-white/40 mt-1">
              {isComplete ? `Rendered in ${elapsed}s` :
                isError ? message :
                  isRunning ? `${message} · ${elapsed}s elapsed` :
                    'Uses Google Veo 2 on Vertex AI — takes 2-5 minutes'}
            </p>
          </div>

          {/* Progress bar */}
          {isRunning && (
            <div className="w-full">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #3d5eff, #00d4ff, #bf5fff)' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex justify-between text-2xs text-white/25 mt-1">
                <span>{Math.round(progress)}%</span>
                <span>Est. 2-5 min</span>
              </div>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3">
            {isIdle && (
              <Button variant="primary" size="lg" onClick={onGenerate} disabled={!veoPromptLength}>
                <VideoIcon /> Generate with Veo 2
              </Button>
            )}
            {isRunning && (
              <Button variant="danger" size="md" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {(isComplete || isError) && (
              <Button variant="secondary" size="md" onClick={onReset}>
                Generate Again
              </Button>
            )}
          </div>

          {/* API requirement note */}
          {isIdle && (
            <p className="text-2xs text-white/20 max-w-xs">
              Requires <code className="text-white/30">GOOGLE_PROJECT_ID</code> and Vertex AI credentials in <code className="text-white/30">.env</code>.
              Run <code className="text-white/30">gcloud auth application-default login</code> first.
            </p>
          )}
        </div>
      </GlassCard>

      {/* Video player */}
      <AnimatePresence>
        {isComplete && videoUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <GlassCard padding="p-0" className="overflow-hidden">
              {/* Player header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-sm font-medium text-white">Veo 2 Generated Video</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={videoUrl}
                    download="veo-preview.mp4"
                    className="text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    Download MP4
                  </a>
                  {videoUri && (
                    <span className="text-xs text-white/20 font-mono truncate max-w-[200px]">{videoUri}</span>
                  )}
                </div>
              </div>

              {/* Video element */}
              <div className="bg-black aspect-video">
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                  style={{ display: 'block' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Veo 2 info */}
      <GlassCard padding="p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">ℹ️</span>
          <div>
            <p className="text-xs font-medium text-white/70 mb-1">About Veo 2</p>
            <p className="text-xs text-white/35 leading-relaxed">
              Google Veo 2 generates photorealistic 4K cinematic videos from text prompts via Vertex AI.
              Videos take 2-5 minutes to render. Output is stored in your Google Cloud Storage bucket
              (project: <code className="text-white/50">Getartifact</code>).
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

function VideoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M11 6l4-2v8l-4-2V6z" fill="currentColor" />
    </svg>
  )
}

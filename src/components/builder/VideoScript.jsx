import { useState } from 'react'
import { motion } from 'framer-motion'
import useBlueprintStore from '@store/blueprintStore'
import GlassCard from '@components/ui/GlassCard'
import Button from '@components/ui/Button'
import { buildTimeline } from '@core/VideoScriptGenerator'
import { copyToClipboard } from '@utils/exportUtils'

export default function VideoScript() {
  const { blueprint } = useBlueprintStore()
  const [copied, setCopied] = useState(false)

  if (!blueprint) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-white/30 text-sm">Generate a blueprint to see the video script</p>
    </div>
  )

  const { videoScript, concept } = blueprint
  const timeline = buildTimeline(videoScript)

  const handleCopy = async () => {
    await copyToClipboard(videoScript.aiVideoPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Meta */}
      <GlassCard padding="p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            ['Duration', `${videoScript.duration}s`],
            ['Resolution', videoScript.resolution],
            ['FPS', videoScript.fps],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-2xs text-white/30 uppercase tracking-widest">{k}</p>
              <p className="text-sm font-semibold text-white mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Visual Timeline */}
      <GlassCard padding="p-4">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Timeline</p>
        <div className="flex rounded-lg overflow-hidden h-8">
          {timeline.map(seg => (
            <div
              key={seg.id}
              title={`Scene ${seg.id}: ${seg.name} (${seg.duration}s)`}
              className="relative h-full flex items-center justify-center overflow-hidden cursor-default"
              style={{
                width:      `${(seg.duration / videoScript.duration) * 100}%`,
                background: seg.color + '55',
                borderRight: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-2xs font-medium text-white/70 truncate px-1">{seg.id}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-2xs text-white/20 mt-1.5">
          <span>0s</span>
          <span>{videoScript.duration}s</span>
        </div>
      </GlassCard>

      {/* Scenes */}
      <div className="flex flex-col gap-3">
        <p className="text-xs text-white/40 uppercase tracking-widest">Scenes</p>
        {videoScript.scenes.map((scene, i) => (
          <motion.div
            key={scene.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard padding="p-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: timeline[i]?.color + '44', border: `1px solid ${timeline[i]?.color}55` }}
                >
                  {scene.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white">{scene.name}</p>
                    <span className="text-2xs text-white/30 font-mono">{scene.duration}s</span>
                  </div>
                  <p className="text-xs text-white/50 mb-2">{scene.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {scene.elements.map(el => (
                      <span key={el} className="text-2xs px-2 py-0.5 rounded-md bg-white/[0.05] text-white/50">
                        {el}
                      </span>
                    ))}
                  </div>
                  <p className="text-2xs text-white/25 mt-2">Camera: {scene.camera}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* AI Video Prompt */}
      <GlassCard padding="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/40 uppercase tracking-widest">AI Video Generation Prompt</p>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <p className="text-xs text-white/60 leading-relaxed font-mono whitespace-pre-wrap">
          {videoScript.aiVideoPrompt}
        </p>
      </GlassCard>
    </div>
  )
}

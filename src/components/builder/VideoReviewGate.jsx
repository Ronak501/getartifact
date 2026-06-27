"use client"

import { useState } from 'react'
import useBlueprintStore, { PHASES } from '@store/blueprintStore'
import { useAIBuilder } from '@hooks/useAIBuilder'
import GlassCard from '@components/ui/GlassCard'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'

export default function VideoReviewGate() {
  const { storyboard, videoUrl, phase, phaseLabel, phaseProgress, videoProgress, prompt } = useBlueprintStore()
  const { run, approveAndBuild } = useAIBuilder()
  const [activeTab, setActiveTab] = useState('video') // 'video' | 'storyboard'

  const handleApprove = () => {
    approveAndBuild()
  }

  const handleRegenerate = () => {
    run()
  }

  const isRendering = phase === PHASES.VIDEO_RENDERING

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Stage Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 flex-shrink-0">
        <div>
          <Badge color={isRendering ? 'blue' : 'green'} dot={isRendering}>
            {isRendering ? 'Rendering Preview' : 'Review Gated'}
          </Badge>
          <h2 className="text-base font-bold text-white mt-1">Cinematic 3D Video Preview</h2>
          <p className="text-2xs text-white/35">
            {isRendering ? 'Google Veo 2 is rendering your website mockup...' : 'Review your 3D video. Approve to analyze and generate code.'}
          </p>
        </div>

        {!isRendering && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleRegenerate}>
              🔄 Regenerate
            </Button>
            <Button variant="primary" size="sm" onClick={handleApprove} className="shadow-[0_0_15px_rgba(61,94,255,0.4)]">
              ✓ Approve & Build Code
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Left Column: Video player */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          {videoUrl ? (
            <GlassCard padding="p-0" className="overflow-hidden bg-black aspect-video relative">
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            </GlassCard>
          ) : (
            <GlassCard padding="p-8" className="flex-1 flex flex-col items-center justify-center text-center bg-black/40">
              <span className="text-5xl animate-pulse">🎬</span>
              <h3 className="text-md font-bold text-white mt-4">{phaseLabel || 'Rendering...'}</h3>
              <div className="w-64 mt-4">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-brand-500 transition-all duration-300"
                    style={{ width: `${Math.max(10, phaseProgress)}%` }}
                  />
                </div>
                <p className="text-3xs text-white/25 mt-1.5">
                  Est. remaining: 2 minutes
                </p>
              </div>
            </GlassCard>
          )}

          {/* Prompt breakdown */}
          <GlassCard padding="p-4" className="flex flex-col gap-2 flex-1 min-h-[140px] overflow-y-auto">
            <p className="text-3xs text-white/20 uppercase tracking-wider font-bold">Generated Veo 2 Visual Description</p>
            <p className="text-xs text-white/60 leading-relaxed font-mono">
              {storyboard?.veo_prompt || 'Creating visual prompt...'}
            </p>
          </GlassCard>
        </div>

        {/* Right Column: Storyboard scenes */}
        <div className="flex flex-col min-h-0 border-l border-white/[0.06] pl-4">
          <p className="text-3xs text-white/20 uppercase tracking-wider font-bold mb-3">Creative Storyboard</p>
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 scrollbar-hidden">
            {storyboard?.storyboard_scenes?.map((scene, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Badge color="purple">{scene.website_section}</Badge>
                  <span className="text-3xs text-white/20 font-mono">{scene.time_range}</span>
                </div>
                <div>
                  <p className="text-3xs text-white/25 uppercase font-medium">Visuals</p>
                  <p className="text-2xs text-white/60 mt-0.5 leading-normal">{scene.visuals}</p>
                </div>
                <div>
                  <p className="text-3xs text-white/25 uppercase font-medium">Camera track</p>
                  <p className="text-2xs text-brand-400 mt-0.5 leading-normal">{scene.camera_movement}</p>
                </div>
              </div>
            )) || (
              <div className="h-full flex items-center justify-center text-center text-white/20 text-xs">
                Analyzing scenes...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

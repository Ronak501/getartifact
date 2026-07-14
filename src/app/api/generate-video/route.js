import { googleAI } from '@lib/ai-clients'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const { veoPrompt } = await req.json()
    if (!veoPrompt?.trim()) {
      return new Response(JSON.stringify({ error: 'veoPrompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const encoder = new TextEncoder()
    let isClosed = false

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data) => {
          if (isClosed) return
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch (err) {
            console.error('[generate-video] Send error:', err.message)
          }
        }

        try {
          send({ status: 'starting', message: 'Initiating Veo 2 video generation on Vertex AI...' })

          let operation = await googleAI.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: veoPrompt,
            config: {
              aspectRatio: '16:9',
              numberOfVideos: 1,
            },
          })

          send({ status: 'processing', message: 'Veo 2 is rendering your website video...', progress: 0.05 })

          let attempts = 0
          const MAX_ATTEMPTS = 60

          while (!operation.done && attempts < MAX_ATTEMPTS) {
            await new Promise(r => setTimeout(r, 10_000))
            operation = await googleAI.operations.getVideosOperation({ operation })
            attempts++

            const progress = Math.min(0.9, 0.05 + (attempts / MAX_ATTEMPTS) * 0.85)
            send({
              status: 'processing',
              message: `Rendering... (${attempts * 10}s elapsed)`,
              progress,
            })
          }

          if (!operation.done) {
            send({ status: 'error', message: 'Video generation timed out after 10 minutes.' })
            return
          }

          const samples = operation.response?.generatedVideos
            ?? operation.response?.generatedSamples
            ?? operation.result?.videos
            ?? []

          if (!samples.length) {
            send({ status: 'error', message: 'No video was returned from Veo 2.' })
            return
          }

          const videoUri = samples[0]?.video?.uri ?? samples[0]?.uri
          console.log('\n======================================================')
          console.log('[generate-video] SUCCESS! Video URI:', videoUri)
          console.log('Proxy URL:', `/api/video-proxy?uri=${encodeURIComponent(videoUri)}`)
          console.log('======================================================\n')
          send({ status: 'complete', videoUri, message: 'Video generated successfully!' })
        } catch (err) {
          console.error('[generate-video]', err.message)
          send({ status: 'error', message: err.message })
        } finally {
          if (!isClosed) {
            isClosed = true
            try {
              controller.close()
            } catch (e) {
              console.error('[generate-video] Error closing controller:', e.message)
            }
          }
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

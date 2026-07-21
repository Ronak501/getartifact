import { googleAI } from '@lib/ai-clients'

export const dynamic = 'force-dynamic'
const GENERATE_VIDEO_ROUTE_VERSION = '2026-07-20-uri-guard-v2'

const VIDEO_PROVIDER = (process.env.VIDEO_PROVIDER ?? 'vertex').toLowerCase()
const BEDROCK_VIDEO_ENDPOINT = process.env.AWS_BEDROCK_VIDEO_ENDPOINT ?? process.env.BEDROCK_VIDEO_ENDPOINT ?? ''
const BEDROCK_API_KEY = process.env.AWS_BEDROCK_API_KEY ?? process.env.BEDROCK_API_KEY ?? ''
const BEDROCK_MODEL_ID = process.env.AWS_BEDROCK_MODEL_ID ?? 'amazon.nova-reel-v1:0'

function isPlaceholderValue(value) {
  return typeof value === 'string' && value.trim().startsWith('<') && value.trim().endsWith('>')
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function hasBedrockConfig() {
  if (!BEDROCK_VIDEO_ENDPOINT || !BEDROCK_API_KEY) return false
  if (isPlaceholderValue(BEDROCK_VIDEO_ENDPOINT) || isPlaceholderValue(BEDROCK_API_KEY)) return false
  return isValidHttpUrl(BEDROCK_VIDEO_ENDPOINT)
}

function isLikelyVideoUri(value) {
  return typeof value === 'string' && value.trim().length > 0 && value !== 'undefined'
}

function normalizeUriCandidate(value) {
  if (isLikelyVideoUri(value)) return value.trim()
  if (value == null) return null

  if (typeof value === 'object' && typeof value.toString === 'function') {
    const str = value.toString()
    if (isLikelyVideoUri(str) && str !== '[object Object]') return str.trim()
  }

  return null
}

function videoBytesToDataUri(videoObj) {
  const mimeType = typeof videoObj?.mimeType === 'string' && videoObj.mimeType.trim()
    ? videoObj.mimeType.trim()
    : 'video/mp4'
  const bytes = videoObj?.videoBytes
  if (!bytes) return null

  if (typeof bytes === 'string') {
    const normalized = bytes.replace(/\s+/g, '')
    if (normalized.length > 0) {
      return `data:${mimeType};base64,${normalized}`
    }
    return null
  }

  if (Array.isArray(bytes) && bytes.length > 0) {
    return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`
  }

  if (bytes instanceof Uint8Array && bytes.length > 0) {
    return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`
  }

  return null
}

function extractVideoUriFromObject(input, depth = 0) {
  if (!input || depth > 6) return null

  const directCandidates = [
    input?.video?.uri,
    input?.video?.videoUri,
    input?.video?.gcsUri,
    input?.video?.outputUri,
    input?.video?.storageUri,
    input?.video?.signedUri,
    input?.videoUri,
    input?.uri,
    input?.url,
    input?.gcsUri,
    input?.outputUri,
    input?.storageUri,
    input?.signedUri,
  ]
  for (const candidate of directCandidates) {
    const normalized = normalizeUriCandidate(candidate)
    if (normalized) return normalized
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const candidate = extractVideoUriFromObject(item, depth + 1)
      if (candidate) return candidate
    }
    return null
  }

  if (typeof input === 'object') {
    for (const value of Object.values(input)) {
      const candidate = extractVideoUriFromObject(value, depth + 1)
      if (candidate) return candidate
    }
  }

  return null
}

async function generateVideoViaVertex(veoPrompt, send) {
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
    throw new Error('Video generation timed out after 10 minutes.')
  }

  const candidatePools = [
    operation.response?.generatedVideos,
    operation.response?.generatedSamples,
    operation.result?.videos,
    operation.response,
    operation.result,
    operation,
  ]

  for (const pool of candidatePools) {
    const candidate = extractVideoUriFromObject(pool)
    if (candidate) return candidate
  }

  const generatedVideos = operation?.response?.generatedVideos
  if (Array.isArray(generatedVideos) && generatedVideos.length > 0) {
    const dataUri = videoBytesToDataUri(generatedVideos[0]?.video)
    if (dataUri) return dataUri
  }

  const responseKeys = Object.keys(operation?.response ?? {})
  const resultKeys = Object.keys(operation?.result ?? {})
  const generatedVideosCount = Array.isArray(generatedVideos) ? generatedVideos.length : 0
  const filteredCount = operation?.response?.raiMediaFilteredCount ?? 0
  const firstGeneratedVideoKeys = generatedVideosCount > 0 && typeof generatedVideos[0] === 'object'
    ? Object.keys(generatedVideos[0])
    : []
  const firstVideoPayloadKeys = generatedVideosCount > 0 && typeof generatedVideos[0]?.video === 'object'
    ? Object.keys(generatedVideos[0].video)
    : []

  throw new Error(
    `No usable video URI returned from Veo 2. response keys: [${responseKeys.join(', ')}], result keys: [${resultKeys.join(', ')}], generatedVideosCount: ${generatedVideosCount}, raiMediaFilteredCount: ${filteredCount}, firstGeneratedVideoKeys: [${firstGeneratedVideoKeys.join(', ')}], firstVideoPayloadKeys: [${firstVideoPayloadKeys.join(', ')}]`,
  )
}

async function generateVideoViaBedrock(veoPrompt, send) {
  if (!hasBedrockConfig()) {
    throw new Error('Bedrock fallback requested but AWS_BEDROCK_VIDEO_ENDPOINT/AWS_BEDROCK_API_KEY is missing, placeholder, or invalid')
  }

  send({ status: 'processing', message: 'Falling back to AWS Bedrock video provider...', progress: 0.2 })

  const res = await fetch(BEDROCK_VIDEO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': BEDROCK_API_KEY,
      'Authorization': `Bearer ${BEDROCK_API_KEY}`,
    },
    body: JSON.stringify({
      modelId: BEDROCK_MODEL_ID,
      prompt: veoPrompt,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bedrock fallback failed (${res.status}): ${text.slice(0, 500)}`)
  }

  const payload = await res.json()
  const videoUri = extractVideoUriFromObject(payload)
  if (!videoUri) {
    throw new Error('Bedrock response did not include videoUri')
  }
  return videoUri
}

export async function POST(req) {
  try {
    console.log(`[generate-video] route version: ${GENERATE_VIDEO_ROUTE_VERSION}`)
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
          let videoUri = null

          if (VIDEO_PROVIDER === 'bedrock') {
            videoUri = await generateVideoViaBedrock(veoPrompt, send)
          } else {
            try {
              videoUri = await generateVideoViaVertex(veoPrompt, send)
            } catch (vertexErr) {
              if (VIDEO_PROVIDER === 'auto' || hasBedrockConfig()) {
                console.warn(`[generate-video] Vertex failed, trying Bedrock fallback: ${vertexErr.message}`)
                videoUri = await generateVideoViaBedrock(veoPrompt, send)
              } else {
                throw vertexErr
              }
            }
          }

          if (!isLikelyVideoUri(videoUri)) {
            throw new Error(`Invalid video URI received: ${String(videoUri)}`)
          }

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

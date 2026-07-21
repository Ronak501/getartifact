import { NextResponse } from 'next/server'

const MESHY_API_KEY = process.env.MESHY_API_KEY
const MESHY_BASE    = 'https://api.meshy.ai/openapi/v2'

/**
 * POST /api/generate-3d-model
 * Body: { modelPrompt: string, style?: string }
 *
 * Calls Meshy AI to generate a .glb 3D model.
 * Returns: { modelUrl, previewUrl, taskId, status, fallback }
 *
 * If MESHY_API_KEY is not set or Meshy fails, returns { modelUrl: null, fallback: true }
 * so the code pipeline can continue using procedural R3F geometry.
 */
export async function POST(req) {
  try {
    const { modelPrompt, style = 'realistic' } = await req.json()
    if (!modelPrompt?.trim()) {
      return NextResponse.json({ error: 'modelPrompt is required' }, { status: 400 })
    }

    // ── Graceful fallback if no key ─────────────────────────────────────────
    if (!MESHY_API_KEY) {
      console.warn('[generate-3d-model] MESHY_API_KEY not set — returning fallback null.')
      return NextResponse.json({
        modelUrl:   null,
        previewUrl: null,
        taskId:     null,
        status:     'fallback',
        fallback:   true,
        message:    'No MESHY_API_KEY configured — procedural R3F geometry will be used instead.',
      })
    }

    // ── Step 1: Create Meshy text-to-3D task ────────────────────────────────
    const createRes = await fetch(`${MESHY_BASE}/text-to-3d`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${MESHY_API_KEY}`,
      },
      body: JSON.stringify({
        mode:                 'preview',          // fast preview mode (< 30s)
        prompt:               modelPrompt.slice(0, 500),
        art_style:            style,
        negative_prompt:      'low quality, blurry, distorted, deformed',
        topology:             'quad',
        target_polycount:     10000,
        should_remesh:        true,
        enable_pbr:           false,
      }),
    })

    if (!createRes.ok) {
      const errBody = await createRes.text()
      console.error('[generate-3d-model] Meshy create failed:', createRes.status, errBody)
      return NextResponse.json({ modelUrl: null, previewUrl: null, fallback: true, status: 'meshy_error', message: `Meshy API error ${createRes.status}` })
    }

    const { result: taskId } = await createRes.json()
    if (!taskId) {
      return NextResponse.json({ modelUrl: null, previewUrl: null, fallback: true, status: 'meshy_error', message: 'Meshy returned no task ID' })
    }

    // ── Step 2: Poll for completion ─────────────────────────────────────────
    const MAX_POLLS   = 40   // up to ~120s (40 × 3s)
    const POLL_MS     = 3000

    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(POLL_MS)

      const pollRes = await fetch(`${MESHY_BASE}/text-to-3d/${taskId}`, {
        headers: { 'Authorization': `Bearer ${MESHY_API_KEY}` },
      })

      if (!pollRes.ok) {
        console.warn(`[generate-3d-model] Poll ${i + 1} returned ${pollRes.status}`)
        continue
      }

      const task = await pollRes.json()
      const status = task.status ?? task.progress_message

      if (status === 'SUCCEEDED') {
        const modelUrl   = task.model_urls?.glb  ?? task.model_urls?.obj ?? null
        const previewUrl = task.thumbnail_url     ?? task.video_url       ?? null

        return NextResponse.json({
          modelUrl,
          previewUrl,
          taskId,
          status: 'success',
          fallback: false,
        })
      }

      if (status === 'FAILED' || status === 'EXPIRED') {
        console.error('[generate-3d-model] Meshy task failed:', task.task_error)
        return NextResponse.json({
          modelUrl: null, previewUrl: null, taskId,
          fallback: true, status: 'meshy_failed',
          message: task.task_error?.message ?? 'Meshy task failed',
        })
      }

      // Still PENDING or IN_PROGRESS — keep polling
      console.log(`[generate-3d-model] Poll ${i + 1}: ${status} (${task.progress ?? 0}%)`)
    }

    // Timeout
    console.warn('[generate-3d-model] Meshy polling timed out — using fallback')
    return NextResponse.json({
      modelUrl: null, previewUrl: null, taskId,
      fallback: true, status: 'timeout',
      message: 'Meshy 3D generation timed out — procedural geometry will be used.',
    })

  } catch (err) {
    console.error('[generate-3d-model]', err.message)
    // Never block the pipeline — return fallback gracefully
    return NextResponse.json({
      modelUrl: null, previewUrl: null, fallback: true,
      status: 'error', message: err.message,
    })
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

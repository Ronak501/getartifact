import { NextResponse } from 'next/server'

const TRIPO_API_KEY = process.env.TRIPO_API_KEY
const MESHY_API_KEY = process.env.MESHY_API_KEY
const MESHY_BASE    = 'https://api.meshy.ai/openapi/v2'

/**
 * POST /api/generate-3d-model
 * Body: { modelPrompt: string, style?: string }
 *
 * Calls Tripo3D AI (if configured) or Meshy AI to generate a .glb 3D model.
 * Returns: { modelUrl, previewUrl, taskId, status, fallback, provider }
 */
export async function POST(req) {
  try {
    const { modelPrompt, style = 'realistic' } = await req.json()
    if (!modelPrompt?.trim()) {
      return NextResponse.json({ error: 'modelPrompt is required' }, { status: 400 })
    }

    // ── 1. Try Tripo3D AI first ─────────────────────────────────────────────
    if (TRIPO_API_KEY) {
      console.log(`[generate-3d-model] Starting Tripo3D generation for: "${modelPrompt}"`)
      const tripoRes = await generateWithTripo(modelPrompt, TRIPO_API_KEY)
      if (!tripoRes.fallback) {
        return NextResponse.json(tripoRes)
      }
      console.warn('[generate-3d-model] Tripo3D fallback triggered:', tripoRes.message)
    }

    // ── 2. Try Meshy AI second ──────────────────────────────────────────────
    if (MESHY_API_KEY) {
      console.log(`[generate-3d-model] Starting Meshy generation for: "${modelPrompt}"`)
      const meshyRes = await generateWithMeshy(modelPrompt, style, MESHY_API_KEY)
      if (!meshyRes.fallback) {
        return NextResponse.json(meshyRes)
      }
      console.warn('[generate-3d-model] Meshy fallback triggered:', meshyRes.message)
    }

    // ── 3. Graceful procedural fallback ─────────────────────────────────────
    console.warn('[generate-3d-model] No 3D AI keys configured or APIs failed — returning procedural fallback.')
    return NextResponse.json({
      modelUrl:   null,
      previewUrl: null,
      taskId:     null,
      status:     'fallback',
      fallback:   true,
      provider:   'procedural',
      message:    'No 3D API key configured (or API failed) — procedural R3F geometry will be used instead.',
    })

  } catch (err) {
    console.error('[generate-3d-model] Error:', err.message)
    return NextResponse.json({
      modelUrl: null, previewUrl: null, fallback: true,
      status: 'error', message: err.message,
    })
  }
}

/* ─── Tripo3D v2 OpenAPI Implementation ───────────────────────────────────── */
async function generateWithTripo(prompt, apiKey) {
  try {
    const createRes = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        type:   'text_to_model',
        prompt: prompt.slice(0, 500),
      }),
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      return { fallback: true, status: 'tripo_error', message: `Tripo create failed (${createRes.status}): ${errText}` }
    }

    const createData = await createRes.json()
    const taskId = createData.data?.task_id ?? createData.task_id
    if (!taskId) {
      return { fallback: true, status: 'tripo_error', message: 'Tripo returned no task ID' }
    }

    const MAX_POLLS = 40 // up to 120s (40 x 3s)
    const POLL_MS   = 3000

    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(POLL_MS)

      const pollRes = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })

      if (!pollRes.ok) continue

      const pollData = await pollRes.json()
      const task   = pollData.data ?? pollData
      const status = (task.status ?? '').toLowerCase()

      if (status === 'success' || status === 'succeeded') {
        const modelUrl   = task.result?.model?.url ?? task.result?.pbr_model?.url ?? task.output?.model ?? null
        const previewUrl = task.result?.rendered_image?.url ?? task.thumbnail_url ?? null

        return {
          modelUrl,
          previewUrl,
          taskId,
          status:   'success',
          fallback: false,
          provider: 'tripo3d',
        }
      }

      if (status === 'failed' || status === 'error' || status === 'cancelled') {
        console.error('[generate-3d-model] Tripo3D task failed:', task)
        return { fallback: true, taskId, status: 'tripo_failed', message: task.error ?? 'Tripo task failed' }
      }

      console.log(`[generate-3d-model] Tripo Poll ${i + 1}: ${status} (${task.progress ?? 0}%)`)
    }

    return { fallback: true, taskId, status: 'timeout', message: 'Tripo3D polling timed out' }
  } catch (err) {
    return { fallback: true, status: 'error', message: err.message }
  }
}

/* ─── Meshy AI Implementation ─────────────────────────────────────────────── */
async function generateWithMeshy(prompt, style, apiKey) {
  try {
    const createRes = await fetch(`${MESHY_BASE}/text-to-3d`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        mode:             'preview',
        prompt:           prompt.slice(0, 500),
        art_style:        style,
        negative_prompt:  'low quality, blurry, distorted, deformed',
        topology:         'quad',
        target_polycount: 10000,
        should_remesh:    true,
        enable_pbr:       false,
      }),
    })

    if (!createRes.ok) {
      const errBody = await createRes.text()
      return { fallback: true, status: 'meshy_error', message: `Meshy API error ${createRes.status}: ${errBody}` }
    }

    const { result: taskId } = await createRes.json()
    if (!taskId) return { fallback: true, status: 'meshy_error', message: 'Meshy returned no task ID' }

    const MAX_POLLS = 40
    const POLL_MS   = 3000

    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(POLL_MS)

      const pollRes = await fetch(`${MESHY_BASE}/text-to-3d/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })

      if (!pollRes.ok) continue

      const task = await pollRes.json()
      const status = task.status ?? task.progress_message

      if (status === 'SUCCEEDED') {
        const modelUrl   = task.model_urls?.glb  ?? task.model_urls?.obj ?? null
        const previewUrl = task.thumbnail_url     ?? task.video_url       ?? null

        return {
          modelUrl,
          previewUrl,
          taskId,
          status:   'success',
          fallback: false,
          provider: 'meshy',
        }
      }

      if (status === 'FAILED' || status === 'EXPIRED') {
        return { fallback: true, taskId, status: 'meshy_failed', message: task.task_error?.message ?? 'Meshy task failed' }
      }

      console.log(`[generate-3d-model] Meshy Poll ${i + 1}: ${status} (${task.progress ?? 0}%)`)
    }

    return { fallback: true, taskId, status: 'timeout', message: 'Meshy polling timed out' }
  } catch (err) {
    return { fallback: true, status: 'error', message: err.message }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

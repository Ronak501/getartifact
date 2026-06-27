import { NextResponse } from 'next/server'
import { gauth } from '@lib/ai-clients'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const uri = searchParams.get('uri')

    if (!uri) {
      return NextResponse.json({ error: 'uri is required' }, { status: 400 })
    }

    let httpUrl = uri
    if (uri.startsWith('gs://')) {
      httpUrl = uri.replace('gs://', 'https://storage.googleapis.com/')
    }

    const client = await gauth.getClient()
    const token = await client.getAccessToken()

    const upstream = await fetch(httpUrl, {
      headers: { Authorization: `Bearer ${token.token}` },
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: `GCS error ${upstream.status}` }, { status: upstream.status })
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'video/mp4',
        'Content-Length': upstream.headers.get('content-length') || '',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (err) {
    console.error('[video-proxy]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

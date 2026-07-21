import { NextResponse } from 'next/server'
import { resolveUserCredits } from '@lib/ai-clients'

export async function POST(req) {
  const authHeader = req.headers.get('authorization')
  const credits = await resolveUserCredits(authHeader)

  if (!credits) {
    return NextResponse.json({ authenticated: false, can_build: true })
  }

  return NextResponse.json({
    authenticated: true,
    plan: credits.plan,
    builds_used: credits.builds_used,
    builds_limit: credits.builds_limit,
    can_build: credits.can_build,
  })
}

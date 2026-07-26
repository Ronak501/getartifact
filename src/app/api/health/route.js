import { NextResponse } from 'next/server'

export async function GET() {
  const accessKey = process.env.AWS_ACCESS_KEY_ID ?? ''
  const secret    = process.env.AWS_SECRET_ACCESS_KEY ?? ''
  const model     = process.env.AWS_BEDROCK_TEXT_MODEL_ID ?? 'us.amazon.nova-pro-v1:0'
  const region    = process.env.AWS_REGION ?? 'us-east-1'

  const bedrockReady =
    Boolean(accessKey) && accessKey !== 'your-access-key-id' &&
    Boolean(secret)    && secret    !== 'your-secret-access-key'

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai: {
      bedrock: {
        configured: bedrockReady,
        model,
        region,
        keyHint: accessKey ? `${accessKey.slice(0, 4)}...${accessKey.slice(-4)}` : 'NOT SET',
      },
      gemini: {
        configured: Boolean(process.env.GOOGLE_PROJECT_ID),
        project: process.env.GOOGLE_PROJECT_ID ?? 'NOT SET',
      },
      claude: {
        configured: Boolean(process.env.ANTHROPIC_API_KEY),
      },
    },
  })
}

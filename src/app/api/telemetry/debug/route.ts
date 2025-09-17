import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

// Debug endpoint: lists telemetry:* keys and their lengths (first 3 entries preview)
export async function GET(_req: NextRequest) {
  try {
    const redis = getRedis()
    // Upstash lacks KEYS in serverless (discouraged). We'll track only known device(s): PE-001 for now.
    const device = process.env.NEXT_PUBLIC_DEVICE_NAME || 'PE-001'
    const key = `telemetry:${device}`
    const len = await redis.llen(key)
    const sample = len > 0 ? await redis.lrange<string>(key, 0, Math.min(2, len - 1)) : []
    return NextResponse.json({ key, len, sample })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'debug_error' }, { status: 500 })
  }
}

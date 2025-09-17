import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

const MAX_HISTORY = 200

interface CompleteTelemetry {
  device: string
  ts: number
  soc: number
  voltage?: number
  temperature?: number
  health?: number
  cycleCount?: number
  estimatedRangeKm?: number
  chargingStatus?: string
  alerts?: string[]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const device = searchParams.get('device') || 'PE-001'
  const limit = Math.min(Number(searchParams.get('limit') || MAX_HISTORY), MAX_HISTORY)
  try {
    const redis = getRedis()
    const key = `telemetry:${device}`
    console.log('[API GET] Querying Redis key:', key, 'limit:', limit)

    const keyExists = await redis.exists(key)
    const listLength = await redis.llen(key)
    console.log('[API GET] Key exists:', keyExists, 'List length:', listLength)

    const raw = await redis.lrange<string>(key, 0, limit - 1)
    console.log('[API GET] Raw data from Redis:', raw)

    const out: CompleteTelemetry[] = []
    for (const r of raw) {
      // Upstash Redis already returns parsed objects, not JSON strings
      console.log('[API GET] Processing record:', r, 'type:', typeof r)

      // If it's already an object, use it directly
      if (typeof r === 'object' && r !== null && typeof (r as any).soc === 'number') {
        console.log('[API GET] Using object directly:', r)
        const obj = r as any
        out.push({
          device,
          ts: typeof obj.ts === 'number' ? obj.ts : Date.now(),
          soc: obj.soc,
          voltage: typeof obj.voltage === 'number' ? obj.voltage : undefined,
          temperature: typeof obj.temperature === 'number' ? obj.temperature : undefined,
          health: typeof obj.health === 'number' ? obj.health : undefined,
          cycleCount: typeof obj.cycleCount === 'number' ? obj.cycleCount : undefined,
          estimatedRangeKm: typeof obj.estimatedRangeKm === 'number' ? obj.estimatedRangeKm : undefined,
          chargingStatus: typeof obj.chargingStatus === 'string' ? obj.chargingStatus : undefined,
          alerts: Array.isArray(obj.alerts) ? obj.alerts : undefined
        })
        continue
      }

      // Fallback: try JSON parsing if it's a string
      let parsed: any = null
      if (typeof r === 'string') {
        try {
          parsed = JSON.parse(r)
          console.log('[API GET] Parsed JSON from string:', parsed)
        } catch (e) {
          console.log('[API GET] JSON parse failed for string:', r)
        }
        if (parsed && typeof parsed.soc === 'number') {
          out.push({
            device,
            ts: typeof parsed.ts === 'number' ? parsed.ts : Date.now(),
            soc: parsed.soc,
            voltage: typeof parsed.voltage === 'number' ? parsed.voltage : undefined,
            temperature: typeof parsed.temperature === 'number' ? parsed.temperature : undefined,
            health: typeof parsed.health === 'number' ? parsed.health : undefined,
            cycleCount: typeof parsed.cycleCount === 'number' ? parsed.cycleCount : undefined,
            estimatedRangeKm: typeof parsed.estimatedRangeKm === 'number' ? parsed.estimatedRangeKm : undefined,
            chargingStatus: typeof parsed.chargingStatus === 'string' ? parsed.chargingStatus : undefined,
            alerts: Array.isArray(parsed.alerts) ? parsed.alerts : undefined
          })
          continue
        }
      }

      // Last resort: regex extraction from string representation
      const rStr = String(r)
      const socMatch = /"?soc"?\s*:\s*([0-9]+(?:\.[0-9]+)?)/.exec(rStr)
      const tsMatch = /"?ts"?\s*:\s*([0-9]+)/.exec(rStr)
      if (socMatch) {
        out.push({ device, ts: tsMatch ? Number(tsMatch[1]) : Date.now(), soc: Number(socMatch[1]) })
      }
    }
    out.reverse()
    console.log('[API GET] Final output:', out)
    return NextResponse.json({ device, count: out.length, data: out })
  } catch (e: any) {
    console.log('[API GET] Error:', e.message)
    return NextResponse.json({ error: e.message || 'redis_error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const device: string = body.device || 'PE-001'
    const socRaw = body.soc
    const socNum = typeof socRaw === 'number' ? socRaw : Number(socRaw)
    if (Number.isNaN(socNum)) {
      return NextResponse.json({ error: 'invalid_soc' }, { status: 400 })
    }
    const item: CompleteTelemetry = {
      device,
      ts: body.ts ? Number(body.ts) : Date.now(),
      soc: socNum,
      voltage: typeof body.voltage === 'number' ? body.voltage : undefined,
      temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
      health: typeof body.health === 'number' ? body.health : undefined,
      cycleCount: typeof body.cycleCount === 'number' ? body.cycleCount : undefined,
      estimatedRangeKm: typeof body.estimatedRangeKm === 'number' ? body.estimatedRangeKm : undefined,
      chargingStatus: typeof body.chargingStatus === 'string' ? body.chargingStatus : undefined,
      alerts: Array.isArray(body.alerts) ? body.alerts : undefined
    }
    const redis = getRedis()
    const key = `telemetry:${device}`
    console.log('[API POST] Storing to Redis key:', key, 'data:', item)
    await redis.lpush(key, JSON.stringify(item))
    await redis.ltrim(key, 0, MAX_HISTORY - 1)
    const finalCount = await redis.llen(key)
    console.log('[API POST] Data stored, final count:', finalCount)
    return NextResponse.json({ ok: true, key, count: finalCount })
  } catch (e: any) {
    console.log('[API POST] Error:', e.message)
    return NextResponse.json({ error: e.message || 'redis_error' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

interface GPSInfo {
  lat?: number
  lng?: number
  speed?: number
  heading?: number
  altitude?: number
  accuracy?: number
}

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
  gps?: GPSInfo
}

function num(v: any): number | undefined {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v)
  return undefined
}

export async function GET() {
  const redis = getRedis()
  // 获取所有设备最新 telemetry 列表
  const keys: string[] = await redis.keys('telemetry:*')
  if (keys.length === 0) {
    return NextResponse.json({ data: [] })
  }

  // 批量获取最新一条
  const pipeline = redis.multi()
  for (const key of keys) {
    pipeline.lindex(key, 0)
  }
  const raws = await pipeline.exec()

  const list: CompleteTelemetry[] = []
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const device = key.replace('telemetry:', '')
    const raw = raws[i]
    let o: any = null
    if (raw) {
      o = typeof raw === 'string' ? JSON.parse(raw) : raw
    }
    if (!o || typeof o.soc !== 'number') continue
    const g0 = o.gps
    const g = g0 && typeof g0 === 'object' ? (Array.isArray(g0) ? g0[0] : g0) : undefined
    const latObj = num(g?.lat ?? o.lat)
    const lngObj = num(g?.lng ?? o.lng)

    const entry: CompleteTelemetry = {
      device,
      ts: typeof o.ts === 'number' ? o.ts : Date.now(),
      soc: o.soc,
      voltage: num(o.voltage),
      temperature: num(o.temperature),
      health: num(o.health),
      cycleCount: num(o.cycleCount),
      estimatedRangeKm: num(o.estimatedRangeKm),
      chargingStatus: typeof o.chargingStatus === 'string' ? o.chargingStatus : undefined,
      alerts: Array.isArray(o.alerts) ? o.alerts : undefined,
      gps: latObj != null && lngObj != null ? {
        lat: latObj,
        lng: lngObj,
        speed: num(g?.speed),
        heading: num(g?.heading),
        altitude: num(g?.altitude),
        accuracy: num(g?.accuracy),
      } : undefined,
    }
    list.push(entry)
  }

  return NextResponse.json({ data: list })
}

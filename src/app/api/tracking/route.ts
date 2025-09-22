import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

// 轨迹点结构
interface TrackingPoint {
  device: string;
  ts: number;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  status?: string;
  extra?: Record<string, any>;
}

const HISTORY_LIMIT = 1000;

// Helper: extract first valid GPS from an item
const num = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : undefined)
function extractGps(o: any): { lat?: number; lng?: number; speed?: number; heading?: number; altitude?: number } | undefined {
  if (!o) return undefined
  const g0 = o.gps
  const g = (g0 && typeof g0 === 'object') ? (Array.isArray(g0) ? g0[0] : g0) : undefined
  const lat = num(g?.lat ?? (g as any)?.latitude ?? o.lat ?? (o as any)?.latitude)
  const lng = num(g?.lng ?? (g as any)?.lon ?? (g as any)?.longitude ?? o.lng ?? (o as any)?.lon ?? (o as any)?.longitude)
  if (lat == null || lng == null) return undefined
  return {
    lat,
    lng,
    speed: num(g?.speed),
    heading: num(g?.heading ?? o.heading),
    altitude: num(g?.altitude ?? o.altitude)
  }
}

// POST: 设备上报轨迹点（topic 统一 fleet/tracking，device 字段区分设备）
// Deprecated: previously accepted raw tracking writes. Now no-op to avoid duplication.
export async function POST(req: NextRequest) {
  try {
    // Accept but do not store; advise client to use /api/telemetry
    return NextResponse.json({ ok: true, deprecated: true, message: 'Use /api/telemetry for GPS inside telemetry. Tracking derives from telemetry history.' })
  } catch {
    return NextResponse.json({ ok: false, deprecated: true }, { status: 400 })
  }
}

// GET: 查询最新/历史轨迹点（支持多设备）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const device = searchParams.get('device') || 'PE-001';
  const limit = parseInt(searchParams.get('limit') || '1', 10);
  const type = searchParams.get('type') || 'latest';
  try {
    const redis = getRedis();
    const TELE_KEY = `telemetry:${device}`
    if (type === 'latest') {
      const latestRaw: any = await (redis as any).lindex(TELE_KEY, 0)
      const toObj = (v: any) => {
        if (!v) return null
        if (typeof v === 'object') return v
        if (typeof v === 'string') { try { return JSON.parse(v) } catch { return null } }
        return null
      }
      const o = toObj(latestRaw)
      const g = extractGps(o)
      if (!o || !g) return NextResponse.json({ point: null })
      const point: TrackingPoint = {
        device,
        ts: typeof o.ts === 'number' ? o.ts : Date.now(),
        lat: g.lat!,
        lng: g.lng!,
        speed: g.speed,
        heading: g.heading,
        altitude: g.altitude
      }
      return NextResponse.json({ point })
    } else if (type === 'history') {
      const items: any[] = await (redis as any).lrange(TELE_KEY, 0, HISTORY_LIMIT - 1)
      const toObj = (v: any) => {
        if (!v) return null
        if (typeof v === 'object') return v
        if (typeof v === 'string') { try { return JSON.parse(v) } catch { return null } }
        return null
      }
      const points: TrackingPoint[] = []
      for (const r of items) {
        const o = toObj(r)
        const g = extractGps(o)
        if (!o || !g) continue
        points.push({
          device,
          ts: typeof o.ts === 'number' ? o.ts : Date.now(),
          lat: g.lat!,
          lng: g.lng!,
          speed: g.speed,
          heading: g.heading,
          altitude: g.altitude
        })
        if (points.length >= limit) break
      }
      return NextResponse.json({ points })
    }
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }
}

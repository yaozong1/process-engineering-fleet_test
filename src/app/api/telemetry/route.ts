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
  const list = searchParams.get('list')
  
  try {
    const redis = getRedis()
    
    // 如果请求设备列表
    if (list === '1') {
      console.log('[API] 获取设备列表请求')
      
      // 获取所有以 telemetry: 开头的键
      const keys = await redis.keys('telemetry:*')
      console.log('[API] 找到的Redis键:', keys)
      
      // 从键名中提取设备ID
      const devices = keys
        .filter((key: string) => key.startsWith('telemetry:'))
        .map((key: string) => key.replace('telemetry:', ''))
        .filter((deviceId: string) => deviceId.length > 0)
      
      console.log('[API] 提取的设备列表:', devices)
      
      return NextResponse.json({ 
        devices: devices,
        count: devices.length 
      })
    }
    
    // 原有的单设备数据获取逻辑
    const key = `telemetry:${device}`

    const keyExists = await redis.exists(key)
    const listLength = await redis.llen(key)

    const raw = await redis.lrange<string>(key, 0, limit - 1)

    const out: CompleteTelemetry[] = []
    for (const r of raw) {
      // Upstash Redis already returns parsed objects, not JSON strings

      // If it's already an object, use it directly
      if (typeof r === 'object' && r !== null && typeof (r as any).soc === 'number') {
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
        } catch (e) {
          // JSON parse failed, skip
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
    return NextResponse.json({ device, count: out.length, data: out })
  } catch (e: any) {
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
    // 1) 服务器端去重：对比最近一条
    try {
      const lastRaw: any = await (redis as any).lindex(key, 0)
      if (lastRaw) {
        let last: any = null
        if (typeof lastRaw === 'string') {
          try { last = JSON.parse(lastRaw) } catch { /* ignore */ }
        } else if (typeof lastRaw === 'object' && lastRaw !== null) {
          last = lastRaw
        }
        if (last && typeof last.soc === 'number') {
          const sameSoc = Math.abs((last.soc ?? NaN) - item.soc) < 0.0001
          const sameVolt = Math.abs((last.voltage ?? NaN) - (item.voltage ?? NaN)) < 0.0001
          const sameTemp = Math.abs((last.temperature ?? NaN) - (item.temperature ?? NaN)) < 0.0001
          const timeDiff = Math.abs((item.ts ?? 0) - (last.ts ?? 0))
          if (sameSoc && sameVolt && sameTemp && timeDiff < 30000) {
            return NextResponse.json({ ok: true, key, skipped: true, reason: 'duplicate_within_30s' })
          }
        }
      }
    } catch { /* soft-fail */ }

    // 2) 30秒幂等锁：SADD + EXPIRE（跨进程保证一次写入）
    try {
      const fmt = (v: any) => (typeof v === 'number' && Number.isFinite(v)) ? v.toFixed(3) : String(v ?? 'null')
      const idemSetKey = `idem:${device}`
      const member = `${fmt(item.soc)}|${fmt(item.voltage)}|${fmt(item.temperature)}`
      const saddResult = await (redis as any).sadd(idemSetKey, member)
      if (saddResult !== 1) {
        return NextResponse.json({ ok: true, key, skipped: true, reason: 'idempotency_sadd' })
      }
      try { await (redis as any).expire(idemSetKey, 30) } catch { /* ignore */ }
    } catch {
      // 回退方案：SET NX EX 30
      try {
        const lockKey = `idem:${device}:${item.soc}:${item.voltage}:${item.temperature}`
        const setRes = await (redis as any).set(lockKey, '1', { nx: true, ex: 30 })
        if (setRes !== 'OK') {
          return NextResponse.json({ ok: true, key, skipped: true, reason: 'idempotency_lock' })
        }
      } catch { /* ignore */ }
    }

    // 3) 写入
    await redis.lpush(key, JSON.stringify(item))
    await redis.ltrim(key, 0, MAX_HISTORY - 1)
    const finalCount = await redis.llen(key)
    return NextResponse.json({ ok: true, key, count: finalCount })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'redis_error' }, { status: 500 })
  }
}
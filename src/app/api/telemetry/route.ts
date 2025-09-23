import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

const MAX_HISTORY = 200

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const device = searchParams.get('device') || 'PE-001'
  const limit = Math.min(Number(searchParams.get('limit') || MAX_HISTORY), MAX_HISTORY)
  const list = searchParams.get('list')
  const latest = searchParams.get('latest')
  const num = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : undefined)
  
  try {
    const redis = getRedis()
    
    // 如果请求设备列表
    if (list === '1') {
      console.log('[API] 获取设备列表请求')
      
      // 获取所有以 telemetry: 开头的键
      const keys = await redis.keys('telemetry:*')
      console.log('[API] 找到的Redis键:', keys)
      
      // 从键名中提取设备ID，但排除充电桩设备
      const devices = keys
        .filter((key: string) => key.startsWith('telemetry:'))
        .map((key: string) => key.replace('telemetry:', ''))
        .filter((deviceId: string) => {
          // 排除充电桩设备 (chargenode:*)
          return deviceId.length > 0 && !deviceId.startsWith('chargenode:')
        })
      
      console.log('[API] 提取的设备列表 (已排除充电桩):', devices)
      
      return NextResponse.json({ 
        devices: devices,
        count: devices.length 
      })
    }
    
    // 原有的单设备数据获取逻辑
    const key = `telemetry:${device}`

    // 如果请求最新一条，直接读取队首（LPUSH导致索引0为最新）
    if (latest === '1' || latest === 'true') {
      const latestRaw: any = await (redis as any).lindex(key, 0)
      let item: CompleteTelemetry | null = null
      if (latestRaw) {
        if (typeof latestRaw === 'object' && latestRaw !== null) {
          const o: any = latestRaw
          const g0 = o.gps
          const g = (g0 && typeof g0 === 'object') ? (Array.isArray(g0) ? g0[0] : g0) : undefined
          const latObj = num(g?.lat ?? (g as any)?.latitude ?? o.lat ?? (o as any)?.latitude)
          const lngObj = num(g?.lng ?? (g as any)?.lon ?? (g as any)?.longitude ?? o.lng ?? (o as any)?.lon ?? (o as any)?.longitude)
          item = {
            device,
            ts: typeof o.ts === 'number' ? o.ts : Date.now(),
            soc: o.soc,
            voltage: typeof o.voltage === 'number' ? o.voltage : undefined,
            temperature: typeof o.temperature === 'number' ? o.temperature : undefined,
            health: typeof o.health === 'number' ? o.health : undefined,
            cycleCount: typeof o.cycleCount === 'number' ? o.cycleCount : undefined,
            estimatedRangeKm: typeof o.estimatedRangeKm === 'number' ? o.estimatedRangeKm : undefined,
            chargingStatus: typeof o.chargingStatus === 'string' ? o.chargingStatus : undefined,
            alerts: Array.isArray(o.alerts) ? o.alerts : undefined,
            gps: (latObj != null && lngObj != null) ? {
              lat: latObj,
              lng: lngObj,
              speed: num(g.speed),
              heading: num(g.heading),
              altitude: num(g.altitude),
              accuracy: num(g.accuracy),
            } : undefined
          }
        } else if (typeof latestRaw === 'string') {
          try {
            const p = JSON.parse(latestRaw)
            if (p && typeof p.soc === 'number') {
              const g0 = p.gps
              const g = (g0 && typeof g0 === 'object') ? (Array.isArray(g0) ? g0[0] : g0) : undefined
              const latObj = num(g?.lat ?? (g as any)?.latitude ?? p.lat ?? (p as any)?.latitude)
              const lngObj = num(g?.lng ?? (g as any)?.lon ?? (g as any)?.longitude ?? p.lng ?? (p as any)?.lon ?? (p as any)?.longitude)
              item = {
                device,
                ts: typeof p.ts === 'number' ? p.ts : Date.now(),
                soc: p.soc,
                voltage: typeof p.voltage === 'number' ? p.voltage : undefined,
                temperature: typeof p.temperature === 'number' ? p.temperature : undefined,
                health: typeof p.health === 'number' ? p.health : undefined,
                cycleCount: typeof p.cycleCount === 'number' ? p.cycleCount : undefined,
                estimatedRangeKm: typeof p.estimatedRangeKm === 'number' ? p.estimatedRangeKm : undefined,
                chargingStatus: typeof p.chargingStatus === 'string' ? p.chargingStatus : undefined,
                alerts: Array.isArray(p.alerts) ? p.alerts : undefined,
                gps: (latObj != null && lngObj != null) ? {
                  lat: latObj,
                  lng: lngObj,
                  speed: num(g.speed),
                  heading: num(g.heading),
                  altitude: num(g.altitude),
                  accuracy: num(g.accuracy),
                } : undefined
              }
            }
          } catch { /* ignore */ }
        }
      }

      // Fallback: scan recent telemetry history for latest GPS if missing
      try {
        const hasGps = !!(item && item.gps && typeof item.gps.lat === 'number' && typeof item.gps.lng === 'number')
        if (!hasGps) {
          const scanCount = 50
          const historyRaw: any[] = await (redis as any).lrange(key, 0, scanCount - 1)
          const toObj = (v: any) => {
            if (!v) return null
            if (typeof v === 'object') return v
            if (typeof v === 'string') { try { return JSON.parse(v) } catch { return null } }
            return null
          }
          const num = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : undefined)
          for (const r of historyRaw) {
            const o: any = toObj(r)
            if (!o) continue
            const g0 = o.gps
            const g = (g0 && typeof g0 === 'object') ? (Array.isArray(g0) ? g0[0] : g0) : undefined
            const latObj = num(g?.lat ?? (g as any)?.latitude ?? o.lat ?? (o as any)?.latitude)
            const lngObj = num(g?.lng ?? (g as any)?.lon ?? (g as any)?.longitude ?? o.lng ?? (o as any)?.lon ?? (o as any)?.longitude)
            if (latObj != null && lngObj != null) {
              const mergedGps: GPSInfo = {
                lat: latObj,
                lng: lngObj,
                speed: num(g?.speed),
                heading: num(g?.heading),
                altitude: num(g?.altitude),
                accuracy: num(g?.accuracy),
              }
              if (!item) {
                item = {
                  device,
                  ts: typeof o.ts === 'number' ? o.ts : Date.now(),
                  soc: typeof o.soc === 'number' ? o.soc : 0,
                  gps: mergedGps,
                } as CompleteTelemetry
              } else {
                item.gps = mergedGps
                if (typeof o.ts === 'number' && (!item.ts || o.ts > item.ts)) {
                  item.ts = o.ts
                }
                ;(item as any).gpsFromHistory = true
              }
              break
            }
          }

          // Legacy compatibility (read-only): if still missing GPS, check old caches
          const stillNoGps = !(item && item.gps && typeof item.gps.lat === 'number' && typeof item.gps.lng === 'number')
          if (stillNoGps) {
            let cached: any = null
            try {
              const lastKey = `gps:last:${device}`
              const cachedLast: any = await (redis as any).get(lastKey)
              if (cachedLast) {
                cached = typeof cachedLast === 'string' ? JSON.parse(cachedLast) : cachedLast
              }
            } catch { /* ignore */ }
            if (!cached) {
              try {
                const tracking = await (redis as any).get(`tracking:${device}:latest`)
                if (tracking) cached = typeof tracking === 'string' ? JSON.parse(tracking) : tracking
              } catch { /* ignore */ }
            }
            const cLat = cached?.lat ?? cached?.gps?.lat
            const cLng = cached?.lng ?? cached?.gps?.lng ?? cached?.lon
            if (typeof cLat === 'number' && typeof cLng === 'number') {
              const mergedGps: GPSInfo = {
                lat: cLat,
                lng: cLng,
                speed: typeof cached?.speed === 'number' ? cached.speed : undefined,
                heading: typeof cached?.heading === 'number' ? cached.heading : undefined,
                altitude: typeof cached?.altitude === 'number' ? cached.altitude : undefined,
                accuracy: typeof cached?.accuracy === 'number' ? cached.accuracy : undefined,
              }
              if (!item) {
                item = {
                  device,
                  ts: typeof cached?.ts === 'number' ? cached.ts : Date.now(),
                  soc: 0,
                  gps: mergedGps,
                } as CompleteTelemetry
              } else {
                item.gps = mergedGps
                if (typeof cached?.ts === 'number' && (!item.ts || cached.ts > item.ts)) {
                  item.ts = cached.ts
                }
                ;(item as any).gpsFromLegacy = true
              }
            }
          }
        }
      } catch { /* soft-fail */ }

      return NextResponse.json({ device, count: item ? 1 : 0, data: item ? [item] : [] , latest: item ?? null })
    }

    const raw = await redis.lrange<string>(key, 0, limit - 1)

    const out: CompleteTelemetry[] = []
    for (const r of raw) {
      // Upstash Redis already returns parsed objects, not JSON strings

      // If it's already an object, use it directly
      if (typeof r === 'object' && r !== null && typeof (r as any).soc === 'number') {
        const obj = r as any
        const g0 = obj.gps
        const g = (g0 && typeof g0 === 'object') ? (Array.isArray(g0) ? g0[0] : g0) : undefined
        const latObj = num(g?.lat ?? (g as any)?.latitude ?? obj.lat ?? (obj as any)?.latitude)
        const lngObj = num(g?.lng ?? (g as any)?.lon ?? (g as any)?.longitude ?? obj.lng ?? (obj as any)?.lon ?? (obj as any)?.longitude)
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
          alerts: Array.isArray(obj.alerts) ? obj.alerts : undefined,
          gps: (latObj != null && lngObj != null) ? {
            lat: latObj,
            lng: lngObj,
            speed: num(g.speed),
            heading: num(g.heading),
            altitude: num(g.altitude),
            accuracy: num(g.accuracy),
          } : undefined
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
          const g0 = parsed.gps
          const g = (g0 && typeof g0 === 'object') ? (Array.isArray(g0) ? g0[0] : g0) : undefined
          const latObj = num(g?.lat ?? (g as any)?.latitude ?? parsed.lat ?? (parsed as any)?.latitude)
          const lngObj = num(g?.lng ?? (g as any)?.lon ?? (g as any)?.longitude ?? parsed.lng ?? (parsed as any)?.lon ?? (parsed as any)?.longitude)
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
            alerts: Array.isArray(parsed.alerts) ? parsed.alerts : undefined,
            gps: (latObj != null && lngObj != null) ? {
              lat: latObj,
              lng: lngObj,
              speed: num(g.speed),
              heading: num(g.heading),
              altitude: num(g.altitude),
              accuracy: num(g.accuracy),
            } : undefined
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
    // 兼容平铺的 lat/lng；优先使用 body.gps
    const gps: GPSInfo | undefined = (() => {
      const g0 = body.gps
      const g = (g0 && typeof g0 === 'object') ? (Array.isArray(g0) ? g0[0] : g0) : undefined
      const num = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : undefined)
      if (g && typeof g === 'object') {
        const out: GPSInfo = {
          lat: num(g.lat),
          lng: num(g.lng),
          speed: num(g.speed),
          heading: num(g.heading),
          altitude: num(g.altitude),
          accuracy: num(g.accuracy)
        }
        return (out.lat != null && out.lng != null) ? out : undefined
      }
      const lat = num(body.lat ?? body.latitude)
      const lng = num(body.lng ?? body.lon ?? body.longitude)
      const speed = num(body.speed)
      const heading = num(body.heading ?? body.course)
      if (lat != null && lng != null) {
        return { lat, lng, speed, heading }
      }
      return undefined
    })()
    const item: CompleteTelemetry = {
      device,
      ts: (typeof body.ts === 'number' && Number.isFinite(body.ts)) ? Number(body.ts) : Date.now(),
      soc: socNum,
      voltage: typeof body.voltage === 'number' ? body.voltage : undefined,
      temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
      health: typeof body.health === 'number' ? body.health : undefined,
      cycleCount: typeof body.cycleCount === 'number' ? body.cycleCount : undefined,
      estimatedRangeKm: typeof body.estimatedRangeKm === 'number' ? body.estimatedRangeKm : undefined,
      chargingStatus: typeof body.chargingStatus === 'string' ? body.chargingStatus : undefined,
      alerts: Array.isArray(body.alerts) ? body.alerts : undefined,
      gps
    }
    const redis = getRedis()
    const key = `telemetry:${device}`
    // 1) 服务器端去重与乱序丢弃
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
          // 1.0) 若新上报 ts 不晚于当前最新，则不再新写入；尝试就地合并补全
          if (typeof last.ts === 'number' && typeof item.ts === 'number' && item.ts <= last.ts) {
            try {
              const merged: any = { ...last }
              // 仅补全缺失字段，避免用旧值覆盖新值
              if (merged.voltage == null && typeof item.voltage === 'number') merged.voltage = item.voltage
              if (merged.temperature == null && typeof item.temperature === 'number') merged.temperature = item.temperature
              if (Array.isArray(item.alerts) && (!Array.isArray(merged.alerts) || merged.alerts.length === 0)) merged.alerts = item.alerts
              if (typeof item.chargingStatus === 'string' && typeof merged.chargingStatus !== 'string') merged.chargingStatus = item.chargingStatus
              // GPS 合并（以 item 优先丰补）
              const mg = (merged.gps && typeof merged.gps === 'object') ? merged.gps : {}
              const ig = (item.gps && typeof item.gps === 'object') ? item.gps : undefined
              if (ig) {
                merged.gps = {
                  lat: typeof ig.lat === 'number' ? ig.lat : mg.lat,
                  lng: typeof ig.lng === 'number' ? ig.lng : mg.lng,
                  speed: typeof ig.speed === 'number' ? ig.speed : mg.speed,
                  heading: typeof ig.heading === 'number' ? ig.heading : mg.heading,
                  altitude: typeof ig.altitude === 'number' ? ig.altitude : mg.altitude,
                  accuracy: typeof ig.accuracy === 'number' ? ig.accuracy : mg.accuracy,
                }
              }
              await (redis as any).lset(key, 0, JSON.stringify(merged))
              return NextResponse.json({ ok: true, key, mergedIntoHead: true })
            } catch { /* fallback to proceed */ }
          }
          // 1.1) 丢弃乱序：新上报 ts 明显早于当前最新（>5s）
          if (typeof last.ts === 'number' && typeof item.ts === 'number' && item.ts < (last.ts - 5000)) {
            return NextResponse.json({ ok: true, key, skipped: true, reason: 'out_of_order_older_than_head' })
          }
          const sameSoc = Math.abs((last.soc ?? NaN) - item.soc) < 0.0001
          const sameVolt = Math.abs((last.voltage ?? NaN) - (item.voltage ?? NaN)) < 0.0001
          const sameTemp = Math.abs((last.temperature ?? NaN) - (item.temperature ?? NaN)) < 0.0001
          // GPS 比较（经纬度均存在且变化很小才认为相同）；阈值约0.0001度（~11米）
          const num = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : undefined)
          const lastLat = num(last?.gps?.lat ?? last?.lat ?? last?.latitude)
          const lastLng = num(last?.gps?.lng ?? last?.gps?.lon ?? last?.lng ?? last?.lon ?? last?.longitude)
          const curLat = num(item?.gps?.lat)
          const curLng = num(item?.gps?.lng)
          const bothHaveGps = lastLat != null && lastLng != null && curLat != null && curLng != null
          const bothNoGps = (lastLat == null || lastLng == null) && (curLat == null || curLng == null)
          const sameGps = bothHaveGps
            ? (Math.abs((lastLat as number) - (curLat as number)) < 0.0001 && Math.abs((lastLng as number) - (curLng as number)) < 0.0001)
            : bothNoGps
          const timeDiff = Math.abs((item.ts ?? 0) - (last.ts ?? 0))
          if (sameSoc && sameVolt && sameTemp && sameGps && timeDiff < 30000) {
            return NextResponse.json({ ok: true, key, skipped: true, reason: 'duplicate_within_30s' })
          }
        }
      }
    } catch { /* soft-fail */ }

    // 2) 30秒幂等锁：SADD + EXPIRE（跨进程保证一次写入）
    try {
      const fmt = (v: any) => (typeof v === 'number' && Number.isFinite(v)) ? v.toFixed(5) : String(v ?? 'null')
      const idemSetKey = `idem:${device}`
      const member = `${fmt(item.soc)}|${fmt(item.voltage)}|${fmt(item.temperature)}|${fmt(item.gps?.lat)}|${fmt(item.gps?.lng)}`
      const saddResult = await (redis as any).sadd(idemSetKey, member)
      if (saddResult !== 1) {
        return NextResponse.json({ ok: true, key, skipped: true, reason: 'idempotency_sadd' })
      }
      try { await (redis as any).expire(idemSetKey, 30) } catch { /* ignore */ }
    } catch {
      // 回退方案：SET NX EX 30
      try {
        const lockKey = `idem:${device}:${item.soc}:${item.voltage}:${item.temperature}:${item.gps?.lat}:${item.gps?.lng}`
        const setRes = await (redis as any).set(lockKey, '1', { nx: true, ex: 30 })
        if (setRes !== 'OK') {
          return NextResponse.json({ ok: true, key, skipped: true, reason: 'idempotency_lock' })
        }
      } catch { /* ignore */ }
    }

    // 3) 写入
    await redis.lpush(key, JSON.stringify(item))
    await redis.ltrim(key, 0, MAX_HISTORY - 1)

    // 3.1) 移除冗余缓存写入（gps:last:*、tracking:*:latest），一切以 telemetry 列表为准

    const finalCount = await redis.llen(key)
    return NextResponse.json({ ok: true, key, count: finalCount })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'redis_error' }, { status: 500 })
  }
}
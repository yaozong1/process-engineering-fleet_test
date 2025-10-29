/**
 * Charging Station Data API
 * 接收和存储充电桩数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const redis = getRedis()
    const data = await request.json()
    
    // 验证必要字段
    if (!data.stationId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: stationId'
      }, { status: 400 })
    }

    const stationId = data.stationId
    const timestamp = data.ts || Date.now()
    
    // 准备充电桩数据 - 与telemetry格式保持一致
    const chargeNodeData = {
      stationId,
      ts: timestamp,
      status: data.status || "offline",
      voltage: typeof data.voltage === 'number' ? data.voltage : undefined,
      current: typeof data.current === 'number' ? data.current : undefined,
      power: typeof data.power === 'number' ? data.power : undefined,
      energy: typeof data.energy === 'number' ? data.energy : undefined,
      remainingTime: typeof data.remainingTime === 'number' ? data.remainingTime : undefined,
      temperature: typeof data.temperature === 'number' ? data.temperature : undefined,
      connectorType: typeof data.connectorType === 'string' ? data.connectorType : undefined,
      maxPower: typeof data.maxPower === 'number' ? data.maxPower : undefined,
      location: typeof data.location === 'string' ? data.location : undefined,
      faultCode: typeof data.faultCode === 'string' ? data.faultCode : undefined,
      faultMessage: typeof data.faultMessage === 'string' ? data.faultMessage : undefined
    }

    // 使用与telemetry相同的存储方式：telemetry:chargenode:{stationId}
    const redisKey = `telemetry:chargenode:${stationId}`
    
    // 存储到Redis List（与battery/GPS数据存储方式一致）
    await redis.lpush(redisKey, JSON.stringify(chargeNodeData))

    // 历史长度可配置（默认200）
    const maxHistoryEnv = process.env.CHARGENODE_MAX_HISTORY
    const maxHistory = Number.isFinite(Number(maxHistoryEnv)) && Number(maxHistoryEnv) > 0
      ? Number(maxHistoryEnv)
      : 200
    // ltrim 的 end 为 0-based，所以保留 0..(maxHistory-1)
    await redis.ltrim(redisKey, 0, Math.max(1, maxHistory) - 1)

    // TTL 可配置：
    // - CHARGENODE_TTL_SECONDS <= 0 或未设置时，可选择关闭 TTL（PERSIST）或使用默认
    // - 默认改为30天，避免频繁过期导致“历史消失”的错觉
    const ttlEnv = process.env.CHARGENODE_TTL_SECONDS
    const ttlSecondsParsed = ttlEnv !== undefined ? Number(ttlEnv) : NaN
    const ttlSeconds = Number.isFinite(ttlSecondsParsed)
      ? ttlSecondsParsed
      : 30 * 24 * 60 * 60 // 默认30天

    if (ttlSeconds <= 0) {
      // 关闭过期：清除已有 TTL，保留历史
      try { await (redis as any).persist(redisKey) } catch (_) { /* Upstash 客户端支持 persist，忽略异常以兼容 */ }
    } else {
      await redis.expire(redisKey, Math.floor(ttlSeconds))
    }

    console.log(`[Charging Station API] ✅ Stored data for station ${stationId}`)

    return NextResponse.json({
      success: true,
      message: `Data stored for charging station ${stationId}`,
      timestamp: new Date(timestamp).toISOString()
    })

  } catch (error) {
    console.error('[Charging Station API] Error storing data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to store charging station data'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const redis = getRedis()
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    
    if (stationId) {
      // 获取单个充电桩数据
      const redisKey = `chargenode:${stationId}`
      const data = await redis.hgetall(redisKey)
      
      if (!data || Object.keys(data).length === 0) {
        return NextResponse.json({
          success: false,
          error: `No data found for charging station ${stationId}`
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: data
      })
    } else {
      // 获取所有充电桩数据
      const stationIds = await redis.smembers('chargenode:list')
      const allData: any[] = []
      
      for (const id of stationIds) {
        const redisKey = `chargenode:${id}`
        const data = await redis.hgetall(redisKey)
        if (data && Object.keys(data).length > 0) {
          allData.push(data)
        }
      }

      return NextResponse.json({
        success: true,
        data: allData,
        count: allData.length
      })
    }

  } catch (error) {
    console.error('[Charging Station API] Error retrieving data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve charging station data'
    }, { status: 500 })
  }
}
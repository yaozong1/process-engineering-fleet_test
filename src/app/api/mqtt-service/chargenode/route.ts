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
    
    // 存储到Redis
    const redisKey = `chargenode:${stationId}`
    const chargeNodeData: Record<string, string | number> = {
      stationId,
      ts: timestamp,
      status: data.status || "offline",
      lastUpdate: new Date(timestamp).toISOString()
    }
    
    // 只添加非null值
    if (data.voltage !== null && data.voltage !== undefined) chargeNodeData.voltage = data.voltage
    if (data.current !== null && data.current !== undefined) chargeNodeData.current = data.current
    if (data.power !== null && data.power !== undefined) chargeNodeData.power = data.power
    if (data.energy !== null && data.energy !== undefined) chargeNodeData.energy = data.energy
    if (data.remainingTime !== null && data.remainingTime !== undefined) chargeNodeData.remainingTime = data.remainingTime
    if (data.temperature !== null && data.temperature !== undefined) chargeNodeData.temperature = data.temperature
    if (data.connectorType) chargeNodeData.connectorType = data.connectorType
    if (data.maxPower !== null && data.maxPower !== undefined) chargeNodeData.maxPower = data.maxPower
    if (data.location) chargeNodeData.location = data.location
    if (data.faultCode) chargeNodeData.faultCode = data.faultCode
    if (data.faultMessage) chargeNodeData.faultMessage = data.faultMessage

    // 存储最新数据
    await redis.hset(redisKey, chargeNodeData)
    
    // 设置过期时间为24小时
    await redis.expire(redisKey, 24 * 60 * 60)
    
    // 添加到充电桩列表
    await redis.sadd('chargenode:list', stationId)
    await redis.expire('chargenode:list', 24 * 60 * 60)
    
    // 存储历史数据（可选，用于趋势分析）
    const historyKey = `chargenode:history:${stationId}`
    const historyData = {
      ts: timestamp,
      status: data.status,
      voltage: data.voltage,
      current: data.current,
      power: data.power,
      temperature: data.temperature
    }
    
    // 使用有序集合存储历史数据，以时间戳为分数
    await redis.zadd(historyKey, { score: timestamp, member: JSON.stringify(historyData) })
    
    // 保留最近24小时的历史数据
    const oneDayAgo = timestamp - (24 * 60 * 60 * 1000)
    await redis.zremrangebyscore(historyKey, 0, oneDayAgo)
    await redis.expire(historyKey, 25 * 60 * 60) // 25小时过期

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
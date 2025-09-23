/**
 * Charging Station Data Retrieval API
 * 供前端获取充电桩数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const redis = getRedis()
    
    // 获取所有充电桩ID
    const stationIds = await redis.smembers('chargenode:list')
    
    if (!stationIds || stationIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0
      })
    }

    const chargeStations: any[] = []
    
    for (const stationId of stationIds) {
      const redisKey = `chargenode:${stationId}`
      const data = await redis.hgetall(redisKey)
      
      if (data && Object.keys(data).length > 0) {
        // 转换数据类型
        const stationData = {
          stationId: data.stationId,
          ts: parseInt(data.ts as string) || Date.now(),
          status: data.status || "offline",
          voltage: data.voltage ? parseFloat(data.voltage as string) : null,
          current: data.current ? parseFloat(data.current as string) : null,
          power: data.power ? parseFloat(data.power as string) : null,
          energy: data.energy ? parseFloat(data.energy as string) : null,
          remainingTime: data.remainingTime ? parseInt(data.remainingTime as string) : null,
          temperature: data.temperature ? parseFloat(data.temperature as string) : null,
          connectorType: data.connectorType || null,
          maxPower: data.maxPower ? parseFloat(data.maxPower as string) : null,
          location: data.location || null,
          faultCode: data.faultCode || null,
          faultMessage: data.faultMessage || null,
          lastUpdate: data.lastUpdate || new Date().toISOString()
        }
        
        chargeStations.push(stationData)
      }
    }

    // 按状态和更新时间排序
    chargeStations.sort((a, b) => {
      // 在线状态优先
      const statusPriority = { 'charging': 0, 'idle': 1, 'occupied': 2, 'fault': 3, 'offline': 4 }
      const aPriority = statusPriority[a.status as keyof typeof statusPriority] ?? 5
      const bPriority = statusPriority[b.status as keyof typeof statusPriority] ?? 5
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      // 相同状态按更新时间排序（最新的在前）
      return b.ts - a.ts
    })

    return NextResponse.json({
      success: true,
      data: chargeStations,
      count: chargeStations.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Charging Station API] Error retrieving data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve charging station data'
    }, { status: 500 })
  }
}
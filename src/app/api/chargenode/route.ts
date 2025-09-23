/**
 * Charging Station Data Retrieval API
 * 供前端获取充电桩数据
 * 使用与telemetry相同的单一Redis键存储方式
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const redis = getRedis()
    const url = new URL(request.url)
    const stationId = url.searchParams.get('stationId')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    if (stationId) {
      // 获取特定充电桩的数据
      const redisKey = `telemetry:chargenode:${stationId}`
      const rawData = await redis.lrange(redisKey, 0, limit - 1)
      
      if (!rawData || rawData.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            stationId,
            data: [],
            lastUpdate: null,
            count: 0
          }
        })
      }

      const data = rawData.map(item => {
        // Upstash Redis already returns parsed objects, not JSON strings
        // If it's already an object, use it directly
        if (typeof item === 'object' && item !== null) {
          return item
        }
        
        // If it's a string, try to parse it
        if (typeof item === 'string') {
          try {
            return JSON.parse(item)
          } catch (e) {
            console.error('Error parsing charging station data:', e)
            return null
          }
        }
        
        return null
      }).filter(Boolean)

      const latestData = data[0] // 最新数据在数组开头

      // 检查特定充电桩是否超时
      const now = Date.now()
      const lastUpdate = latestData?.ts || 0
      const isOffline = (now - lastUpdate) > 300000 // 5分钟 = 300000毫秒
      
      // 如果超时，更新最新数据的状态
      const processedLatestData = latestData ? {
        ...latestData,
        status: isOffline ? 'offline' : latestData.status,
        isTimeout: isOffline
      } : null

      return NextResponse.json({
        success: true,
        data: {
          stationId,
          latest: processedLatestData,
          history: data,
          lastUpdate: latestData?.ts ? new Date(latestData.ts).toISOString() : null,
          count: data.length,
          isTimeout: isOffline
        }
      })
    } else {
      // 获取所有充电桩的最新数据
      // 扫描所有充电桩相关的key
      const pattern = 'telemetry:chargenode:*'
      const keys = await redis.keys(pattern)
      
      const stationsList = keys.map(key => key.replace('telemetry:chargenode:', ''))
      
      const stationsData = await Promise.all(
        stationsList.map(async (id) => {
          try {
            const redisKey = `telemetry:chargenode:${id}`
            const rawData = await redis.lrange(redisKey, 0, 0) // 只获取最新数据
            
            if (rawData && rawData.length > 0) {
              // Upstash Redis already returns parsed objects, not JSON strings
              let latestData
              if (typeof rawData[0] === 'object' && rawData[0] !== null) {
                latestData = rawData[0]
              } else if (typeof rawData[0] === 'string') {
                try {
                  latestData = JSON.parse(rawData[0])
                } catch (e) {
                  console.error('Error parsing charging station data:', e)
                  return null
                }
              } else {
                return null
              }

              // 检查超时 - 5分钟内无数据则标记为离线
              const now = Date.now()
              const lastUpdate = latestData.ts || 0
              const isOffline = (now - lastUpdate) > 300000 // 5分钟 = 300000毫秒
              
              return {
                stationId: id,
                ...latestData,
                status: isOffline ? 'offline' : latestData.status, // 超时则强制设为离线
                lastUpdate: latestData.ts ? new Date(latestData.ts).toISOString() : null,
                isTimeout: isOffline // 添加超时标志
              }
            }
            return null
          } catch (e) {
            console.error(`Error fetching data for station ${id}:`, e)
            return null
          }
        })
      )

      const validStations = stationsData.filter(Boolean)

      // 按状态和更新时间排序
      validStations.sort((a, b) => {
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
        data: validStations,
        count: validStations.length,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('[Charging Station API] Error fetching data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch charging station data'
    }, { status: 500 })
  }
}
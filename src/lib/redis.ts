/**
 * Redis客户端工具
 * 用于连接和操作Upstash Redis数据库
 */

import { Redis } from '@upstash/redis'

// Redis客户端实例
let redis: Redis | null = null

/**
 * 获取Redis客户端实例
 */
export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redis
}

/**
 * 存储设备遥测数据到Redis
 */
export async function storeTelemetryData(deviceId: string, data: any): Promise<void> {
  const redis = getRedis()
  const key = `telemetry:${deviceId}`
  
  // 使用LPUSH添加到列表头部（最新数据在前）
  await redis.lpush(key, JSON.stringify(data))
  
  // 限制列表长度，保留最近200条记录
  await redis.ltrim(key, 0, 199)
}

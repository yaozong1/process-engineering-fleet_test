import { Redis } from '@upstash/redis'

// Lazy singleton to avoid multiple instantiations in dev hot reload
let redis: Redis | null = null

export function getRedis() {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) {
      throw new Error('Redis env missing: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
    }
    redis = new Redis({ url, token })
  }
  return redis
}

export interface StoredTelemetry {
  device: string
  ts: number // epoch ms
  soc?: number
  voltage?: number
  temperature?: number
  health?: number
  cycleCount?: number
  estimatedRangeKm?: number
  chargingStatus?: string
  alerts?: string[]
  raw?: any
}

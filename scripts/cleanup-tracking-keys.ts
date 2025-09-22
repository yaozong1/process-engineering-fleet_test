import { getRedis } from '@/lib/redis'

async function main() {
  const redis = getRedis() as any
  const devicesEnv = process.env.CLEAN_DEVICES // comma-separated, e.g. "PE-001,PE-002"
  const devices = devicesEnv ? devicesEnv.split(',').map(s => s.trim()).filter(Boolean) : []
  if (!devices.length) {
    console.log('Set CLEAN_DEVICES env, e.g. CLEAN_DEVICES=PE-001,PE-002')
    return
  }
  for (const d of devices) {
    const keys = [
      `gps:last:${d}`,
      `tracking:${d}:latest`,
      `tracking:${d}:history`,
    ]
    for (const k of keys) {
      try {
        const res = await redis.del(k)
        console.log('DEL', k, '=>', res)
      } catch (e) {
        console.warn('Failed DEL', k, e)
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

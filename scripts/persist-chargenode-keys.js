// Remove TTL (PERSIST) for telemetry:chargenode:* keys
// Usage:
//   node scripts/persist-chargenode-keys.js
//   STATIONS=PN-001,PN-002 node scripts/persist-chargenode-keys.js

const { Redis } = require('@upstash/redis')

async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env')
    process.exit(1)
  }

  const redis = new Redis({ url, token })

  // Optional: target stations via env
  const stationsEnv = process.env.STATIONS
  let keys = []
  if (stationsEnv) {
    const ids = stationsEnv.split(',').map(s => s.trim()).filter(Boolean)
    keys = ids.map(id => `telemetry:chargenode:${id}`)
  } else {
    keys = await redis.keys('telemetry:chargenode:*')
  }

  if (!keys.length) {
    console.log('No telemetry:chargenode keys found.')
    return
  }

  console.log('Found keys:', keys.length)
  for (const k of keys) {
    try {
      const res = await redis.persist(k)
      const ttl = await redis.ttl(k)
      console.log('PERSIST', k, '=>', res, 'TTL:', ttl)
    } catch (e) {
      console.warn('Failed PERSIST', k, e?.message || e)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

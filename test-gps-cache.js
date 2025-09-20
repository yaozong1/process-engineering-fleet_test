// Quick test for GPS cache fallback
// 1) POST a telemetry with GPS
// 2) POST a telemetry without GPS
// 3) GET latest should fallback to cached GPS

async function main() {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  const device = process.env.DEVICE || 'PE-TEST-CACHE'

  const post = async (body) => {
    const res = await fetch(`${base}/api/telemetry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ device, ts: Date.now(), soc: 50, ...body })
    })
    const json = await res.json()
    console.log('POST =>', json)
  }

  const getLatest = async () => {
    const res = await fetch(`${base}/api/telemetry?device=${encodeURIComponent(device)}&latest=1`)
    const json = await res.json()
    console.log('GET latest =>', JSON.stringify(json, null, 2))
    return json
  }

  // Step 1: with GPS
  await post({ gps: { lat: 39.9042, lng: 116.4074, speed: 0 } })
  await new Promise(r => setTimeout(r, 500))

  // Step 2: without GPS
  await post({})
  await new Promise(r => setTimeout(r, 500))

  // Step 3: get latest should include cached gps
  const latest = await getLatest()
  const hasGps = !!latest?.latest?.gps?.lat && !!latest?.latest?.gps?.lng
  console.log('Has GPS after fallback:', hasGps, 'gpsFromCache:', latest?.latest?.gpsFromCache)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

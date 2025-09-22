// Simple E2E test: telemetry-only write, tracking latest read via fallback
const base = process.env.BASE_URL || 'http://localhost:3003'
const device = process.env.DEVICE || 'PE-TEST-FALLBACK-2'

async function main() {
  const postTelemetry = async () => {
    const body = {
      device,
      ts: Date.now(),
      soc: 61,
      gps: { lat: 22.5431, lng: 114.0579, speed: 0 },
    }
    const res = await fetch(`${base}/api/telemetry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    console.log('POST telemetry =>', json)
  }

  const getTrackingLatest = async () => {
    const res = await fetch(`${base}/api/tracking?device=${encodeURIComponent(device)}&type=latest`)
    const json = await res.json()
    console.log('GET tracking latest =>', JSON.stringify(json, null, 2))
    return json
  }

  await postTelemetry()
  await new Promise(r => setTimeout(r, 400))
  const latest = await getTrackingLatest()
  const ok = latest && latest.point && typeof latest.point.lat === 'number' && typeof latest.point.lng === 'number'
  console.log('Tracking latest has GPS:', ok)
}

main().catch(err => { console.error(err); process.exit(1) })

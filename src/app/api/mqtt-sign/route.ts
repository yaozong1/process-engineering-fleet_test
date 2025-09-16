import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

// POST or GET both allowed for simplicity
export async function GET(req: NextRequest) {
  return handle(req)
}
export async function POST(req: NextRequest) {
  return handle(req)
}

function handle(req: NextRequest) {
  const search = req.nextUrl.searchParams
  const productKey = process.env.NEXT_PUBLIC_MQTT_PRODUCT_KEY || ''
  const deviceName = process.env.NEXT_PUBLIC_MQTT_DEVICE_NAME || ''
  const deviceSecret = process.env.ALIYUN_DEVICE_SECRET || ''
  if (!productKey || !deviceName || !deviceSecret) {
    return NextResponse.json({ error: 'missing productKey/deviceName/deviceSecret' }, { status: 400 })
  }
  const ts = Date.now().toString()
  const clientId = `${productKey}.${deviceName}|securemode=2,signmethod=hmacsha256,timestamp=${ts}|`
  // Content string per Aliyun spec (order matters): clientId + deviceName + productKey + timestamp
  const content = `clientId${productKey}.${deviceName}deviceName${deviceName}productKey${productKey}timestamp${ts}`
  const hmac = crypto.createHmac('sha256', deviceSecret)
  hmac.update(content)
  const password = hmac.digest('hex')
  const username = `${deviceName}&${productKey}`
  return NextResponse.json({ clientId, username, password, timestamp: ts })
}

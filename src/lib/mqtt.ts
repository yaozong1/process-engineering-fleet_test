// Basic Aliyun MQTT config utilities
// Browser must use WSS (port 443 or 8443). Raw 1883 TCP only works in native clients like MQTT.fx.
// You provided:
// Host (instance): iot-06z00a18ae93m7j.mqtt.iothub.aliyuncs.com
// Username: PE-001&i0skgstk2Ek
// ClientId: i0skgstk2Ek.PE-001|securemode=2,signmethod=hmacsha256,timestamp=<ts>|
// Password (HMAC-SHA256 of content string). Keep secret.

export interface MQTTBatteryData {
  vehicleId: string
  voltage: number
  current: number
  temperature: number
  soc: number
  timestamp: number
}

export const mqttEnv = {
  host: process.env.NEXT_PUBLIC_MQTT_HOST || '',
  username: process.env.NEXT_PUBLIC_MQTT_USERNAME || '',
  password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || '',
  staticClientId: process.env.NEXT_PUBLIC_MQTT_STATIC_CLIENT_ID || '',
  productKey: process.env.NEXT_PUBLIC_MQTT_PRODUCT_KEY || '',
  deviceName: process.env.NEXT_PUBLIC_MQTT_DEVICE_NAME || ''
}

export function buildClientId(): string {
  // Use static clientId exactly as provided to match pre-signed password.
  if (mqttEnv.staticClientId) return mqttEnv.staticClientId
  // Fallback dynamic build (will require matching dynamic password generation, not used in fixed scheme)
  return `${mqttEnv.productKey}.${mqttEnv.deviceName}|securemode=2,signmethod=hmacsha256,timestamp=${Date.now()}|`
}

export function wssUrl(): string {
  if (!mqttEnv.host) return ''
  // For instance domain we try standard wss path
  return `wss://${mqttEnv.host}/mqtt`
}

export function debugConfig() {
  return {
    host: mqttEnv.host,
    username: mqttEnv.username,
    hasPassword: !!mqttEnv.password,
    staticClientId: mqttEnv.staticClientId,
    productKey: mqttEnv.productKey,
    deviceName: mqttEnv.deviceName
  }
}

export function aliyunPropertyPostTopic(): string | '' {
  if (!mqttEnv.productKey || !mqttEnv.deviceName) return ''
  return `/sys/${mqttEnv.productKey}/${mqttEnv.deviceName}/thing/event/property/post`
}

export function parseAliyunPropertyPayload(topic: string, payload: any): MQTTBatteryData | null {
  const t = aliyunPropertyPostTopic()
  if (!t || topic !== t) return null
  const p = payload?.params || {}
  return {
    vehicleId: mqttEnv.deviceName || 'unknown',
    voltage: Number(p.voltage) || 0,
    current: Number(p.current) || 0,
    temperature: Number(p.temperature) || 0,
    soc: Number(p.soc) || 0,
    timestamp: payload.time || Date.now()
  }
}

export interface SignedCredentials {
  clientId: string
  username: string
  password: string
  timestamp: string
}

export async function fetchSignedCredentials(): Promise<SignedCredentials> {
  const res = await fetch('/api/mqtt-sign', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch signed credentials')
  return res.json()
}

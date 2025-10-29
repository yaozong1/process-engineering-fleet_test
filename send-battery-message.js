#!/usr/bin/env node

// 发送电池数据到主题 fleet/PE-00x/battery
// 优先使用 .env.local 中的 MY_PUBLIC_* 配置，回退到 NEXT_PUBLIC_*，不修改原有逻辑

require('dotenv').config({ path: '.env.local' })
const mqtt = require('mqtt')

const URL = process.env.MY_PUBLIC_MQTT_URL || process.env.NEXT_PUBLIC_MQTT_URL
const USERNAME = process.env.MY_PUBLIC_MQTT_USERNAME || process.env.NEXT_PUBLIC_MQTT_USERNAME
const PASSWORD = process.env.MY_PUBLIC_MQTT_PASSWORD || process.env.NEXT_PUBLIC_MQTT_PASSWORD

if (!URL) {
  console.error('[battery-sender] ❌ MQTT URL 未配置。请在 .env.local 中设置 MY_PUBLIC_MQTT_URL 或 NEXT_PUBLIC_MQTT_URL')
  process.exit(1)
}

// 默认负载（可按需修改 device/ts 等字段）
const payload = {
  device: 'PE-002',
  ts: 1758616069567,
  soc: 36,
  voltage: 12.05,
  temperature: 31.4,
  health: 96,
  cycleCount: 182,
  estimatedRangeKm: 120.5,
  chargingStatus: 'discharging',
  alerts: [],
  gps: {
    lat: 22.722924,
    lng: 114.21307,
    speed: 36.5,
    heading: 245,
    altitude: 12.3,
    accuracy: 5
  }
}

const topic = `fleet/${payload.device}/battery`

console.log('[battery-sender] MQTT URL:', URL)
console.log('[battery-sender] 使用主题:', topic)
console.log('[battery-sender] 发送负载示例:', JSON.stringify(payload, null, 2))

const client = mqtt.connect(URL, {
  username: USERNAME,
  password: PASSWORD,
  clean: true,
  protocolVersion: 4,
  keepalive: 60,
  reconnectPeriod: 0
})

client.on('connect', () => {
  console.log('[battery-sender] ✅ 已连接到 broker，准备发布...')
  // 固定 chargingStatus 为 'discharging'（即使上面有人改动 payload 也会在发布前强制一致）
  payload.chargingStatus = 'discharging'
  client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) {
      console.error('[battery-sender] ❌ 发布失败:', err)
    } else {
      console.log('[battery-sender] 🚀 发布成功!')
    }
    client.end(true)
  })
})

client.on('error', (e) => {
  console.error('[battery-sender] ❌ 连接错误:', e?.message || e)
})

client.on('close', () => {
  console.log('[battery-sender] 🔌 连接已关闭')
})

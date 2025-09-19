// MQTT 测试脚本 - 用于测试去重功能
require('dotenv').config({ path: '.env.local' })
const mqtt = require('mqtt')

const MQTT_URL = process.env.NEXT_PUBLIC_MQTT_URL
const MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME
const MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD

console.log('Testing MQTT duplicate detection...')
console.log('MQTT URL:', MQTT_URL ? 'configured' : 'missing')
console.log('Username:', MQTT_USERNAME ? 'configured' : 'missing')
console.log('Password:', MQTT_PASSWORD ? 'configured' : 'missing')

const client = mqtt.connect(MQTT_URL, {
  clientId: `test_duplicate_${Math.random().toString(36).slice(2, 10)}`,
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clean: true,
  reconnectPeriod: 5000,
  protocolVersion: 4,
  keepalive: 60
})

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker for testing')
  
  // 发送相同的消息 5 次，测试去重
  const testMessage = {
    soc: 75,
    voltage: 12.1,
    temperature: 25.5,
    health: 90,
    cycleCount: 1000,
    estimatedRangeKm: 150,
    chargingStatus: 'charging',
    alerts: ['Test message']
  }
  
  console.log('Sending 5 identical messages to test deduplication...')
  
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      client.publish('fleet/PE-TEST-DEDUP/battery', JSON.stringify(testMessage), { qos: 1 })
      console.log(`Sent message ${i + 1}/5`)
      
      if (i === 4) {
        console.log('All test messages sent. Check server logs for deduplication.')
        setTimeout(() => {
          client.end()
          process.exit(0)
        }, 2000)
      }
    }, i * 1000) // 每秒发送一次
  }
})

client.on('error', (error) => {
  console.error('MQTT error:', error)
  process.exit(1)
})
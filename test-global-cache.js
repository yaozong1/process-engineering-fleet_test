#!/usr/bin/env node

/**
 * 测试全局数据缓存功能 - 发送测试数据
 */
require('dotenv').config({ path: '.env.local' })

const correctTimestamp = Date.now()

console.log('=== 全局数据缓存测试 ===')
console.log(`当前时间戳: ${correctTimestamp}`)
console.log(`时间: ${new Date(correctTimestamp).toLocaleString()}`)

console.log('\n测试数据1: PE-001 更新电池和GPS信息')
console.log('请发送以下MQTT消息到 fleet/PE-001/battery:')
console.log(JSON.stringify({
  "soc": 85,
  "voltage": 12.3,
  "temperature": 28.2,
  "health": 95,
  "cycleCount": 1200,
  "estimatedRangeKm": 180,
  "chargingStatus": "discharging",
  "alerts": [],
  "gps": {
    "lat": 22.7968,
    "lng": 114.4610,
    "speed": 45.5,
    "heading": 180,
    "altitude": 15.2,
    "accuracy": 3
  },
  "ts": correctTimestamp
}, null, 2))

console.log('\n测试数据2: PE-002 更新电池信息（低电量）')
console.log('请发送以下MQTT消息到 fleet/PE-002/battery:')
console.log(JSON.stringify({
  "soc": 15,
  "voltage": 10.8,
  "temperature": 35.5,
  "health": 78,
  "cycleCount": 1800,
  "estimatedRangeKm": 25,
  "chargingStatus": "discharging",
  "alerts": ["Low battery", "High temperature"],
  "gps": {
    "lat": 22.7980,
    "lng": 114.4620,
    "speed": 12.3,
    "heading": 90,
    "altitude": 12.8,
    "accuracy": 5
  },
  "ts": correctTimestamp + 1000
}, null, 2))

console.log('\n测试数据3: PE-003 充电状态')
console.log('请发送以下MQTT消息到 fleet/PE-003/battery:')
console.log(JSON.stringify({
  "soc": 65,
  "voltage": 12.8,
  "temperature": 32.1,
  "health": 88,
  "cycleCount": 950,
  "estimatedRangeKm": 145,
  "chargingStatus": "charging",
  "alerts": [],
  "gps": {
    "lat": 22.7990,
    "lng": 114.4630,
    "speed": 0,
    "heading": 0,
    "altitude": 18.5,
    "accuracy": 2
  },
  "ts": correctTimestamp + 2000
}, null, 2))

console.log('\n=== 测试步骤 ===')
console.log('1. 打开Battery Monitor页面，观察当前数据')
console.log('2. 发送上述MQTT消息')
console.log('3. 观察Battery Monitor页面数据更新')
console.log('4. 切换到GPS Tracking页面')
console.log('5. 验证GPS页面显示相同的最新数据')
console.log('6. 反过来：在GPS页面等待新数据，然后切换到Battery页面验证')

console.log('\n预期结果:')
console.log('- 两个页面应该显示相同的实时数据')
console.log('- 页面切换时不需要重新加载数据')
console.log('- 数据更新应该实时同步到两个页面')
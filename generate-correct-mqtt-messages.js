/**
 * 生成带正确时间戳的MQTT测试消息
 */

// 正确的当前时间戳 (2024年而不是2025年)
const now = new Date()
now.setFullYear(2024) // 设置为2024年
const correctTimestamp = now.getTime()

console.log('=== Battery MQTT测试消息 (带正确时间戳) ===')
console.log(`当前系统时间显示: ${new Date().toLocaleString()}`)
console.log(`修正后的时间: ${new Date(correctTimestamp).toLocaleString()}`)
console.log(`修正后的时间戳: ${correctTimestamp}`)

console.log('\n请发送以下MQTT消息到 fleet/PE-001/battery:')
console.log(JSON.stringify({
  "soc": 75,
  "voltage": 12.1,
  "temperature": 28.5,
  "health": 88,
  "cycleCount": 1350,
  "estimatedRangeKm": 165,
  "chargingStatus": "discharging",
  "alerts": [],
  "ts": correctTimestamp
}, null, 2))

console.log('\n或者发送多条历史数据:')
for (let i = 0; i < 5; i++) {
  const historyTimestamp = correctTimestamp - (i * 60 * 1000) // 每分钟一条
  const soc = 75 + (Math.random() - 0.5) * 10 // 70-80之间波动
  
  console.log(`\n${i + 1}. 时间: ${new Date(historyTimestamp).toLocaleString()}`)
  console.log(JSON.stringify({
    "soc": Math.round(soc),
    "voltage": 12.1 + (soc - 75) * 0.02,
    "temperature": 28.5 + Math.random() * 2,
    "health": 88,
    "cycleCount": 1350,
    "estimatedRangeKm": Math.round(soc * 2.2),
    "chargingStatus": "discharging",
    "alerts": [],
    "ts": historyTimestamp
  }, null, 2))
}
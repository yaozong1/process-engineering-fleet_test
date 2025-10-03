/**
 * 充电桩数据生成和发送测试脚本
 * 模拟向 fleet/chargenode/PN-001 等主题发送充电桩数据
 */

const mqtt = require('mqtt')

// MQTT 配置 - 使用环境变量，与后端/前端保持一致
const MQTT_URL = process.env.MY_PUBLIC_MQTT_URL || process.env.NEXT_PUBLIC_MQTT_URL || 'ws://processengineeringsz.com:8083/mqtt'
const MQTT_USERNAME = process.env.MY_PUBLIC_MQTT_USERNAME || process.env.NEXT_PUBLIC_MQTT_USERNAME || ''
const MQTT_PASSWORD = process.env.MY_PUBLIC_MQTT_PASSWORD || process.env.NEXT_PUBLIC_MQTT_PASSWORD || ''

console.log('=== 充电桩数据测试脚本 ===')
console.log(`MQTT URL: ${MQTT_URL}`)
console.log(`Username: ${MQTT_USERNAME ? '已配置' : '未配置'}`)
console.log(`Password: ${MQTT_PASSWORD ? '已配置' : '未配置'}`)

// 充电桩列表
const chargingStations = ['PN-001', 'PN-002', 'PN-003', 'PN-004']

// 状态列表
const statuses = ['idle', 'charging', 'fault', 'offline', 'occupied']

// 连接器类型
const connectorTypes = ['CCS2', 'CHAdeMO', 'Type2', 'GB/T']

// 生成随机充电桩数据
function generateChargingStationData(stationId) {
  const status = statuses[Math.floor(Math.random() * statuses.length)]
  
  let voltage = null
  let current = null
  let power = null
  let energy = null
  let remainingTime = null
  let temperature = 20 + Math.random() * 40 // 20-60°C
  
  if (status === 'charging') {
    voltage = 380 + Math.random() * 40 // 380-420V
    current = 50 + Math.random() * 100 // 50-150A
    power = (voltage * current) / 1000 // kW
    energy = Math.random() * 50 // 0-50 kWh
    remainingTime = Math.floor(Math.random() * 120) // 0-120 minutes
  } else if (status === 'idle') {
    voltage = 380 + Math.random() * 40
    current = 0
    power = 0
  } else if (status === 'fault') {
    voltage = Math.random() > 0.5 ? (380 + Math.random() * 40) : null
    current = 0
    power = 0
    temperature = 60 + Math.random() * 20 // 高温故障
  }
  
  return {
    ts: Date.now(),
    status: status,
    voltage: voltage ? parseFloat(voltage.toFixed(1)) : null,
    current: current ? parseFloat(current.toFixed(1)) : null,
    power: power ? parseFloat(power.toFixed(1)) : null,
    energy: energy ? parseFloat(energy.toFixed(1)) : null,
    remainingTime: remainingTime,
    temperature: parseFloat(temperature.toFixed(1)),
    connectorType: connectorTypes[Math.floor(Math.random() * connectorTypes.length)],
    maxPower: 150, // 150kW 最大功率
    location: `停车位 ${stationId.split('-')[1]}`,
    faultCode: status === 'fault' ? 'E001' : null,
    faultMessage: status === 'fault' ? '温度过高' : null
  }
}

// 连接到MQTT
const client = mqtt.connect(MQTT_URL, {
  clientId: `chargenode_test_${Math.random().toString(36).slice(2, 10)}`,
  username: MQTT_USERNAME || undefined,
  password: MQTT_PASSWORD || undefined,
  clean: true,
  reconnectPeriod: 5000,
  protocolVersion: 4,
  keepalive: 60
})

client.on('connect', () => {
  console.log('✅ 已连接到MQTT服务器')
  
  // 立即发送一次数据
  sendAllStationData()
  
  // 每30秒发送一次数据
  setInterval(sendAllStationData, 30000)
  
  console.log('📡 开始发送充电桩数据，每30秒更新一次...')
})

client.on('error', (error) => {
  console.error('❌ MQTT连接错误:', error)
  process.exit(1)
})

client.on('close', () => {
  console.log('🔌 MQTT连接已关闭')
})

function sendAllStationData() {
  chargingStations.forEach(stationId => {
    const data = generateChargingStationData(stationId)
    const topic = `fleet/chargenode/${stationId}`
    const payload = JSON.stringify(data)
    
    client.publish(topic, payload, (err) => {
      if (err) {
        console.error(`❌ 发送失败 ${topic}:`, err)
      } else {
        console.log(`📤 发送成功 ${topic}: status=${data.status}, power=${data.power}kW`)
      }
    })
  })
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n📤 正在断开MQTT连接...')
  client.end(true)
  process.exit(0)
})

console.log('按 Ctrl+C 停止测试脚本')
/**
 * Backend MQTT Service
 * 独立运行的MQTT客户端，持续接收数据并存储到Redis
 * 不依赖用户登录或前端页面状态
 */

import mqtt, { MqttClient } from 'mqtt'

class MQTTService {
  private client: MqttClient | null = null
  private isRunning = false
  private reconnectInterval: NodeJS.Timeout | null = null
  private retryInterval: NodeJS.Timeout | null = null
  private recentLogs: string[] = []
  
  // 防重复数据机制：记录每个设备最近的数据
  private lastDataMap = new Map<string, {
    soc: number
    voltage: number
    temperature: number
    timestamp: number
  }>()

  // MQTT配置
  private readonly MQTT_URL = process.env.NEXT_PUBLIC_MQTT_URL || 'mqtt://broker.emqx.io:1883'
  private readonly MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME || ''
  private readonly MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD || ''
  
  // 订阅主题
  private readonly BATTERY_TOPICS = ['fleet/+/battery']
  private readonly STATUS_TOPICS = ['fleet/+/status']

  constructor() {
    this.log('Initializing backend MQTT service...')
  }

  private log(message: string): void {
    const logEntry = `[${new Date().toISOString()}] ${message}`
    console.log(`[MQTT Service] ${message}`)
    this.recentLogs.push(logEntry)
    if (this.recentLogs.length > 50) {
      this.recentLogs.shift() // 保持最近50条日志
    }
  }

  public getRecentLogs(): string[] {
    return [...this.recentLogs]
  }

  /**
   * 检查数据是否为重复数据（防止相同数据连续写入）
   */
  private isDuplicateData(deviceId: string, soc: number, voltage: number, temperature: number): boolean {
    const lastData = this.lastDataMap.get(deviceId)
    const now = Date.now()
    
    if (!lastData) {
      // 没有历史数据，不是重复
      this.lastDataMap.set(deviceId, { soc, voltage, temperature, timestamp: now })
      return false
    }
    
    // 检查是否为相同数据且时间间隔很短（30秒内）
    const timeDiff = now - lastData.timestamp
    const isSameData = Math.abs(lastData.soc - soc) < 0.1 && 
                      Math.abs(lastData.voltage - voltage) < 0.01 && 
                      Math.abs(lastData.temperature - temperature) < 0.1
    
    if (isSameData && timeDiff < 30000) { // 30秒内的相同数据视为重复
      this.log(`🔄 检测到设备 ${deviceId} 的重复数据，跳过存储 (SOC: ${soc}%, 电压: ${voltage}V, 温度: ${temperature}°C)`)
      return true
    }
    
    // 更新最新数据记录
    this.lastDataMap.set(deviceId, { soc, voltage, temperature, timestamp: now })
    return false
  }

  /**
   * 启动MQTT服务
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.log('Service already running')
      return
    }

    if (!this.MQTT_URL) {
      this.log('MQTT_URL not configured, cannot start service')
      return
    }

    this.log('Starting MQTT service...')
    this.log(`MQTT Config: url=${this.MQTT_URL ? 'configured' : 'missing'}, username=${this.MQTT_USERNAME ? 'configured' : 'missing'}`)

    await this.connect()
    
    // 启动定期重试失败数据的定时器 (每30秒)
    if (!this.retryInterval) {
      this.retryInterval = setInterval(() => {
        this.retryFailedData()
      }, 30000)
    }
  }

  /**
   * 停止MQTT服务
   */
  public async stop(): Promise<void> {
    console.log('[MQTT Service] Stopping MQTT service...')
    this.isRunning = false

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval)
      this.reconnectInterval = null
    }

    if (this.retryInterval) {
      clearInterval(this.retryInterval)
      this.retryInterval = null
    }

    if (this.client) {
      this.client.end(true)
      this.client = null
    }

    console.log('[MQTT Service] MQTT service stopped')
  }

  /**
   * 连接到MQTT Broker
   */
  private async connect(): Promise<void> {
    try {
      this.log(`Attempting to connect to: ${this.MQTT_URL}`)
      this.client = mqtt.connect(this.MQTT_URL, {
        clientId: `backend_service_${Math.random().toString(36).slice(2, 10)}`,
        username: this.MQTT_USERNAME || undefined,
        password: this.MQTT_PASSWORD || undefined,
        clean: true,
        reconnectPeriod: 5000,
        protocolVersion: 4,
        keepalive: 60
      })

      this.client.on('connect', () => {
        this.log('✅ Connected to MQTT broker')
        this.isRunning = true
        this.subscribeToTopics()
      })

      this.client.on('message', (topic: string, payload: Buffer) => {
        this.log(`📨 Received message on topic: ${topic}`)
        this.handleMessage(topic, payload)
      })

      this.client.on('error', (error) => {
        console.error('[MQTT Service] ❌ MQTT connection error:', error)
        this.scheduleReconnect()
      })

      this.client.on('close', () => {
        console.log('[MQTT Service] 🔌 MQTT connection closed')
        if (this.isRunning) {
          this.scheduleReconnect()
        }
      })

      this.client.on('offline', () => {
        console.log('[MQTT Service] 📴 MQTT client offline')
      })

      this.client.on('reconnect', () => {
        console.log('[MQTT Service] 🔄 Attempting to reconnect to MQTT broker')
      })

    } catch (error) {
      console.error('[MQTT Service] Failed to create MQTT client:', error)
      this.scheduleReconnect()
    }
  }

  /**
   * 订阅相关主题
   */
  private subscribeToTopics(): void {
    if (!this.client) return

    const allTopics = [...this.BATTERY_TOPICS, ...this.STATUS_TOPICS]
    
    allTopics.forEach(topic => {
      this.client!.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT Service] ❌ Failed to subscribe to ${topic}:`, err)
        } else {
          console.log(`[MQTT Service] ✅ Subscribed to ${topic}`)
        }
      })
    })
  }

  /**
   * 处理接收到的MQTT消息
   */
  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const topicParts = topic.split('/')
      if (topicParts.length !== 3 || topicParts[0] !== 'fleet') {
        console.warn('[MQTT Service] Invalid topic format:', topic)
        return
      }

      const deviceId = topicParts[1] // PE-001, PE-002, etc.
      const messageType = topicParts[2] // battery, status

      console.log(`[MQTT Service] 📨 Received message: ${topic} from ${deviceId}`)

      if (messageType === 'battery') {
        await this.handleBatteryMessage(deviceId, payload)
      } else if (messageType === 'status') {
        await this.handleStatusMessage(deviceId, payload)
      } else {
        console.warn('[MQTT Service] Unknown message type:', messageType)
      }

    } catch (error) {
      console.error('[MQTT Service] Error handling message:', error)
    }
  }

  /**
   * 处理电池数据消息
   */
  private async handleBatteryMessage(deviceId: string, payload: Buffer): Promise<void> {
    try {
      const rawMessage = payload.toString()
      this.log(`📨 Raw message from ${deviceId}: ${rawMessage.substring(0, 100)}...`)
      
      let data
      try {
        data = JSON.parse(rawMessage)
      } catch (jsonError) {
        this.log(`⚠️ JSON parse failed for ${deviceId}, attempting to fix...`)
        
        // 尝试修复常见的JSON问题
        let fixedMessage = rawMessage
          // 修复没有引号的字符串值
          .replace(/:\s*([a-zA-Z_][a-zA-Z0-9_\s]*)\s*([,\]}])/g, ': "$1"$2')
          // 修复数组中没有引号的字符串 (单个元素)
          .replace(/\[\s*([a-zA-Z_][a-zA-Z0-9_\s]*)\s*\]/g, '["$1"]')
          // 修复数组中没有引号的字符串 (多个元素)
          .replace(/\[\s*([a-zA-Z_][a-zA-Z0-9_\s]*)\s*,\s*([a-zA-Z_][a-zA-Z0-9_\s]*)\s*\]/g, '["$1", "$2"]')
          // 修复像 [Low battery] 这样的数组元素
          .replace(/\[\s*([a-zA-Z][a-zA-Z0-9\s]*[a-zA-Z0-9])\s*\]/g, '["$1"]')
          // 修复数组中的多个无引号元素，如 [Low battery, High temp]
          .replace(/\[\s*([a-zA-Z][a-zA-Z0-9\s]*[a-zA-Z0-9])\s*,\s*([a-zA-Z][a-zA-Z0-9\s]*[a-zA-Z0-9])\s*\]/g, '["$1", "$2"]')
        
        this.log(`🔧 Attempting to fix JSON: ${fixedMessage.substring(0, 100)}...`)
        
        try {
          data = JSON.parse(fixedMessage)
          this.log(`✅ JSON repair successful for ${deviceId}`)
        } catch (repairError) {
          this.log(`❌ JSON repair failed for ${deviceId}: ${repairError}`)
          this.log(`❌ Original message: ${rawMessage}`)
          this.log(`❌ Fixed attempt: ${fixedMessage}`)
          
          // 创建一个默认的数据结构，不在UI中显示错误
          data = {
            soc: null,
            voltage: null,
            temperature: null,
            health: null,
            cycleCount: null,
            estimatedRangeKm: null,
            chargingStatus: 'unknown',
            alerts: [] as string[] // 明确指定类型为字符串数组
          }
          
          // 可选：只在开发环境显示错误，生产环境不显示
          if (process.env.NODE_ENV === 'development') {
            (data as any).alerts = ['Message format error (dev)']
          }
        }
      }

      this.log(`🔋 Battery data from ${deviceId}: SOC=${data.soc}%`)

      // 数据有效性检查
      const soc = typeof data.soc === 'number' ? data.soc : null
      const voltage = typeof data.voltage === 'number' ? data.voltage : null
      const temperature = typeof data.temperature === 'number' ? data.temperature : null
      
      // 检查是否为重复数据（只有当所有关键数据都有效时才检查）
      if (soc !== null && voltage !== null && temperature !== null) {
        if (this.isDuplicateData(deviceId, soc, voltage, temperature)) {
          this.log(`⏭️ 跳过设备 ${deviceId} 的重复数据存储`)
          return // 跳过重复数据的存储
        }
      }

      // 准备存储到Redis的数据
      const telemetryData = {
        device: deviceId,
        ts: Date.now(),
        soc,
        voltage,
        temperature,
        health: typeof data.health === 'number' ? data.health : null,
        cycleCount: typeof data.cycleCount === 'number' ? data.cycleCount : null,
        estimatedRangeKm: typeof data.estimatedRangeKm === 'number' ? data.estimatedRangeKm : null,
        chargingStatus: typeof data.chargingStatus === 'string' ? data.chargingStatus : null,
        alerts: Array.isArray(data.alerts) ? data.alerts : []
      }

      // 带重试机制的API调用
      await this.storeDataWithRetry(telemetryData)
      this.log(`✅ 存储设备 ${deviceId} 的新数据到Redis (SOC: ${soc}%, 电压: ${voltage}V, 温度: ${temperature}°C)`)

    } catch (error) {
      this.log(`❌ Error processing battery message from ${deviceId}: ${error}`)
    }
  }

  /**
   * 带重试机制的数据存储
   */
  private async storeDataWithRetry(data: any, maxRetries: number = 5): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒超时

        const response = await fetch('http://localhost:3000/api/telemetry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          return // 成功，退出重试循环
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          this.log(`❌ Failed to store data after ${maxRetries} attempts: ${error}`)
          // 将失败的数据保存到内存缓存，稍后重试
          this.addToFailedQueue(data)
          return // 不抛出错误，避免崩溃
        }
        // 指数退避延迟
        const delay = Math.min(1000 * Math.pow(2, i), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  private failedDataQueue: any[] = []

  /**
   * 添加失败的数据到队列
   */
  private addToFailedQueue(data: any): void {
    this.failedDataQueue.push({
      ...data,
      retryCount: 0,
      lastAttempt: Date.now()
    })
    
    // 限制队列大小
    if (this.failedDataQueue.length > 100) {
      this.failedDataQueue.shift()
    }
  }

  /**
   * 重试失败的数据
   */
  private async retryFailedData(): Promise<void> {
    if (this.failedDataQueue.length === 0) return

    this.log(`🔄 Retrying ${this.failedDataQueue.length} failed data items...`)
    
    const itemsToRetry = [...this.failedDataQueue]
    this.failedDataQueue = []

    for (const item of itemsToRetry) {
      if (item.retryCount < 3) {
        item.retryCount++
        await this.storeDataWithRetry(item, 1) // 单次重试
      }
    }
  }

  /**
   * 处理状态消息
   */
  private async handleStatusMessage(deviceId: string, payload: Buffer): Promise<void> {
    try {
      const status = payload.toString().trim().toLowerCase()
      console.log(`[MQTT Service] 📡 Status from ${deviceId}: ${status}`)

      // 这里可以根据需要处理状态信息，比如更新设备在线状态等
      // 目前只记录日志

    } catch (error) {
      console.error(`[MQTT Service] Error processing status message from ${deviceId}:`, error)
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectInterval) return

    console.log('[MQTT Service] ⏰ Scheduling reconnection in 10 seconds...')
    this.reconnectInterval = setTimeout(() => {
      this.reconnectInterval = null
      if (this.isRunning) {
        console.log('[MQTT Service] 🔄 Attempting to reconnect...')
        this.connect()
      }
    }, 10000)
  }

  /**
   * 获取服务状态
   */
  public getStatus(): { running: boolean; connected: boolean } {
    return {
      running: this.isRunning,
      connected: this.client?.connected || false
    }
  }
}

// 单例实例
export const mqttService = new MQTTService()

// 自动启动服务（在服务器启动时）
if (typeof window === 'undefined') {
  // 只在服务器端启动
  mqttService.start().catch(console.error)
}

export default mqttService
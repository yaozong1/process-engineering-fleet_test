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
  private recentLogs: string[] = []

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
      const data = JSON.parse(payload.toString())
      console.log(`[MQTT Service] 🔋 Battery data from ${deviceId}:`, data)

      // 存储到Redis
      const telemetryData = {
        device: deviceId,
        ts: Date.now(),
        soc: typeof data.soc === 'number' ? data.soc : null,
        voltage: typeof data.voltage === 'number' ? data.voltage : null,
        temperature: typeof data.temperature === 'number' ? data.temperature : null,
        health: typeof data.health === 'number' ? data.health : null,
        cycleCount: typeof data.cycleCount === 'number' ? data.cycleCount : null,
        estimatedRangeKm: typeof data.estimatedRangeKm === 'number' ? data.estimatedRangeKm : null,
        chargingStatus: typeof data.chargingStatus === 'string' ? data.chargingStatus : null,
        alerts: Array.isArray(data.alerts) ? data.alerts : []
      }

      // 调用API存储数据
      const response = await fetch('http://localhost:3000/api/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(telemetryData)
      })

      if (response.ok) {
        console.log(`[MQTT Service] ✅ Stored battery data for ${deviceId} to Redis`)
      } else {
        console.error(`[MQTT Service] ❌ Failed to store battery data for ${deviceId}:`, response.status)
      }

    } catch (error) {
      console.error(`[MQTT Service] Error processing battery message from ${deviceId}:`, error)
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
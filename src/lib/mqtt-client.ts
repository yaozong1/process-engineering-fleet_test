// MQTT客户端服务（用于浏览器WebSocket连接）
import { MQTTConfig, getMQTTConfig, MQTT_TOPICS, MQTTMessage } from './mqtt-config'

interface MQTTClientOptions {
  onConnect?: () => void
  onDisconnect?: () => void
  onMessage?: (topic: string, message: MQTTMessage) => void
  onError?: (error: Error) => void
}

class MQTTWebSocketClient {
  private ws: WebSocket | null = null
  private config: MQTTConfig
  private options: MQTTClientOptions
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private subscriptions = new Set<string>()

  constructor(options: MQTTClientOptions = {}) {
    this.config = getMQTTConfig()
    this.options = options
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 构建WebSocket URL
        const wsUrl = this.buildWebSocketUrl()

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('MQTT WebSocket connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.options.onConnect?.()

          // 重新订阅之前的topic
          this.subscriptions.forEach(topic => {
            this.subscribeToTopic(topic)
          })

          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.topic && data.message) {
              this.options.onMessage?.(data.topic, data.message)
            }
          } catch (error) {
            console.error('Failed to parse MQTT message:', error)
          }
        }

        this.ws.onclose = () => {
          console.log('MQTT WebSocket disconnected')
          this.isConnected = false
          this.options.onDisconnect?.()

          // 自动重连
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            setTimeout(() => {
              console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
              this.connect()
            }, this.reconnectDelay * this.reconnectAttempts)
          }
        }

        this.ws.onerror = (error) => {
          console.error('MQTT WebSocket error:', error)
          this.options.onError?.(new Error('WebSocket connection failed'))
          reject(error)
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  private buildWebSocketUrl(): string {
    const { protocol, host, port, clientId, username, password } = this.config
    const wsProtocol = protocol === 'wss' || protocol === 'mqtts' ? 'wss' : 'ws'

    let url = `${wsProtocol}://${host}:${port}/mqtt`

    // 添加客户端ID
    url += `?clientId=${clientId}`

    // 添加认证信息
    if (username) {
      url += `&username=${encodeURIComponent(username)}`
    }
    if (password) {
      url += `&password=${encodeURIComponent(password)}`
    }

    return url
  }

  subscribe(topic: string): void {
    this.subscriptions.add(topic)
    if (this.isConnected) {
      this.subscribeToTopic(topic)
    }
  }

  private subscribeToTopic(topic: string): void {
    if (this.ws && this.isConnected) {
      const message = {
        type: 'subscribe',
        topic: topic
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic)
    if (this.ws && this.isConnected) {
      const message = {
        type: 'unsubscribe',
        topic: topic
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  publish(topic: string, message: any): void {
    if (this.ws && this.isConnected) {
      const payload = {
        type: 'publish',
        topic: topic,
        message: message
      }
      this.ws.send(JSON.stringify(payload))
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.subscriptions.clear()
  }

  getConnectionStatus(): boolean {
    return this.isConnected
  }
}

// 单例模式
let mqttClient: MQTTWebSocketClient | null = null

export const getMQTTClient = (options?: MQTTClientOptions): MQTTWebSocketClient => {
  if (!mqttClient) {
    mqttClient = new MQTTWebSocketClient(options)
  }
  return mqttClient
}

// 便捷函数
export const connectMQTT = (options?: MQTTClientOptions): Promise<void> => {
  const client = getMQTTClient(options)
  return client.connect()
}

export const subscribeTo = (topic: string): void => {
  const client = getMQTTClient()
  client.subscribe(topic)
}

export const publishTo = (topic: string, message: any): void => {
  const client = getMQTTClient()
  client.publish(topic, message)
}

export const disconnectMQTT = (): void => {
  if (mqttClient) {
    mqttClient.disconnect()
    mqttClient = null
  }
}

// 预定义的订阅函数
export const subscribeToAllVehicles = (): void => {
  subscribeTo(MQTT_TOPICS.ALL_VEHICLES)
}

export const subscribeToVehicleGPS = (vehicleId?: string): void => {
  if (vehicleId) {
    subscribeTo(MQTT_TOPICS.VEHICLE_GPS(vehicleId))
  } else {
    subscribeTo(MQTT_TOPICS.ALL_GPS)
  }
}

export const subscribeToVehicleBattery = (vehicleId?: string): void => {
  if (vehicleId) {
    subscribeTo(MQTT_TOPICS.VEHICLE_BATTERY(vehicleId))
  } else {
    subscribeTo(MQTT_TOPICS.ALL_BATTERY)
  }
}

export const subscribeToVehicleStatus = (vehicleId?: string): void => {
  if (vehicleId) {
    subscribeTo(MQTT_TOPICS.VEHICLE_STATUS(vehicleId))
  } else {
    subscribeTo(MQTT_TOPICS.ALL_STATUS)
  }
}

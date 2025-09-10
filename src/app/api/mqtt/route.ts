// MQTT WebSocket代理服务器
import { NextRequest, NextResponse } from 'next/server'
import { WebSocketServer, WebSocket } from 'ws'
import * as mqtt from 'mqtt'
import { getMQTTConfig, MQTT_TOPICS } from '@/lib/mqtt-config'
import { IncomingMessage } from 'http'

// WebSocket服务器实例
let wss: WebSocketServer | null = null
let mqttClient: mqtt.MqttClient | null = null

// 客户端连接管理
const clients = new Map<WebSocket, {
  subscriptions: Set<string>
  id: string
}>()

// 初始化MQTT客户端
function initMQTTClient() {
  if (mqttClient?.connected) {
    return mqttClient
  }

  const config = getMQTTConfig()

  // 构建MQTT连接URL
  const connectUrl = `${config.protocol}://${config.host}:${config.port}`

  const options: mqtt.IClientOptions = {
    clientId: config.clientId,
    username: config.username,
    password: config.password,
    clean: config.clean,
    keepalive: config.keepalive,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
  }

  console.log('Connecting to MQTT broker:', connectUrl)

  mqttClient = mqtt.connect(connectUrl, options)

  mqttClient.on('connect', () => {
    console.log('MQTT broker connected successfully')

    // 订阅所有车辆数据
    mqttClient?.subscribe([
      MQTT_TOPICS.ALL_GPS,
      MQTT_TOPICS.ALL_BATTERY,
      MQTT_TOPICS.ALL_STATUS
    ], (err: Error | null) => {
      if (err) {
        console.error('Failed to subscribe to topics:', err)
      } else {
        console.log('Successfully subscribed to all vehicle topics')
      }
    })
  })

  mqttClient.on('error', (err: Error) => {
    console.error('MQTT connection error:', err)
  })

  mqttClient.on('message', (topic: string, payload: Buffer) => {
    try {
      const message = JSON.parse(payload.toString())
      console.log('MQTT message received:', { topic, message })

      // 广播消息给所有WebSocket客户端
      broadcastToClients(topic, message)
    } catch (error) {
      console.error('Failed to parse MQTT message:', error)
    }
  })

  mqttClient.on('close', () => {
    console.log('MQTT connection closed')
  })

  return mqttClient
}

// 广播消息给所有WebSocket客户端
function broadcastToClients(topic: string, message: any) {
  const payload = JSON.stringify({ topic, message })

  clients.forEach((clientInfo, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      // 检查客户端是否订阅了这个topic
      const isSubscribed = Array.from(clientInfo.subscriptions).some(subscription => {
        // 支持通配符匹配
        const regex = subscription.replace(/\+/g, '[^/]+').replace(/#/g, '.*')
        return new RegExp(`^${regex}$`).test(topic)
      })

      if (isSubscribed) {
        ws.send(payload)
      }
    }
  })
}

// 处理WebSocket升级请求
export async function GET(request: NextRequest) {
  // 检查是否为WebSocket升级请求
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected WebSocket', { status: 400 })
  }

  try {
    // 初始化WebSocket服务器（如果尚未初始化）
    if (!wss) {
      wss = new WebSocketServer({ noServer: true })

      wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
        const clientId = Math.random().toString(36).substr(2, 9)
        console.log(`WebSocket client connected: ${clientId}`)

        // 注册客户端
        clients.set(ws, {
          subscriptions: new Set(),
          id: clientId
        })

        // 初始化MQTT客户端
        initMQTTClient()

        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString())
            handleClientMessage(ws, message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
            ws.send(JSON.stringify({ error: 'Invalid message format' }))
          }
        })

        ws.on('close', () => {
          console.log(`WebSocket client disconnected: ${clientId}`)
          clients.delete(ws)
        })

        ws.on('error', (error: Error) => {
          console.error(`WebSocket error for client ${clientId}:`, error)
          clients.delete(ws)
        })

        // 发送连接确认
        ws.send(JSON.stringify({
          type: 'connected',
          clientId,
          message: 'WebSocket connected to MQTT proxy'
        }))
      })
    }

    // 返回WebSocket升级响应
    return new Response(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      },
    })

  } catch (error) {
    console.error('WebSocket upgrade failed:', error)
    return new Response('WebSocket upgrade failed', { status: 500 })
  }
}

// 处理客户端消息
function handleClientMessage(ws: WebSocket, message: any) {
  const clientInfo = clients.get(ws)
  if (!clientInfo) return

  switch (message.type) {
    case 'subscribe':
      if (message.topic) {
        clientInfo.subscriptions.add(message.topic)
        console.log(`Client ${clientInfo.id} subscribed to: ${message.topic}`)

        // 如果是新的topic，让MQTT客户端也订阅
        if (mqttClient?.connected) {
          mqttClient.subscribe(message.topic, (err: Error | null) => {
            if (err) {
              console.error('Failed to subscribe to MQTT topic:', err)
            }
          })
        }
      }
      break

    case 'unsubscribe':
      if (message.topic) {
        clientInfo.subscriptions.delete(message.topic)
        console.log(`Client ${clientInfo.id} unsubscribed from: ${message.topic}`)
      }
      break

    case 'publish':
      if (message.topic && mqttClient?.connected) {
        const payload = JSON.stringify(message.message)
        mqttClient.publish(message.topic, payload, (err?: Error) => {
          if (err) {
            console.error('Failed to publish MQTT message:', err)
            ws.send(JSON.stringify({
              error: 'Failed to publish message',
              details: err.message
            }))
          }
        })
      }
      break

    default:
      ws.send(JSON.stringify({ error: 'Unknown message type' }))
      break
  }
}

// 处理其他HTTP方法
export async function POST(request: NextRequest) {
  return new Response('Method not allowed', { status: 405 })
}

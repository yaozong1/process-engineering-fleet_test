// React Hook for MQTT integration
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  getMQTTClient,
  connectMQTT,
  disconnectMQTT
} from '@/lib/mqtt-client'
import {
  MQTTMessage,
  VehicleGPSData,
  VehicleBatteryData,
  VehicleStatusData,
  validateGPSData,
  validateBatteryData,
  validateStatusData
} from '@/lib/mqtt-config'

interface MQTTHookState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastMessage: MQTTMessage | null
  vehicleData: Map<string, VehicleData>
}

interface VehicleData {
  gps?: VehicleGPSData
  battery?: VehicleBatteryData
  status?: VehicleStatusData
  lastUpdate: string
}

interface UseMQTTOptions {
  autoConnect?: boolean
  topics?: string[]
  onMessage?: (topic: string, message: MQTTMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: string) => void
}

export function useMQTT(options: UseMQTTOptions = {}) {
  const {
    autoConnect = true,
    topics = [],
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options

  const [state, setState] = useState<MQTTHookState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    vehicleData: new Map()
  })

  const clientRef = useRef(getMQTTClient())
  const mountedRef = useRef(true)

  // 安全的状态更新函数
  const safeSetState = useCallback((updateFn: (prev: MQTTHookState) => MQTTHookState) => {
    if (mountedRef.current) {
      setState(updateFn)
    }
  }, [])

  // 处理MQTT消息
  const handleMessage = useCallback((topic: string, message: MQTTMessage) => {
    console.log('MQTT Message received:', { topic, message })

    safeSetState(prev => {
      const newVehicleData = new Map(prev.vehicleData)

      // 解析topic获取vehicleId
      const topicParts = topic.split('/')
      if (topicParts.length >= 3 && topicParts[0] === 'fleet' && topicParts[1] === 'vehicle') {
        const vehicleId = topicParts[2]
        const dataType = topicParts[3]

        // 获取或创建车辆数据
        const vehicleData = newVehicleData.get(vehicleId) || { lastUpdate: new Date().toISOString() }

        // 根据数据类型更新相应字段
        switch (dataType) {
          case 'gps':
            if (validateGPSData(message)) {
              vehicleData.gps = message
              vehicleData.lastUpdate = message.timestamp
            }
            break
          case 'battery':
            if (validateBatteryData(message)) {
              vehicleData.battery = message
              vehicleData.lastUpdate = message.timestamp
            }
            break
          case 'status':
            if (validateStatusData(message)) {
              vehicleData.status = message
              vehicleData.lastUpdate = message.timestamp
            }
            break
        }

        newVehicleData.set(vehicleId, vehicleData)
      }

      return {
        ...prev,
        lastMessage: message,
        vehicleData: newVehicleData
      }
    })

    // 调用用户提供的消息处理函数
    onMessage?.(topic, message)
  }, [onMessage, safeSetState])

  // 连接MQTT
  const connect = useCallback(async () => {
    if (state.isConnected || state.isConnecting) {
      return
    }

    safeSetState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      await connectMQTT({
        onConnect: () => {
          console.log('MQTT connected successfully')
          safeSetState(prev => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            error: null
          }))
          onConnect?.()
        },
        onDisconnect: () => {
          console.log('MQTT disconnected')
          safeSetState(prev => ({
            ...prev,
            isConnected: false,
            isConnecting: false
          }))
          onDisconnect?.()
        },
        onMessage: handleMessage,
        onError: (error) => {
          console.error('MQTT error:', error)
          const errorMessage = error.message || 'Unknown MQTT error'
          safeSetState(prev => ({
            ...prev,
            error: errorMessage,
            isConnecting: false
          }))
          onError?.(errorMessage)
        }
      })

      // 订阅指定的topics
      topics.forEach(topic => {
        clientRef.current.subscribe(topic)
      })

    } catch (error) {
      console.error('Failed to connect to MQTT:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect'
      safeSetState(prev => ({
        ...prev,
        error: errorMessage,
        isConnecting: false
      }))
      onError?.(errorMessage)
    }
  }, [state.isConnected, state.isConnecting, topics, handleMessage, onConnect, onDisconnect, onError, safeSetState])

  // 断开连接
  const disconnect = useCallback(() => {
    disconnectMQTT()
    safeSetState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false
    }))
  }, [safeSetState])

  // 订阅topic
  const subscribe = useCallback((topic: string) => {
    clientRef.current.subscribe(topic)
  }, [])

  // 取消订阅
  const unsubscribe = useCallback((topic: string) => {
    clientRef.current.unsubscribe(topic)
  }, [])

  // 发布消息
  const publish = useCallback((topic: string, message: any) => {
    clientRef.current.publish(topic, message)
  }, [])

  // 获取车辆数据
  const getVehicleData = useCallback((vehicleId: string): VehicleData | undefined => {
    return state.vehicleData.get(vehicleId)
  }, [state.vehicleData])

  // 获取所有车辆数据
  const getAllVehicleData = useCallback((): Map<string, VehicleData> => {
    return state.vehicleData
  }, [state.vehicleData])

  // 自动连接
  useEffect(() => {
    if (autoConnect && !state.isConnected && !state.isConnecting) {
      connect()
    }

    // 清理函数
    return () => {
      mountedRef.current = false
    }
  }, [autoConnect, connect, state.isConnected, state.isConnecting])

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    // 状态
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    lastMessage: state.lastMessage,
    vehicleData: state.vehicleData,

    // 方法
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    publish,
    getVehicleData,
    getAllVehicleData
  }
}

// 预定义的Hook变体
export function useVehicleGPSData(vehicleId?: string) {
  const topics = vehicleId
    ? [`fleet/vehicle/${vehicleId}/gps`]
    : ['fleet/vehicle/+/gps']

  const mqtt = useMQTT({ topics })

  const gpsData = vehicleId
    ? mqtt.getVehicleData(vehicleId)?.gps
    : Array.from(mqtt.vehicleData.values())
        .map(data => data.gps)
        .filter(Boolean) as VehicleGPSData[]

  return {
    ...mqtt,
    gpsData
  }
}

export function useVehicleBatteryData(vehicleId?: string) {
  const topics = vehicleId
    ? [`fleet/vehicle/${vehicleId}/battery`]
    : ['fleet/vehicle/+/battery']

  const mqtt = useMQTT({ topics })

  const batteryData = vehicleId
    ? mqtt.getVehicleData(vehicleId)?.battery
    : Array.from(mqtt.vehicleData.values())
        .map(data => data.battery)
        .filter(Boolean) as VehicleBatteryData[]

  return {
    ...mqtt,
    batteryData
  }
}

export function useAllVehicleData() {
  const topics = [
    'fleet/vehicle/+/gps',
    'fleet/vehicle/+/battery',
    'fleet/vehicle/+/status'
  ]

  return useMQTT({ topics })
}

'use client'

import React, { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react'

// 定义设备数据结构
export interface DeviceData {
  // 基本信息
  device: string
  ts: number
  
  // 电池信息
  soc?: number
  voltage?: number
  temperature?: number
  health?: number
  cycleCount?: number
  estimatedRangeKm?: number
  chargingStatus?: string
  alerts?: string[]
  
  // GPS信息
  gps?: {
    lat: number
    lng: number
    speed?: number
    heading?: number
    altitude?: number
    accuracy?: number
  }
}

// 历史数据点
export interface DeviceHistoryPoint {
  time: string
  level: number
  voltage: number
  temperature: number
}

// 设备状态
export interface DeviceStatus {
  isOnline: boolean
  lastSeen: number
  batteryLevel: number
  location?: {
    lat: number
    lng: number
  }
}

// Context接口
interface DeviceDataContextType {
  // 设备数据存储
  devicesData: Map<string, DeviceData>
  devicesList: string[]
  
  // 历史数据存储
  devicesHistory: Map<string, DeviceHistoryPoint[]>
  
  // 数据更新方法
  updateDeviceData: (deviceId: string, data: DeviceData) => void
  updateDeviceHistory: (deviceId: string, history: DeviceHistoryPoint[]) => void
  addHistoryPoint: (deviceId: string, point: DeviceHistoryPoint) => void
  
  // 数据获取方法
  getDeviceData: (deviceId: string) => DeviceData | undefined
  getDeviceHistory: (deviceId: string) => DeviceHistoryPoint[]
  getDeviceStatus: (deviceId: string) => DeviceStatus
  
  // 数据刷新
  refreshDeviceData: (deviceId: string) => Promise<void>
  refreshAllDevices: () => Promise<void>
  
  // 轮询控制
  startPolling: () => void
  stopPolling: () => void
  isPolling: boolean
}

const DeviceDataContext = createContext<DeviceDataContextType | undefined>(undefined)

export const useDeviceData = () => {
  const context = useContext(DeviceDataContext)
  if (!context) {
    throw new Error('useDeviceData must be used within a DeviceDataProvider')
  }
  return context
}

interface DeviceDataProviderProps {
  children: ReactNode
}

export const DeviceDataProvider: React.FC<DeviceDataProviderProps> = ({ children }) => {
  // 设备数据存储
  const [devicesData, setDevicesData] = useState<Map<string, DeviceData>>(new Map())
  const [devicesList, setDevicesList] = useState<string[]>([])
  const [devicesHistory, setDevicesHistory] = useState<Map<string, DeviceHistoryPoint[]>>(new Map())
  
  // 轮询控制
  const [isPolling, setIsPolling] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // 数据变化检测缓存
  const lastDataRef = useRef<Map<string, { soc: number; voltage: number; temperature: number }>>(new Map())
  
  // 检查数据是否有变化
  const hasDataChanged = useCallback((deviceId: string, newData: DeviceData): boolean => {
    const lastData = lastDataRef.current.get(deviceId)
    if (!lastData || !newData.soc || !newData.voltage || !newData.temperature) {
      return true // 首次数据或缺少关键字段，认为有变化
    }
    
    const socChanged = Math.abs(lastData.soc - newData.soc) >= 0.1
    const voltageChanged = Math.abs(lastData.voltage - newData.voltage) >= 0.01
    const temperatureChanged = Math.abs(lastData.temperature - newData.temperature) >= 0.1
    
    return socChanged || voltageChanged || temperatureChanged
  }, [])
  
  // 更新设备数据
  const updateDeviceData = useCallback((deviceId: string, data: DeviceData) => {
    setDevicesData(prev => {
      const newMap = new Map(prev)
      newMap.set(deviceId, { ...data, device: deviceId })
      
      // 更新最后数据缓存
      if (data.soc !== undefined && data.voltage !== undefined && data.temperature !== undefined) {
        lastDataRef.current.set(deviceId, {
          soc: data.soc,
          voltage: data.voltage,
          temperature: data.temperature
        })
      }
      
      return newMap
    })
    
    // 如果设备不在列表中，添加它
    setDevicesList(prev => {
      if (!prev.includes(deviceId)) {
        return [...prev, deviceId].sort()
      }
      return prev
    })
    
    console.log(`[DeviceDataContext] 更新设备 ${deviceId} 数据:`, data)
  }, [])
  
  // 更新设备历史数据
  const updateDeviceHistory = useCallback((deviceId: string, history: DeviceHistoryPoint[]) => {
    setDevicesHistory(prev => {
      const newMap = new Map(prev)
      newMap.set(deviceId, [...history])
      return newMap
    })
    
    console.log(`[DeviceDataContext] 更新设备 ${deviceId} 历史数据: ${history.length} 条`)
  }, [])
  
  // 添加历史数据点
  const addHistoryPoint = useCallback((deviceId: string, point: DeviceHistoryPoint) => {
    setDevicesHistory(prev => {
      const newMap = new Map(prev)
      const currentHistory = newMap.get(deviceId) || []
      
      // 检查是否需要添加新点（数据是否发生了有意义的变化）
      if (currentHistory.length > 0) {
        const lastPoint = currentHistory[currentHistory.length - 1]
        const isDifferent = 
          Math.abs(lastPoint.level - point.level) >= 0.1 ||  // 电量变化≥0.1%
          Math.abs(lastPoint.voltage - point.voltage) >= 0.01 ||  // 电压变化≥0.01V
          Math.abs(lastPoint.temperature - point.temperature) >= 0.1  // 温度变化≥0.1℃
        
        if (!isDifferent) {
          console.log(`[DeviceDataContext] 设备 ${deviceId} 数据无明显变化，跳过添加历史点`)
          return prev
        }
      }
      
      // 添加新点并限制数量
      const newHistory = [...currentHistory, point]
      const MAX_HISTORY = 200
      if (newHistory.length > MAX_HISTORY) {
        newHistory.splice(0, newHistory.length - MAX_HISTORY)
      }
      
      newMap.set(deviceId, newHistory)
      console.log(`[DeviceDataContext] 设备 ${deviceId} 添加新历史点`)
      return newMap
    })
  }, [])
  
  // 获取设备数据
  const getDeviceData = useCallback((deviceId: string): DeviceData | undefined => {
    return devicesData.get(deviceId)
  }, [devicesData])
  
  // 获取设备历史数据
  const getDeviceHistory = useCallback((deviceId: string): DeviceHistoryPoint[] => {
    return devicesHistory.get(deviceId) || []
  }, [devicesHistory])
  
  // 获取设备状态
  const getDeviceStatus = useCallback((deviceId: string): DeviceStatus => {
    const data = devicesData.get(deviceId)
    const now = Date.now()
    const isOnline = data ? (now - data.ts) < 300000 : false // 5分钟内有数据认为在线
    
    return {
      isOnline,
      lastSeen: data?.ts || 0,
      batteryLevel: data?.soc || 0,
      location: data?.gps ? { lat: data.gps.lat, lng: data.gps.lng } : undefined
    }
  }, [devicesData])
  
  // 刷新单个设备数据
  const refreshDeviceData = useCallback(async (deviceId: string): Promise<void> => {
    try {
      console.log(`[DeviceDataContext] 刷新设备 ${deviceId} 数据`)
      
      // 获取最新数据
      const response = await fetch(`/api/telemetry?device=${deviceId}&latest=1`)
      if (!response.ok) throw new Error(`API响应错误: ${response.status}`)
      
      const result = await response.json()
      if (result.data && result.data.length > 0) {
        const latestData = result.data[0]
        
        // 检查数据是否有变化
        if (hasDataChanged(deviceId, latestData)) {
          updateDeviceData(deviceId, latestData)
          
          // 如果有电池数据，添加到历史记录
          if (latestData.soc !== undefined && latestData.voltage !== undefined && latestData.temperature !== undefined) {
            const historyPoint: DeviceHistoryPoint = {
              time: new Date(latestData.ts).toISOString(),
              level: latestData.soc,
              voltage: latestData.voltage,
              temperature: latestData.temperature
            }
            addHistoryPoint(deviceId, historyPoint)
          }
          
          console.log(`[DeviceDataContext] 检测到设备 ${deviceId} 数据变化`)
        } else {
          console.log(`[DeviceDataContext] 设备 ${deviceId} 数据无变化，跳过更新`)
        }
      }
    } catch (error) {
      console.error(`[DeviceDataContext] 刷新设备 ${deviceId} 数据失败:`, error)
    }
  }, [hasDataChanged, updateDeviceData, addHistoryPoint])
  
  // 刷新所有设备数据
  const refreshAllDevices = useCallback(async (): Promise<void> => {
    try {
      // 获取设备列表
      const listResponse = await fetch('/api/telemetry?list=1')
      if (!listResponse.ok) throw new Error(`获取设备列表失败: ${listResponse.status}`)
      
      const listResult = await listResponse.json()
      const devices = listResult.devices || []
      
      setDevicesList(devices)
      
      // 并行刷新所有设备数据
      await Promise.all(devices.map((deviceId: string) => refreshDeviceData(deviceId)))
      
      console.log(`[DeviceDataContext] 刷新了 ${devices.length} 个设备的数据`)
    } catch (error) {
      console.error('[DeviceDataContext] 刷新所有设备数据失败:', error)
    }
  }, [refreshDeviceData])
  
  // 开始轮询
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return // 已经在轮询
    
    setIsPolling(true)
    console.log('[DeviceDataContext] 开始数据轮询')
    
    // 立即执行一次
    refreshAllDevices()
    
    // 设置定时轮询
    pollingIntervalRef.current = setInterval(refreshAllDevices, 5000) // 5秒轮询
  }, [refreshAllDevices])
  
  // 停止轮询
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setIsPolling(false)
    console.log('[DeviceDataContext] 停止数据轮询')
  }, [])
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])
  
  const contextValue: DeviceDataContextType = {
    devicesData,
    devicesList,
    devicesHistory,
    updateDeviceData,
    updateDeviceHistory,
    addHistoryPoint,
    getDeviceData,
    getDeviceHistory,
    getDeviceStatus,
    refreshDeviceData,
    refreshAllDevices,
    startPolling,
    stopPolling,
    isPolling
  }
  
  return (
    <DeviceDataContext.Provider value={contextValue}>
      {children}
    </DeviceDataContext.Provider>
  )
}
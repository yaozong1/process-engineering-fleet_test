"use client"

import { useState, useEffect, useRef } from "react"
import mqtt, { MqttClient } from "mqtt"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Battery,
  BatteryLow,
  Zap,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Activity,
  Clock,
  Thermometer
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts"

interface BatteryData {
  vehicleId: string
  currentLevel: number
  voltage: number
  temperature: number
  health: number
  cycleCount: number
  estimatedRange: number
  chargingStatus: "charging" | "discharging" | "idle" | "full"
  lastProbe: string
  alerts: string[]
}

interface BatteryHistoryPoint {
  time: string
  level: number
  voltage: number
  temperature: number
}

// Generate mock history data function (for testing only, all devices should load from database in production)
const generateHistoryData = (vehicleId: string): BatteryHistoryPoint[] => {
  const data: BatteryHistoryPoint[] = []
  const now = Date.now()

  for (let i = 23; i >= 0; i--) {
    const time = new Date(now - i * 60 * 60 * 1000) // Every hour for 24 hours
    const baseLevel = 50 + Math.sin(i * 0.3) * 30 + Math.random() * 10

    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      level: Math.max(10, Math.min(100, baseLevel)),
      voltage: 11.5 + (baseLevel / 100) * 2,
      temperature: 25 + Math.random() * 20
    })
  }

  return data
}

function getBatteryIcon(level: number, chargingStatus: string) {
  if (chargingStatus === "charging") return <Zap className="w-4 h-4 text-yellow-500" />
  if (level < 20) return <BatteryLow className="w-4 h-4 text-red-500" />
  return <Battery className="w-4 h-4 text-green-500" />
}

function getBatteryColor(level: number): string {
  if (level < 20) return "text-red-600"
  if (level < 50) return "text-yellow-600"
  return "text-green-600"
}

function getProgressColor(level: number): string {
  if (level < 20) return "bg-red-500"
  if (level < 50) return "bg-yellow-500"
  return "bg-green-500"
}

export function BatteryMonitorDashboard() {
  const [batteryData, setBatteryData] = useState<BatteryData[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<string>("")
  const [historyData, setHistoryData] = useState<BatteryHistoryPoint[]>([])
  const [isProbing, setIsProbing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const mqttRef = useRef<MqttClient | null>(null)
  const [mqttStatus, setMqttStatus] = useState<'idle'|'connecting'|'connected'|'error'>('idle')
  const lastTelemetryRef = useRef<number | null>(null)
  
  // Manage history data cache by device ID separately
  const deviceHistoryMap = useRef<Map<string, BatteryHistoryPoint[]>>(new Map())

  // Config via env (must be NEXT_PUBLIC_ to be exposed client-side)
  const MQTT_URL = process.env.NEXT_PUBLIC_MQTT_URL || ''
  const MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME || ''
  const MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD || ''

  // Configuration constants - 统一数据获取策略
  const MAX_HISTORY = 200 // Local circular buffer capacity
  const STANDARD_LOAD_LIMIT = 10 // 统一的数据获取数量，确保初始加载和同步一致
  const CACHE_KEY = 'battery_devices_cache_5min' // 延长缓存时间减少页面切换时的重复请求
  const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes cache - 避免频繁页面切换时重复加载
  const SESSION_SYNC_KEY = 'battery_session_synced' // 标记本次会话是否已同步过云端

  // Unified data flow logic: local cache -> if not available -> sync Redis -> receive MQTT then store in local cache and send to cloud Redis
  
  // Get device history data (priority: local cache -> Redis)
  const getDeviceHistory = async (deviceId: string): Promise<BatteryHistoryPoint[]> => {
    const localKey = `battery_history_${deviceId}`
    
    // 1. First check local localStorage cache
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(localKey)
        if (cached) {
          const parsed = JSON.parse(cached) as BatteryHistoryPoint[]
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`[BatteryDashboard] Loading device ${deviceId} history data from local cache:`, parsed.length, 'entries')
            return parsed
          }
        }
      } catch (e) {
        console.warn(`[BatteryDashboard] Local cache parsing failed for ${deviceId}:`, e)
      }
    }
    
    // 2. If not available locally, get from Redis
    try {
      console.log(`[BatteryDashboard] Getting device ${deviceId} history data from Redis...`)
      const res = await fetch(`/api/telemetry?device=${deviceId}&limit=${STANDARD_LOAD_LIMIT}`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.data) && json.data.length > 0) {
          const historyPoints: BatteryHistoryPoint[] = json.data.map((d: any) => ({
            time: new Date(d.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            level: typeof d.soc === 'number' ? d.soc : 0,
            voltage: typeof d.voltage === 'number' ? d.voltage : 0,
            temperature: typeof d.temperature === 'number' ? d.temperature : 0
          }))
          
          // Sync to local cache
          saveDeviceHistory(deviceId, historyPoints)
          
          return historyPoints
        }
      }
    } catch (e) {
      console.error(`[BatteryDashboard] Failed to get device ${deviceId} history data from Redis:`, e)
    }
    
    return []
  }
  
  // 保存设备历史数据到本地缓存
  const saveDeviceHistory = (deviceId: string, history: BatteryHistoryPoint[]) => {
    if (typeof window !== 'undefined') {
      try {
        const localKey = `battery_history_${deviceId}`
        localStorage.setItem(localKey, JSON.stringify(history))
        console.log(`[BatteryDashboard] 已保存设备 ${deviceId} 的 ${history.length} 条历史数据到本地缓存`)
      } catch (e) {
        console.warn(`[BatteryDashboard] 保存设备 ${deviceId} 历史数据到本地缓存失败:`, e)
      }
    }
  }
  
  // 添加新的历史数据点
  const addHistoryPoint = (deviceId: string, point: BatteryHistoryPoint) => {
    let currentHistory = deviceHistoryMap.current.get(deviceId) || []
    
    // 如果当前历史记录为空或很少，先尝试从localStorage恢复
    if (currentHistory.length < 2) {
      console.log(`[BatteryDashboard] 添加历史点时发现记录少，尝试从localStorage恢复设备 ${deviceId} 的历史数据`)
      const historyKey = `battery_history_${deviceId}`
      if (typeof window !== 'undefined') {
        const storedHistory = localStorage.getItem(historyKey)
        if (storedHistory) {
          try {
            const parsedHistory = JSON.parse(storedHistory)
            if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
              currentHistory = [...parsedHistory]
              console.log(`[BatteryDashboard] 从localStorage恢复了 ${parsedHistory.length} 条历史数据`)
            }
          } catch (e) {
            console.warn(`[BatteryDashboard] 解析localStorage历史数据失败:`, e)
          }
        }
      }
    }
    
    currentHistory.push(point)
    
    // 限制最大条数
    if (currentHistory.length > MAX_HISTORY) {
      currentHistory = currentHistory.slice(-MAX_HISTORY)
    }
    
    // 更新内存缓存
    deviceHistoryMap.current.set(deviceId, currentHistory)
    
    // 保存到本地localStorage
    saveDeviceHistory(deviceId, currentHistory)
    
    // 如果是当前选中的设备，更新UI
    if (deviceId === selectedVehicle) {
      setHistoryData([...currentHistory])
    }
    
    console.log(`[BatteryDashboard] 已为设备 ${deviceId} 添加历史数据点，当前总数: ${currentHistory.length}`)
  }

  // 检查是否为本次会话的首次加载
  const isFirstSessionLoad = () => {
    if (typeof window === 'undefined') return true
    return !sessionStorage.getItem(SESSION_SYNC_KEY)
  }

  // 标记本次会话已同步
  const markSessionSynced = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_SYNC_KEY, Date.now().toString())
    }
  }

  // 检查缓存 - 优化页面切换体验
  const checkCache = () => {
    if (typeof window === 'undefined') return null
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const data = JSON.parse(cached)
        const age = Date.now() - data.timestamp
        const remainingTime = CACHE_EXPIRY - age
        
        if (remainingTime > 0) {
          console.log(`[BatteryDashboard] 使用缓存数据 (剩余有效期: ${Math.round(remainingTime/1000)}秒)`)
          return data.batteryData
        } else {
          console.log('[BatteryDashboard] 缓存已过期，需要重新加载')
        }
      } else {
        console.log('[BatteryDashboard] 无缓存数据，首次加载')
      }
    } catch (error) {
      console.warn('[BatteryDashboard] 缓存读取失败:', error)
    }
    return null
  }

  // 保存到缓存
  const saveToCache = (data: BatteryData[]) => {
    if (typeof window === 'undefined') return
    try {
      const cacheData = {
        batteryData: data,
        timestamp: Date.now()
      }
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      console.log('[BatteryDashboard] 数据已缓存')
    } catch (error) {
      console.warn('[BatteryDashboard] 缓存保存失败:', error)
    }
  }

  // 同步云端数据：以Redis为准，清除本地多余缓存，保持有限数量的历史数据
  const syncCloudData = async () => {
    setIsLoading(true)
    try {
      console.log('[BatteryDashboard] 开始同步云端数据...')
      
      // 1. 清除所有本地缓存和会话标记
      if (typeof window !== 'undefined') {
        // 清除sessionStorage
        sessionStorage.removeItem(CACHE_KEY)
        sessionStorage.removeItem(SESSION_SYNC_KEY) // 清除会话同步标记，触发下次重新同步
        
        // 清除所有localStorage历史数据
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('battery_history_')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        console.log('[BatteryDashboard] 已清除本地缓存和会话标记:', keysToRemove.length, '个项目')
      }

      // 2. 暂时保存当前选中的设备，以便同步后恢复选择
      const currentSelectedVehicle = selectedVehicle
      
      // 3. 清除内存中的历史数据（但不立即清空图表）
      deviceHistoryMap.current.clear()
      // 注意：这里不立即调用setHistoryData([])，避免在同步过程中显示空图表

      // 3. 重新从云端获取设备列表
      const listRes = await fetch('/api/telemetry?list=1', { cache: 'no-store' })
      if (listRes.ok) {
        const listJson = await listRes.json()
        console.log('[BatteryDashboard] 云端设备列表:', listJson)
        
        if (Array.isArray(listJson.devices) && listJson.devices.length > 0) {
          // 4. 为每个设备从云端获取数据 - 与初始加载保持一致
          const SYNC_LIMIT = STANDARD_LOAD_LIMIT // 改为与初始加载一致的数据量，确保同步行为一致
          const deviceDataPromises = listJson.devices.map(async (deviceId: string) => {
            try {
              // 获取设备的最新数据
              const deviceRes = await fetch(`/api/telemetry?device=${deviceId}&limit=${SYNC_LIMIT}`, { cache: 'no-store' })
              if (!deviceRes.ok) {
                console.warn(`[BatteryDashboard] 云端设备 ${deviceId} 无数据`)
                return null
              }
              const deviceJson = await deviceRes.json()
              if (!Array.isArray(deviceJson.data) || deviceJson.data.length === 0) {
                console.warn(`[BatteryDashboard] 云端设备 ${deviceId} 数据为空`)
                return null
              }
              
              const latestData = deviceJson.data[0]
              console.log(`[BatteryDashboard] 云端设备 ${deviceId} 数据:`, latestData, `(历史记录:${deviceJson.data.length}条)`)
              
              // 5. 将云端历史数据保存到本地localStorage (有限数量)
              if (typeof window !== 'undefined' && deviceJson.data.length > 0) {
                const historyPoints = deviceJson.data.map((d: any) => ({
                  time: new Date(d.ts).toLocaleTimeString(),
                  level: d.soc || 0,
                  voltage: d.voltage || 0,
                  temperature: d.temperature || 0
                })).reverse() // 从旧到新排序
                
                const lsKey = `battery_history_${deviceId}`
                try {
                  localStorage.setItem(lsKey, JSON.stringify(historyPoints))
                  console.log(`[BatteryDashboard] 已同步设备 ${deviceId} 的 ${historyPoints.length} 条历史数据到本地`)
                } catch (e) {
                  console.warn(`[BatteryDashboard] 保存设备 ${deviceId} 历史数据失败:`, e)
                }
              }
              
              return {
                vehicleId: deviceId,
                currentLevel: typeof latestData.soc === 'number' ? latestData.soc : 0,
                voltage: typeof latestData.voltage === 'number' ? latestData.voltage : 0,
                temperature: typeof latestData.temperature === 'number' ? latestData.temperature : 0,
                health: typeof latestData.health === 'number' ? latestData.health : 95,
                cycleCount: typeof latestData.cycleCount === 'number' ? latestData.cycleCount : 0,
                estimatedRange: typeof latestData.estimatedRangeKm === 'number' ? latestData.estimatedRangeKm : 0,
                chargingStatus: (typeof latestData.chargingStatus === 'string' ? latestData.chargingStatus : 'idle') as BatteryData['chargingStatus'],
                lastProbe: `Cloud Sync - ${new Date().toLocaleTimeString()}`,
                alerts: Array.isArray(latestData.alerts) ? latestData.alerts : []
              } as BatteryData
            } catch (error) {
              console.error(`[BatteryDashboard] 同步设备 ${deviceId} 失败:`, error)
              return null
            }
          })
          
          const deviceDataResults = await Promise.all(deviceDataPromises)
          const validDeviceData = deviceDataResults.filter(d => d !== null) as BatteryData[]
          
          if (validDeviceData.length > 0) {
            console.log('[BatteryDashboard] 云端同步完成，设备:', validDeviceData.map(d => d.vehicleId))
            setBatteryData(validDeviceData)
            
            // 恢复之前选中的设备，如果不存在则选择第一个
            const deviceToSelect = currentSelectedVehicle && validDeviceData.find(d => d.vehicleId === currentSelectedVehicle) 
              ? currentSelectedVehicle 
              : validDeviceData[0].vehicleId
            setSelectedVehicle(deviceToSelect)
            
            // 如果选中的设备有历史数据，立即加载并显示
            const selectedDeviceId = deviceToSelect
            const historyKey = `battery_history_${selectedDeviceId}`
            if (typeof window !== 'undefined') {
              const storedHistory = localStorage.getItem(historyKey)
              if (storedHistory) {
                try {
                  const historyData = JSON.parse(storedHistory)
                  if (Array.isArray(historyData)) {
                    setHistoryData(historyData)
                    
                    // 使用统一的 deviceHistoryMap 存储历史数据
                    deviceHistoryMap.current.set(selectedDeviceId, historyData)
                    console.log(`[BatteryDashboard] 已初始化设备 ${selectedDeviceId} 的历史数据:`, historyData.length, '条')
                    
                    // 立即更新图表显示
                    setHistoryData([...historyData])
                    console.log(`[BatteryDashboard] 已加载设备 ${selectedDeviceId} 的历史数据:`, historyData.length, '条')
                  }
                } catch (e) {
                  console.warn(`[BatteryDashboard] 解析设备 ${selectedDeviceId} 历史数据失败:`, e)
                }
              }
            }
            
            alert(`Cloud sync completed!\nSynced ${validDeviceData.length} devices\nData synchronized with initial load for consistency`)
          } else {
            console.log('[BatteryDashboard] 云端无有效设备数据')
            setBatteryData([])
            setSelectedVehicle("")
            setHistoryData([]) // 清空图表显示
            alert('Cloud sync completed, but no valid device data found')
          }
        } else {
          console.log('[BatteryDashboard] 云端设备列表为空')
          setBatteryData([])
          setSelectedVehicle("")
          setHistoryData([]) // 清空图表显示
          alert('Cloud sync completed, but device list is empty')
        }
      } else {
        console.error('[BatteryDashboard] 获取云端设备列表失败:', listRes.status)
        alert('Cloud sync failed: Unable to get device list')
      }
    } catch (error) {
      console.error('[BatteryDashboard] 云端同步失败:', error)
      alert('Cloud sync failed: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsLoading(false)
    }
  }

  // 首次加载：获取设备列表并初始化数据 - 优化缓存策略
  useEffect(() => {
    (async () => {
      try {
        // 检查是否为本次会话的首次加载
        const isFirstLoad = isFirstSessionLoad()
        
        if (!isFirstLoad) {
          // 不是首次加载，优先使用缓存
          const cachedData = checkCache()
          if (cachedData && cachedData.length > 0) {
            console.log('[BatteryDashboard] 页面切换回来，使用缓存数据 (5分钟有效期)')
            setBatteryData(cachedData)
            setSelectedVehicle(cachedData[0].vehicleId)
            setIsLoading(false)
            return
          }
        }

        console.log(`[BatteryDashboard] ${isFirstLoad ? '首次会话加载' : '缓存失效，重新加载'}...`)
        
        // 从API获取设备列表
        const listRes = await fetch('/api/telemetry?list=1', { cache: 'no-store' })
        if (listRes.ok) {
          const listJson = await listRes.json()
          console.log('[BatteryDashboard] 数据库设备列表:', listJson)
          
          if (Array.isArray(listJson.devices) && listJson.devices.length > 0) {
            // 获取设备数据
            const deviceDataPromises = listJson.devices.map(async (deviceId: string) => {
              try {
                const deviceRes = await fetch(`/api/telemetry?device=${deviceId}&limit=${STANDARD_LOAD_LIMIT}`, { cache: 'no-store' })
                if (!deviceRes.ok) {
                  console.warn(`[BatteryDashboard] 设备 ${deviceId} 无数据，跳过`)
                  return null
                }
                const deviceJson = await deviceRes.json()
                if (!Array.isArray(deviceJson.data) || deviceJson.data.length === 0) {
                  console.warn(`[BatteryDashboard] 设备 ${deviceId} 数据为空，跳过`)
                  return null
                }
                
                const data = deviceJson.data[0] // 使用最新数据
                console.log(`[BatteryDashboard] 加载设备 ${deviceId} 数据:`, data)
                return {
                  vehicleId: deviceId,
                  currentLevel: typeof data.soc === 'number' ? data.soc : 0,
                  voltage: typeof data.voltage === 'number' ? data.voltage : 0,
                  temperature: typeof data.temperature === 'number' ? data.temperature : 0,
                  health: typeof data.health === 'number' ? data.health : 95,
                  cycleCount: typeof data.cycleCount === 'number' ? data.cycleCount : 0,
                  estimatedRange: typeof data.estimatedRangeKm === 'number' ? data.estimatedRangeKm : 0,
                  chargingStatus: (typeof data.chargingStatus === 'string' ? data.chargingStatus : 'idle') as BatteryData['chargingStatus'],
                  lastProbe: `${isFirstLoad ? 'Session Load' : 'Refresh Load'} - ${data.ts ? new Date(data.ts).toLocaleTimeString() : new Date().toLocaleTimeString()}`,
                  alerts: Array.isArray(data.alerts) ? data.alerts : []
                } as BatteryData
              } catch (error) {
                console.error(`[BatteryDashboard] 加载设备 ${deviceId} 失败:`, error)
                return null
              }
            })
            
            const deviceDataResults = await Promise.all(deviceDataPromises)
            const validDeviceData = deviceDataResults.filter(d => d !== null) as BatteryData[]
            
            if (validDeviceData.length > 0) {
              console.log('[BatteryDashboard] 最终显示的设备:', validDeviceData.map(d => d.vehicleId))
              setBatteryData(validDeviceData)
              saveToCache(validDeviceData) // 保存到缓存
              
              // 标记本次会话已同步（只在首次加载时标记）
              if (isFirstLoad) {
                markSessionSynced()
              }
              
              // 设置第一个设备为默认选中
              setSelectedVehicle(validDeviceData[0].vehicleId)
              setIsLoading(false)
              return
            } else {
              console.log('[BatteryDashboard] 没有有效的设备数据')
              setBatteryData([])
              setSelectedVehicle("")
              setIsLoading(false)
              return
            }
          } else {
            console.log('[BatteryDashboard] 数据库设备列表为空')
            setBatteryData([])
            setSelectedVehicle("")
            setIsLoading(false)
            return
          }
        } else {
          console.error('[BatteryDashboard] 获取设备列表失败:', listRes.status, listRes.statusText)
          setBatteryData([])
          setSelectedVehicle("")
          setIsLoading(false)
          return
        }
        
      } catch (error) {
        console.error('[BatteryDashboard] 初始化失败:', error)
        setBatteryData([])
        setSelectedVehicle("")
        setIsLoading(false) // 加载失败
      }
    })()
  }, [])

  // 统一的设备数据初始化，所有设备都使用相同的数据库驱动逻辑
  useEffect(() => {
    const initializeAllDevicesFromDatabase = async () => {
      // 避免重复初始化：如果已经有数据或正在加载，则跳过
      if (batteryData.length > 0 || isLoading) {
        console.log('[BatteryDashboard] 跳过重复初始化，使用现有数据或正在加载中')
        return
      }
      
      console.log('[BatteryDashboard] 初始化所有设备数据从数据库...')
      
      try {
        // 1. 获取设备列表
        const listRes = await fetch('/api/telemetry?list=1', { cache: 'no-store' })
        if (!listRes.ok) {
          console.warn('[BatteryDashboard] 无法获取设备列表:', listRes.status)
          return
        }
        
        const listJson = await listRes.json()
        if (!Array.isArray(listJson.devices) || listJson.devices.length === 0) {
          console.warn('[BatteryDashboard] 设备列表为空')
          return
        }
        
        console.log('[BatteryDashboard] 发现设备:', listJson.devices)
        
        // 2. 并发加载所有设备的数据
        const devicePromises = listJson.devices.map(async (deviceId: string) => {
          try {
            console.log(`[BatteryDashboard] 加载设备 ${deviceId} 的数据...`)
            
            // 从数据库获取设备历史数据
            const history = await getDeviceHistory(deviceId)
            
            // 获取最新状态数据
            const res = await fetch(`/api/telemetry?device=${deviceId}&limit=1`, { cache: 'no-store' })
            if (!res.ok) {
              console.warn(`[BatteryDashboard] 设备 ${deviceId} 无最新数据:`, res.status)
              return null
            }
            
            const json = await res.json()
            if (!Array.isArray(json.data) || json.data.length === 0) {
              console.warn(`[BatteryDashboard] 设备 ${deviceId} 数据为空`)
              return null
            }
            
            const latestData = json.data[0]
            console.log(`[BatteryDashboard] 设备 ${deviceId} 最新数据:`, latestData)
            
            return {
              vehicleId: deviceId,
              currentLevel: typeof latestData.soc === 'number' ? latestData.soc : 0,
              voltage: typeof latestData.voltage === 'number' ? latestData.voltage : 0,
              temperature: typeof latestData.temperature === 'number' ? latestData.temperature : 0,
              health: typeof latestData.health === 'number' ? latestData.health : 95,
              cycleCount: typeof latestData.cycleCount === 'number' ? latestData.cycleCount : 0,
              estimatedRange: typeof latestData.estimatedRangeKm === 'number' ? latestData.estimatedRangeKm : 0,
              chargingStatus: (typeof latestData.chargingStatus === 'string' ? 
                latestData.chargingStatus : 'idle') as BatteryData['chargingStatus'],
              alerts: Array.isArray(latestData.alerts) ? latestData.alerts : [],
              lastProbe: 'From Database'
            }
          } catch (e) {
            console.error(`[BatteryDashboard] 设备 ${deviceId} 初始化失败:`, e)
            return null
          }
        })
        
        // 3. 等待所有设备数据加载完成
        const deviceResults = await Promise.all(devicePromises)
        const validDevices = deviceResults.filter(Boolean) as BatteryData[]
        
        if (validDevices.length > 0) {
          setBatteryData(validDevices)
          console.log(`[BatteryDashboard] 成功初始化 ${validDevices.length} 个设备`)
          
          // 如果没有选中设备，选择第一个
          if (!selectedVehicle && validDevices.length > 0) {
            setSelectedVehicle(validDevices[0].vehicleId)
          }
        }
        
      } catch (e) {
        console.error('[BatteryDashboard] 设备初始化失败:', e)
      }
    }
    
    initializeAllDevicesFromDatabase()
  }, [])

  // Topic design:
  // telemetry: fleet/+/battery (通配符订阅所有设备)
  // status:    fleet/+/status (通配符订阅所有设备)
  const BATTERY_TOPICS = ['fleet/+/battery'] // 使用通配符订阅所有设备
  const STATUS_TOPICS = ['fleet/+/status']   // 使用通配符订阅所有设备

  // 当切换选中车辆时：加载对应设备的历史数据（所有设备使用统一逻辑）
  useEffect(() => {
    if (!selectedVehicle) {
      setHistoryData([])
      return
    }

    const loadDeviceHistory = async () => {
      console.log(`[BatteryDashboard] 加载设备 ${selectedVehicle} 的历史数据...`)
      try {
        const history = await getDeviceHistory(selectedVehicle)
        setHistoryData(history)
        console.log(`[BatteryDashboard] 成功加载设备 ${selectedVehicle} 的历史数据:`, history.length, '条')
      } catch (e) {
        console.error(`[BatteryDashboard] 加载设备 ${selectedVehicle} 历史数据失败:`, e)
        setHistoryData([])
      }
    }

    loadDeviceHistory()
  }, [selectedVehicle])

  // 移除模拟数据更新 - 现在完全使用数据库驱动
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setBatteryData(prev => prev.map(battery => {
  //       if (battery.vehicleId === DEVICE_NAME) return battery // Skip PE-001, use Redis data only
  //       const change = (Math.random() - 0.5) * 2
  //       const newLevel = Math.max(0, Math.min(100, battery.currentLevel + change))
  //       return {
  //         ...battery,
  //         currentLevel: newLevel,
  //           voltage: 11.5 + (newLevel / 100) * 2 + (Math.random() - 0.5) * 0.2,
  //           temperature: battery.temperature + (Math.random() - 0.5) * 2,
  //           lastProbe: "Just now"
  //       }
  //     }))
  //   }, 5000)
  //   return () => clearInterval(interval)
  // }, [DEVICE_NAME])

  // MQTT connect + subscribe
  useEffect(() => {
    console.log('[BatteryDashboard] MQTT配置检查:', {
      MQTT_URL: MQTT_URL ? '已配置' : '未配置',
      MQTT_USERNAME: MQTT_USERNAME ? '已配置' : '未配置',
      MQTT_PASSWORD: MQTT_PASSWORD ? '已配置' : '未配置',
      BATTERY_TOPICS,
      STATUS_TOPICS
    })
    
    if (!MQTT_URL) {
      // 生产构建中未注入 URL -> 可能是 Netlify 未配置环境变量或部署前未设置
      if (mqttStatus === 'idle') console.warn('[BatteryDashboard] MQTT_URL missing: skip connect')
      return
    }
    setMqttStatus('connecting')
    console.log('[BatteryDashboard] 开始连接MQTT...', MQTT_URL)
    
    try {
      const client = mqtt.connect(MQTT_URL, {
        clientId: `dashboard_${Math.random().toString(36).slice(2,10)}`,
        username: MQTT_USERNAME || undefined,
        password: MQTT_PASSWORD || undefined,
        clean: true,
        reconnectPeriod: 5000,
        protocolVersion: 4
      })
      mqttRef.current = client
      
      client.on('connect', () => { 
        console.log('[BatteryDashboard] MQTT连接成功！订阅主题:', [...BATTERY_TOPICS, ...STATUS_TOPICS])
        setMqttStatus('connected'); 
        client.subscribe([...BATTERY_TOPICS, ...STATUS_TOPICS], (err) => {
          if (err) {
            console.error('[BatteryDashboard] 订阅失败:', err)
          } else {
            console.log('[BatteryDashboard] 订阅成功!')
          }
        })
      })
      
      client.on('error', (err) => {
        console.error('[BatteryDashboard] MQTT连接错误:', err)
        setMqttStatus('error')
      })
      
      client.on('message', (topic, payload) => {
        // 从topic中提取设备ID: fleet/PE-001/battery -> PE-001
        const topicParts = topic.split('/')
        if (topicParts.length < 3) return
        
        const deviceId = topicParts[1] // PE-001, PE-002, etc.
        const messageType = topicParts[2] // battery or status
        
        console.log('[BatteryDashboard] 收到MQTT消息:', { 
          topic, 
          deviceId, 
          messageType,
          payload: payload.toString(),
          timestamp: new Date().toISOString()
        })
        
        if (messageType === 'battery') {
          try {
            const json = JSON.parse(payload.toString()) as any
            lastTelemetryRef.current = Date.now()
            let histLevel: number | undefined
            let histVoltage: number | undefined
            let histTemperature: number | undefined
            
            setBatteryData(prev => {
              let found = false
              const updated = prev.map(b => {
                if (b.vehicleId !== deviceId) return b
                found = true
                const level = typeof json.soc === 'number' ? json.soc : b.currentLevel
                const voltage = typeof json.voltage === 'number' ? json.voltage : b.voltage
                const temperature = typeof json.temperature === 'number' ? json.temperature : b.temperature
                const health = typeof json.health === 'number' ? json.health : b.health
                const cycleCount = typeof json.cycleCount === 'number' ? json.cycleCount : b.cycleCount
                const estimatedRange = typeof json.estimatedRangeKm === 'number' ? json.estimatedRangeKm : b.estimatedRange
                const chargingStatus = (json.chargingStatus || b.chargingStatus) as BatteryData['chargingStatus']
                const alerts = Array.isArray(json.alerts) ? json.alerts as string[] : b.alerts
                histLevel = level; histVoltage = voltage; histTemperature = temperature
                return { ...b, currentLevel: level, voltage, temperature, health, cycleCount, estimatedRange, chargingStatus, alerts, lastProbe: 'Just now' }
              })
              
              if (!found) {
                // 新设备自动添加
                histLevel = json.soc ?? 0
                histVoltage = json.voltage ?? 0
                histTemperature = json.temperature ?? 0
                const newDevice = { 
                  vehicleId: deviceId, 
                  currentLevel: histLevel, 
                  voltage: histVoltage, 
                  temperature: histTemperature, 
                  health: json.health ?? 95, 
                  cycleCount: json.cycleCount ?? 0, 
                  estimatedRange: json.estimatedRangeKm ?? 0, 
                  chargingStatus: (json.chargingStatus || 'idle') as BatteryData['chargingStatus'], 
                  lastProbe: 'Just now', 
                  alerts: Array.isArray(json.alerts) ? json.alerts : [] 
                }
                updated.push(newDevice)
                console.log('[BatteryDashboard] 新设备已添加:', deviceId)
                
                // 如果当前没有选中设备，或者设备列表为空，自动选中新设备
                if (!selectedVehicle || updated.length === 1) {
                  setSelectedVehicle(deviceId)
                  console.log('[BatteryDashboard] 自动选中新设备:', deviceId)
                }
              }
              
              // 转发所有设备的完整telemetry到Redis
              if (histLevel !== undefined && histVoltage !== undefined && histTemperature !== undefined) {
                try {
                  fetch('/api/telemetry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      device: deviceId,
                      ts: Date.now(),
                      soc: histLevel,
                      voltage: histVoltage,
                      temperature: histTemperature,
                      health: json.health,
                      cycleCount: json.cycleCount,
                      estimatedRangeKm: json.estimatedRangeKm,
                      chargingStatus: json.chargingStatus,
                      alerts: json.alerts
                    })
                  }).catch((err) => {
                    console.error('[BatteryDashboard] 转发到Redis失败:', err)
                  })
                } catch (err) {
                  console.error('[BatteryDashboard] 转发到Redis异常:', err)
                }
              }
              
              // 更新设备历史（使用统一的deviceHistoryMap管理）
              if (deviceId && histLevel !== undefined && histVoltage !== undefined && histTemperature !== undefined) {
                const newHistoryPoint = {
                  time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  level: histLevel,
                  voltage: histVoltage,
                  temperature: histTemperature
                }
                
                // 添加到设备专用历史记录（这个函数会处理localStorage恢复和UI更新）
                addHistoryPoint(deviceId, newHistoryPoint)
              }
              return updated
            })
          } catch { /* ignore parse errors */ }
        } else if (messageType === 'status') {
          const statusTxt = payload.toString().trim().toLowerCase()
          setBatteryData(prev => prev.map(b => {
            if (b.vehicleId !== deviceId) return b
            return { ...b, lastProbe: statusTxt === 'online' ? 'Just now' : 'offline' }
          }))
        }
      })
    } catch {
      setMqttStatus('error')
    }
    return () => { mqttRef.current?.end(true); mqttRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [MQTT_URL, MQTT_USERNAME, MQTT_PASSWORD, selectedVehicle])

  // 数据过期检测 -> 10分钟无数据后添加警报
  useEffect(() => {
    const interval = setInterval(() => {
      const last = lastTelemetryRef.current
      if (!last) return
      if (Date.now() - last > 600000) {
        setBatteryData(prev => prev.map(b => ({
          ...b,
          alerts: b.alerts.includes('No recent telemetry') ? b.alerts : [...b.alerts, 'No recent telemetry']
        })))
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const probeAllBatteries = async () => {
    setIsProbing(true)
    // Simulate probing delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    setBatteryData(prev => prev.map(battery => ({
      ...battery,
      lastProbe: "Just now"
    })))

    setIsProbing(false)
  }

  const totalVehicles = batteryData.length
  const lowBatteryCount = batteryData.filter(b => b.currentLevel < 20).length
  const averageBattery = Math.round(batteryData.reduce((sum, b) => sum + b.currentLevel, 0) / totalVehicles)
  const alertCount = batteryData.reduce((sum, b) => sum + b.alerts.length, 0)

  const selectedBattery = batteryData.find(b => b.vehicleId === selectedVehicle)
  const mqttConfigHint = !MQTT_URL ? 'no-url' : (!MQTT_USERNAME && !MQTT_PASSWORD ? 'no-auth' : '')
  const mqttStatusBadge = (<span className="text-xs ml-2">MQTT: {mqttStatus}{mqttConfigHint && ` (${mqttConfigHint})`}</span>)

  // 手动重新加载历史数据（统一处理所有设备）
  const manualReloadHistory = async () => {
    if (!selectedVehicle) return
    
    try {
      console.log(`[BatteryDashboard] 手动重载设备 ${selectedVehicle} 的历史数据`)
      
      // 从数据库重新获取历史数据
      const res = await fetch(`/api/telemetry?device=${selectedVehicle}&limit=${STANDARD_LOAD_LIMIT}&_t=${Date.now()}`)
      if (!res.ok) {
        console.warn(`Device ${selectedVehicle} history reload HTTP error:`, res.status)
        setBatteryData(prev => prev.map(b => b.vehicleId === selectedVehicle ? {
          ...b,
          lastProbe: `Reload failed: HTTP ${res.status}`
        } : b))
        return
      }
      
      const json = await res.json()
      if (Array.isArray(json.data) && json.data.length > 0) {
        // 更新历史数据
        const serverHistory: BatteryHistoryPoint[] = json.data.map((d: any) => ({
          time: new Date(d.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          level: typeof d.soc === 'number' ? d.soc : 0,
          voltage: typeof d.voltage === 'number' ? d.voltage : 0,
          temperature: typeof d.temperature === 'number' ? d.temperature : 0
        }))
        
        // 保存到本地缓存
        saveDeviceHistory(selectedVehicle, serverHistory)
        
        // 更新图表显示
        setHistoryData([...serverHistory])
        
        // 更新设备状态
        const latest = json.data[0]
        if (latest) {
          setBatteryData(prev => prev.map(b => b.vehicleId === selectedVehicle ? {
            ...b,
            currentLevel: typeof latest.soc === 'number' ? latest.soc : b.currentLevel,
            voltage: typeof latest.voltage === 'number' ? latest.voltage : b.voltage,
            temperature: typeof latest.temperature === 'number' ? latest.temperature : b.temperature,
            health: typeof latest.health === 'number' ? latest.health : b.health,
            cycleCount: typeof latest.cycleCount === 'number' ? latest.cycleCount : b.cycleCount,
            estimatedRange: typeof latest.estimatedRangeKm === 'number' ? latest.estimatedRangeKm : b.estimatedRange,
            chargingStatus: typeof latest.chargingStatus === 'string' ? latest.chargingStatus as BatteryData['chargingStatus'] : b.chargingStatus,
            alerts: Array.isArray(latest.alerts) ? latest.alerts : b.alerts,
            lastProbe: 'Database Reload'
          } : b))
        }
        
        console.log(`[BatteryDashboard] 成功重载设备 ${selectedVehicle} 的 ${serverHistory.length} 条历史数据`)
      } else {
        console.warn(`[BatteryDashboard] Device ${selectedVehicle} reload no data`)
        setBatteryData(prev => prev.map(b => b.vehicleId === selectedVehicle ? {
          ...b,
          lastProbe: 'Reload: No data'
        } : b))
      }
    } catch (e) {
      console.error(`[BatteryDashboard] Device ${selectedVehicle} manual reload failed:`, e)
      setBatteryData(prev => prev.map(b => b.vehicleId === selectedVehicle ? {
        ...b,
        lastProbe: `Reload error: ${e instanceof Error ? e.message : 'Unknown error'}`
      } : b))
    }
  }

  // 将reload函数挂载到window对象，方便调试
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).reloadBatteryData = manualReloadHistory;
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Battery Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fleet Average</p>
                <p className="text-2xl font-bold">{averageBattery}%</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Battery className="w-4 h-4 text-green-600" />
              </div>
            </div>
            {mqttStatusBadge}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Battery</p>
                <p className="text-2xl font-bold text-red-600">{lowBatteryCount}</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <BatteryLow className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-orange-600">{alertCount}</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Probing</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={probeAllBatteries}
                  disabled={isProbing}
                  className="mt-1"
                >
                  {isProbing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4" />
                  )}
                  {isProbing ? "Probing..." : "Probe All"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Battery Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Individual Battery Status */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Battery Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg">Loading data</p>
                </div>
              ) : batteryData.length === 0 ? (
                <div className="text-center py-8">
                  <Battery className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium mb-2">暂无设备数据</p>
                  <p className="text-gray-400 text-sm">
                    当前数据库中没有找到任何设备，请确保设备已正确添加到系统中。
                  </p>
                </div>
              ) : (
                batteryData.map((battery) => (
                  <div
                    key={battery.vehicleId}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedVehicle === battery.vehicleId
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedVehicle(battery.vehicleId)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getBatteryIcon(battery.currentLevel, battery.chargingStatus)}
                        <span className="font-medium">{battery.vehicleId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getBatteryColor(battery.currentLevel)}`}>
                          {battery.currentLevel}%
                        </span>
                        {battery.chargingStatus === "charging" && (
                          <Badge variant="secondary">Charging</Badge>
                        )}
                      </div>
                    </div>

                    <Progress
                      value={battery.currentLevel}
                      className="mb-3"
                    />

                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <div>
                        <p>Voltage: {battery.voltage.toFixed(1)}V</p>
                      </div>
                      <div>
                        <p>Temp: {battery.temperature}°C</p>
                      </div>
                      <div>
                        <p>Health: {battery.health}%</p>
                      </div>
                    </div>

                    {battery.alerts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {battery.alerts.map((alert, index) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {alert}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      Last probe: {battery.lastProbe}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Battery History Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Battery History - {selectedVehicle}</CardTitle>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={syncCloudData}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-700"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync Cloud
              </Button>
              {selectedVehicle && historyData.length === 0 && (
                <Button size="sm" variant="outline" onClick={manualReloadHistory}>Reload History</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg">Loading data</p>
              </div>
            ) : batteryData.length === 0 ? (
              <div className="text-center py-16">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium mb-2">No Historical Data</p>
                <p className="text-gray-400 text-sm">
                  暂无设备可显示历史数据
                </p>
              </div>
            ) : !selectedVehicle ? (
              <div className="text-center py-16">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium mb-2">选择设备</p>
                <p className="text-gray-400 text-sm">
                  请从左侧选择一个设备查看历史数据
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <Area
                    type="monotone"
                    dataKey="level"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Vehicle Battery Analysis */}
      {selectedBattery && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Battery Health - {selectedVehicle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Overall Health</span>
                  <span className="font-bold text-lg">{selectedBattery.health}%</span>
                </div>
                <Progress value={selectedBattery.health} className="mb-2" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Cycle Count</p>
                    <p className="font-medium">{selectedBattery.cycleCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Est. Range</p>
                    <p className="font-medium">{selectedBattery.estimatedRange} km</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Voltage</span>
                  </div>
                  <span className="font-medium">{selectedBattery.voltage.toFixed(2)}V</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Temperature</span>
                  </div>
                  <span className="font-medium">{selectedBattery.temperature}°C</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">Last Probe</span>
                  </div>
                  <span className="font-medium">{selectedBattery.lastProbe}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">Status</span>
                  </div>
                  <Badge variant={selectedBattery.chargingStatus === "charging" ? "default" : "secondary"}>
                    {selectedBattery.chargingStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alerts & Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedBattery.alerts.length > 0 ? (
                <div className="space-y-2">
                  {selectedBattery.alerts.map((alert, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-700">{alert}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-700">No active alerts</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

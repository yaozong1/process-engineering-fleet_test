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

// Initial mock data for other vehicles; PE-001 will be overridden by Redis data
const mockBatteryData: BatteryData[] = [
  {
    vehicleId: "PE-001",
    currentLevel: 0, // Will be loaded from Redis
    voltage: 0,      // Will be loaded from Redis
    temperature: 0,  // Will be loaded from Redis
    health: 0,       // Will be loaded from Redis
    cycleCount: 0,   // Will be loaded from Redis
    estimatedRange: 0, // Will be loaded from Redis
    chargingStatus: "idle", // Will be loaded from Redis
    lastProbe: "Loading from Redis...",
    alerts: []
  },
  {
    vehicleId: "PE-002",
    currentLevel: 92,
    voltage: 13.2,
    temperature: 28,
    health: 98,
    cycleCount: 892,
    estimatedRange: 184,
    chargingStatus: "full",
    lastProbe: "1 min ago",
    alerts: []
  },
  {
    vehicleId: "PE-003",
    currentLevel: 15,
    voltage: 11.8,
    temperature: 45,
    health: 87,
    cycleCount: 2156,
    estimatedRange: 32,
    chargingStatus: "discharging",
    lastProbe: "45 secs ago",
    alerts: ["Low Battery", "High Temperature"]
  },
  {
    vehicleId: "PE-004",
    currentLevel: 65,
    voltage: 12.3,
    temperature: 35,
    health: 92,
    cycleCount: 1543,
    estimatedRange: 130,
    chargingStatus: "charging",
    lastProbe: "2 mins ago",
    alerts: []
  },
  {
    vehicleId: "PE-005",
    currentLevel: 43,
    voltage: 12.1,
    temperature: 38,
    health: 89,
    cycleCount: 1876,
    estimatedRange: 86,
    chargingStatus: "discharging",
    lastProbe: "1 min ago",
    alerts: ["Moderate Battery"]
  }
]

// Generate mock historical data
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
  const [batteryData, setBatteryData] = useState<BatteryData[]>(mockBatteryData)
  const [selectedVehicle, setSelectedVehicle] = useState<string>("PE-001")
  const [historyData, setHistoryData] = useState<BatteryHistoryPoint[]>([])
  const [isProbing, setIsProbing] = useState(false)
  const mqttRef = useRef<MqttClient | null>(null)
  const [mqttStatus, setMqttStatus] = useState<'idle'|'connecting'|'connected'|'error'>('idle')
  const lastTelemetryRef = useRef<number | null>(null)
  // 环形历史缓冲：仅针对来自 MQTT 的 DEVICE_NAME 设备，保存最近 200 条 (level/voltage/temperature)
  const deviceHistoryRef = useRef<BatteryHistoryPoint[]>([])

  // Config via env (must be NEXT_PUBLIC_ to be exposed client-side)
  const MQTT_URL = process.env.NEXT_PUBLIC_MQTT_URL || '' // e.g. wss://xxxxx.hivemq.cloud:8884/mqtt
  const MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME || ''
  const MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD || ''
  const PRODUCT_KEY = process.env.NEXT_PUBLIC_PRODUCT_KEY || 'i0skgstk2Ek'
  const DEVICE_NAME = process.env.NEXT_PUBLIC_DEVICE_NAME || 'PE-001'

  // 可配置：最大条数 & 最长保留时间（毫秒，0 表示不按时间裁剪）
  const MAX_HISTORY = 200 // 本地环形总容量仍保留 200
  const INITIAL_LOAD_LIMIT = 100 // 刷新后初始只加载服务器最近 100 条
  const MAX_AGE_MS = 0 // 例如想限制 2 小时可设为 2 * 60 * 60 * 1000
  const LS_KEY = `battery_history_${DEVICE_NAME}`

  // 初始恢复 localStorage 中缓存（仅客户端执行）
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEY) : null
      if (raw) {
        const parsed = JSON.parse(raw) as BatteryHistoryPoint[]
        if (Array.isArray(parsed)) {
          let arr = parsed
          if (MAX_AGE_MS > 0) {
            // time trimming skipped
          }
          if (arr.length > MAX_HISTORY) arr = arr.slice(-MAX_HISTORY)
          deviceHistoryRef.current = arr
          if (selectedVehicle === DEVICE_NAME) setHistoryData([...arr])
          // Use last local history value to seed currentLevel
          const last = arr[arr.length - 1]
          if (last) {
            setBatteryData(prev => prev.map(b => b.vehicleId === DEVICE_NAME ? { 
              ...b, 
              currentLevel: last.level, 
              voltage: last.voltage, 
              temperature: last.temperature,
              lastProbe: 'From localStorage'
            } : b))
          }
        }
      }
    } catch { /* ignore */ }
    ;(async () => {
      try {
        console.log('[BatteryDashboard] fetching initial history...')
        const res = await fetch(`/api/telemetry?device=${DEVICE_NAME}&limit=${INITIAL_LOAD_LIMIT}`, { cache: 'no-store' })
        console.log('[BatteryDashboard] fetch response status:', res.status, res.ok)
        if (res.ok) {
          const json = await res.json()
          console.log('[BatteryDashboard] initial fetch response:', json)
          if (Array.isArray(json.data) && json.data.length > 0) {
            console.log('[BatteryDashboard] initial data array length:', json.data.length)
            // json.data: [{device, ts, soc, voltage, temperature, health, cycleCount, estimatedRangeKm, chargingStatus, alerts}]
            const serverArr: BatteryHistoryPoint[] = json.data.map((d: any) => ({
              time: new Date(d.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              level: typeof d.soc === 'number' ? d.soc : 0,
              voltage: typeof d.voltage === 'number' ? d.voltage : 0,
              temperature: typeof d.temperature === 'number' ? d.temperature : 0
            }))
            console.log('[BatteryDashboard] initial mapped serverArr:', serverArr)
            let merged = serverArr
            if (merged.length > MAX_HISTORY) merged = merged.slice(-MAX_HISTORY)
            deviceHistoryRef.current = merged
            if (typeof window !== 'undefined') {
              try { window.localStorage.setItem(LS_KEY, JSON.stringify(merged)) } catch {}
            }
            if (selectedVehicle === DEVICE_NAME) setHistoryData([...merged])
            // Update PE-001 with complete data from last server record
            const last = json.data[json.data.length - 1]
            console.log('[BatteryDashboard] initial last data point:', last)
            if (last) {
              console.log('[BatteryDashboard] initial updating complete data from Redis')
              setBatteryData(prev => {
                const updated = prev.map(b => b.vehicleId === DEVICE_NAME ? {
                  ...b,
                  currentLevel: typeof last.soc === 'number' ? last.soc : b.currentLevel,
                  voltage: typeof last.voltage === 'number' ? last.voltage : b.voltage,
                  temperature: typeof last.temperature === 'number' ? last.temperature : b.temperature,
                  health: typeof last.health === 'number' ? last.health : b.health,
                  cycleCount: typeof last.cycleCount === 'number' ? last.cycleCount : b.cycleCount,
                  estimatedRange: typeof last.estimatedRangeKm === 'number' ? last.estimatedRangeKm : b.estimatedRange,
                  chargingStatus: typeof last.chargingStatus === 'string' ? last.chargingStatus as BatteryData['chargingStatus'] : b.chargingStatus,
                  alerts: Array.isArray(last.alerts) ? last.alerts : b.alerts,
                  lastProbe: 'From Redis'
                } : b)
                console.log('[BatteryDashboard] initial updated batteryData:', updated)
                return updated
              })
            }
          } else {
            console.log('[BatteryDashboard] No data returned from Redis, using fallback values')
            setBatteryData(prev => prev.map(b => b.vehicleId === DEVICE_NAME ? {
              ...b,
              currentLevel: 75, // Fallback value for testing
              voltage: 12.2,    // Fallback value for testing
              temperature: 26,  // Fallback value for testing
              health: 95,       // Fallback value for testing
              cycleCount: 234,  // Fallback value for testing
              estimatedRange: 250, // Fallback value for testing
              chargingStatus: 'idle' as BatteryData['chargingStatus'],
              lastProbe: 'No Redis data - using fallback'
            } : b))
          }
        } else {
          console.error('[BatteryDashboard] fetch failed with status:', res.status)
          setBatteryData(prev => prev.map(b => b.vehicleId === DEVICE_NAME ? {
            ...b,
            currentLevel: 60, // Fallback value for API error
            voltage: 11.9,    // Fallback value for API error
            temperature: 29,  // Fallback value for API error
            health: 92,       // Fallback value for API error
            cycleCount: 156,  // Fallback value for API error
            estimatedRange: 180, // Fallback value for API error
            chargingStatus: 'idle' as BatteryData['chargingStatus'],
            lastProbe: `Redis fetch error: ${res.status} - using fallback`
          } : b))
        }
      } catch (e) {
        console.error('[BatteryDashboard] fetch shared history failed', e)
        setBatteryData(prev => prev.map(b => b.vehicleId === DEVICE_NAME ? {
          ...b,
          currentLevel: 45, // Fallback value for network error
          voltage: 11.7,    // Fallback value for network error
          temperature: 32,  // Fallback value for network error
          health: 89,       // Fallback value for network error
          cycleCount: 89,   // Fallback value for network error
          estimatedRange: 135, // Fallback value for network error
          chargingStatus: 'idle' as BatteryData['chargingStatus'],
          lastProbe: `Redis error: ${e instanceof Error ? e.message : 'Unknown error'} - using fallback`
        } : b))
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Topic design:
  // telemetry: fleet/PE-001/battery, fleet/PE-002/battery, etc.
  // status:    fleet/PE-001/status, fleet/PE-002/status, etc.
  const BATTERY_TOPIC_PATTERN = 'fleet/PE-+/battery'
  const STATUS_TOPIC_PATTERN = 'fleet/PE-+/status'

  // 当切换选中车辆时：如果是 MQTT 设备 -> 使用实时环形历史；否则生成模拟历史
  useEffect(() => {
    if (selectedVehicle === DEVICE_NAME) {
      setHistoryData([...deviceHistoryRef.current])
    } else {
      setHistoryData(generateHistoryData(selectedVehicle))
    }
  }, [selectedVehicle, DEVICE_NAME])

  // Simulated probing for non-MQTT vehicles only (PE-001 uses Redis data)
  useEffect(() => {
    const interval = setInterval(() => {
      setBatteryData(prev => prev.map(battery => {
        if (battery.vehicleId === DEVICE_NAME) return battery // Skip PE-001, use Redis data only
        const change = (Math.random() - 0.5) * 2
        const newLevel = Math.max(0, Math.min(100, battery.currentLevel + change))
        return {
          ...battery,
          currentLevel: newLevel,
            voltage: 11.5 + (newLevel / 100) * 2 + (Math.random() - 0.5) * 0.2,
            temperature: battery.temperature + (Math.random() - 0.5) * 2,
            lastProbe: "Just now"
        }
      }))
    }, 5000)
    return () => clearInterval(interval)
  }, [DEVICE_NAME])

  // MQTT connect + subscribe
  useEffect(() => {
    if (!MQTT_URL) {
      // 生产构建中未注入 URL -> 可能是 Netlify 未配置环境变量或部署前未设置
      if (mqttStatus === 'idle') console.warn('[BatteryDashboard] MQTT_URL missing: skip connect')
      return
    }
    setMqttStatus('connecting')
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
        setMqttStatus('connected'); 
        client.subscribe([BATTERY_TOPIC_PATTERN, STATUS_TOPIC_PATTERN]) 
      })
      client.on('error', () => setMqttStatus('error'))
      client.on('message', (topic, payload) => {
        // 从topic中提取设备ID: fleet/PE-001/battery -> PE-001
        const topicParts = topic.split('/')
        if (topicParts.length < 3) return
        
        const deviceId = topicParts[1] // PE-001, PE-002, etc.
        const messageType = topicParts[2] // battery or status
        
        console.log('[BatteryDashboard] 收到MQTT消息:', { topic, deviceId, messageType })
        
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
                updated.push({ 
                  vehicleId: deviceId, 
                  currentLevel: histLevel, 
                  voltage: histVoltage, 
                  temperature: histTemperature, 
                  health: json.health ?? 95, 
                  cycleCount: json.cycleCount ?? 0, 
                  estimatedRange: json.estimatedRangeKm ?? 0, 
                  chargingStatus: (json.chargingStatus || 'idle'), 
                  lastProbe: 'Just now', 
                  alerts: Array.isArray(json.alerts) ? json.alerts : [] 
                })
                console.log('[BatteryDashboard] 新设备已添加:', deviceId)
              }
              
              // 更新环形历史（仅针对当前选中设备）
              if (deviceId === selectedVehicle && histLevel !== undefined && histVoltage !== undefined && histTemperature !== undefined) {
                const arr = deviceHistoryRef.current
                arr.push({
                  time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  level: histLevel,
                  voltage: histVoltage,
                  temperature: histTemperature
                })
                if (arr.length > MAX_HISTORY) arr.shift()
                
                // 写入 localStorage（轻量，200 条以内）
                const lsKey = `battery_history_${deviceId}`
                try { if (typeof window !== 'undefined') window.localStorage.setItem(lsKey, JSON.stringify(arr)) } catch { /* ignore */ }
                
                // 转发完整telemetry到共享历史
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
                  }).catch(() => {})
                } catch { /* ignore */ }
                
                // 触发图表刷新
                setHistoryData([...arr])
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
  }, [MQTT_URL, MQTT_USERNAME, MQTT_PASSWORD, BATTERY_TOPIC_PATTERN, STATUS_TOPIC_PATTERN, selectedVehicle])

  // Staleness detection -> add alert after 10 minutes (600000 ms) silence.
  useEffect(() => {
    const interval = setInterval(() => {
      const last = lastTelemetryRef.current
      if (!last) return
  if (Date.now() - last > 600000) {
        setBatteryData(prev => prev.map(b => {
          if (b.vehicleId !== DEVICE_NAME) return b
          return { ...b, alerts: b.alerts.includes('No recent telemetry') ? b.alerts : [...b.alerts, 'No recent telemetry'] }
        }))
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [DEVICE_NAME])

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

  // 手动重新加载历史数据（公开函数，可供外部调用）
  const manualReloadHistory = async () => {
    try {
      console.log('[BatteryDashboard] manual reload history from server')
      const res = await fetch(`/api/telemetry?device=${DEVICE_NAME}&limit=${INITIAL_LOAD_LIMIT}&_t=${Date.now()}`)
      console.log('[BatteryDashboard] manual reload response status:', res.status, res.ok)
      if (!res.ok) { 
        console.warn('history reload http error', res.status)
        setBatteryData(prev => prev.map(b => b.vehicleId === DEVICE_NAME ? {
          ...b,
          lastProbe: `Reload failed: HTTP ${res.status}`
        } : b))
        return 
      }
      const json = await res.json()
      console.log('[BatteryDashboard] received data:', json)
      if (Array.isArray(json.data) && json.data.length > 0) {
        console.log('[BatteryDashboard] data array length:', json.data.length)
        const serverArr: BatteryHistoryPoint[] = json.data.map((d: any) => ({
          time: new Date(d.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          level: typeof d.soc === 'number' ? d.soc : 0,
          voltage: typeof d.voltage === 'number' ? d.voltage : 0,
          temperature: typeof d.temperature === 'number' ? d.temperature : 0
        }))
        console.log('[BatteryDashboard] mapped serverArr:', serverArr)
        deviceHistoryRef.current = serverArr
        try { window.localStorage.setItem(LS_KEY, JSON.stringify(serverArr)) } catch {}
        if (selectedVehicle === DEVICE_NAME) setHistoryData([...serverArr])
        const last = json.data[json.data.length - 1]
        console.log('[BatteryDashboard] last data point:', last)
        if (last) {
          console.log('[BatteryDashboard] updating complete data from Redis')
          setBatteryData(prev => {
            const updated = prev.map(b => b.vehicleId === DEVICE_NAME ? {
              ...b,
              currentLevel: typeof last.soc === 'number' ? last.soc : b.currentLevel,
              voltage: typeof last.voltage === 'number' ? last.voltage : b.voltage,
              temperature: typeof last.temperature === 'number' ? last.temperature : b.temperature,
              health: typeof last.health === 'number' ? last.health : b.health,
              cycleCount: typeof last.cycleCount === 'number' ? last.cycleCount : b.cycleCount,
              estimatedRange: typeof last.estimatedRangeKm === 'number' ? last.estimatedRangeKm : b.estimatedRange,
              chargingStatus: typeof last.chargingStatus === 'string' ? last.chargingStatus as BatteryData['chargingStatus'] : b.chargingStatus,
              alerts: Array.isArray(last.alerts) ? last.alerts : b.alerts,
              lastProbe: 'From Redis (reload)'
            } : b)
            console.log('[BatteryDashboard] updated batteryData:', updated)
            return updated
          })
        }
      } else {
        console.warn('[BatteryDashboard] No data in reload response:', json)
        setBatteryData(prev => prev.map(b => b.vehicleId === DEVICE_NAME ? {
          ...b,
          lastProbe: 'Reload: No data found'
        } : b))
      }
    } catch (e) {
      console.error('[BatteryDashboard] manual reload failed', e)
      setBatteryData(prev => prev.map(b => b.vehicleId === DEVICE_NAME ? {
        ...b,
        lastProbe: `Reload error: ${e instanceof Error ? e.message : 'Unknown'}`
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
              {batteryData.map((battery) => (
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
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Battery History Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Battery History - {selectedVehicle}</CardTitle>
            {selectedVehicle === DEVICE_NAME && historyData.length === 0 && (
              <Button size="sm" variant="outline" onClick={manualReloadHistory}>Reload History</Button>
            )}
          </CardHeader>
          <CardContent>
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

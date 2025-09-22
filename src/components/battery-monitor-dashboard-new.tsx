"use client"

import { useState, useEffect } from "react"
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
import { useDeviceData } from "@/contexts/DeviceDataContext"

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
  gps?: { lat?: number; lng?: number; speed?: number }
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
  console.log('[BatteryDashboard] 组件开始渲染')
  
  // 使用全局设备数据Context
  const {
    devicesData,
    devicesList,
    getDeviceData,
    getDeviceHistory,
    getDeviceStatus,
    startPolling,
    stopPolling,
    isPolling,
    refreshAllDevices,
    refreshDeviceData
  } = useDeviceData()
  
  const [selectedVehicle, setSelectedVehicle] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  
  // 将Context数据转换为组件需要的格式
  const batteryData: BatteryData[] = devicesList.map(deviceId => {
    const deviceData = getDeviceData(deviceId)
    const status = getDeviceStatus(deviceId)
    
    if (!deviceData) {
      return {
        vehicleId: deviceId,
        currentLevel: 0,
        voltage: 0,
        temperature: 0,
        health: 0,
        cycleCount: 0,
        estimatedRange: 0,
        chargingStatus: "idle" as const,
        lastProbe: "Never",
        alerts: ["No data"],
        gps: undefined
      }
    }
    
    return {
      vehicleId: deviceId,
      currentLevel: deviceData.soc || 0,
      voltage: deviceData.voltage || 0,
      temperature: deviceData.temperature || 0,
      health: deviceData.health || 0,
      cycleCount: deviceData.cycleCount || 0,
      estimatedRange: deviceData.estimatedRangeKm || 0,
      chargingStatus: (deviceData.chargingStatus as any) || "idle",
      lastProbe: new Date(deviceData.ts).toLocaleString(),
      alerts: deviceData.alerts || [],
      gps: deviceData.gps ? {
        lat: deviceData.gps.lat,
        lng: deviceData.gps.lng,
        speed: deviceData.gps.speed
      } : undefined
    }
  })
  
  // 获取选中设备的历史数据
  const historyData = selectedVehicle ? getDeviceHistory(selectedVehicle) : []
  
  // 选择第一个设备（如果还没选择）
  useEffect(() => {
    if (!selectedVehicle && devicesList.length > 0) {
      setSelectedVehicle(devicesList[0])
      console.log(`[BatteryDashboard] 自动选择设备: ${devicesList[0]}`)
    }
  }, [selectedVehicle, devicesList])
  
  // 组件挂载时开始轮询
  useEffect(() => {
    console.log('[BatteryDashboard] 组件挂载，开始数据轮询')
    startPolling()
    setIsLoading(false)
    
    return () => {
      console.log('[BatteryDashboard] 组件卸载，停止数据轮询')
      stopPolling()
    }
  }, [startPolling, stopPolling])
  
  // 手动刷新
  const handleRefresh = async () => {
    setIsLoading(true)
    await refreshAllDevices()
    setIsLoading(false)
  }
  
  // 同步云端数据
  const syncCloudData = async () => {
    setIsLoading(true)
    console.log('[BatteryDashboard] 开始手动同步云端数据...')
    
    if (selectedVehicle) {
      // 获取选中设备的完整历史数据
      try {
        const response = await fetch(`/api/telemetry?device=${selectedVehicle}&limit=200`)
        if (response.ok) {
          const result = await response.json()
          if (result.data && result.data.length > 0) {
            console.log(`[BatteryDashboard] 从云端获取了 ${result.data.length} 条历史数据`)
          }
        }
      } catch (error) {
        console.error('[BatteryDashboard] 同步云端数据失败:', error)
      }
    }
    
    await refreshAllDevices()
    setIsLoading(false)
  }

  if (isLoading && batteryData.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">加载电池数据中...</p>
          </div>
        </div>
      </div>
    )
  }

  const selectedBattery = batteryData.find(b => b.vehicleId === selectedVehicle)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">电池监控</h1>
          <p className="text-muted-foreground">实时监控车队电池状态和性能指标</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={syncCloudData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            {isPolling ? '轮询中' : '离线模式'}
          </Button>
        </div>
      </div>

      {/* Vehicle Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="w-5 h-5" />
            车辆选择
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {batteryData.map((battery) => {
              const isSelected = selectedVehicle === battery.vehicleId
              const status = getDeviceStatus(battery.vehicleId)
              
              return (
                <button
                  key={battery.vehicleId}
                  onClick={() => setSelectedVehicle(battery.vehicleId)}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      {getBatteryIcon(battery.currentLevel, battery.chargingStatus)}
                      <span className="font-semibold">{battery.vehicleId}</span>
                    </div>
                    <div className="space-y-1">
                      <div className={`text-2xl font-bold ${getBatteryColor(battery.currentLevel)}`}>
                        {battery.currentLevel}%
                      </div>
                      <div className="flex justify-center">
                        <Badge variant={status.isOnline ? "default" : "secondary"} className="text-xs">
                          {status.isOnline ? "在线" : "离线"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {selectedBattery && (
        <>
          {/* Battery Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">电量水平</CardTitle>
                {getBatteryIcon(selectedBattery.currentLevel, selectedBattery.chargingStatus)}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getBatteryColor(selectedBattery.currentLevel)}`}>
                  {selectedBattery.currentLevel}%
                </div>
                <Progress value={selectedBattery.currentLevel} className="mt-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedBattery.chargingStatus === "charging" ? "充电中" :
                   selectedBattery.chargingStatus === "discharging" ? "放电中" : "待机"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">电压</CardTitle>
                <Zap className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedBattery.voltage.toFixed(2)}V</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedBattery.voltage > 12 ? "正常" : "偏低"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">温度</CardTitle>
                <Thermometer className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedBattery.temperature.toFixed(1)}°C</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedBattery.temperature > 40 ? "偏高" : 
                   selectedBattery.temperature < 0 ? "偏低" : "正常"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">续航里程</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedBattery.estimatedRange}km</div>
                <p className="text-xs text-muted-foreground mt-2">
                  基于当前电量估算
                </p>
              </CardContent>
            </Card>
          </div>

          {/* History Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                电池历史 - {selectedVehicle}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncCloudData}
                  disabled={isLoading}
                  className="ml-auto flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  同步云端
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historyData}>
                    <defs>
                      <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      label={{ value: '电量 (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="level" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorLevel)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Activity className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">暂无历史数据</p>
                    <p className="text-sm text-gray-500 mt-2">等待设备数据更新...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          {selectedBattery.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  警报信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedBattery.alerts.map((alert, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">{alert}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Device Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                设备信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">健康度</p>
                  <p className="text-lg font-semibold">{selectedBattery.health}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">充放电循环</p>
                  <p className="text-lg font-semibold">{selectedBattery.cycleCount}次</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">最后更新</p>
                  <p className="text-lg font-semibold">{selectedBattery.lastProbe}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
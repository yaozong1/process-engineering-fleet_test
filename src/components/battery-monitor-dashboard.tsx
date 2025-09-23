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
import { useDeviceData } from "../contexts/DeviceDataContext"

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
    refreshDeviceData,
    syncCloudHistory
  } = useDeviceData()
  
  const [selectedVehicle, setSelectedVehicle] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  // 页面挂载时强制刷新数据，确保显示最新信息
  useEffect(() => {
    console.log('[BatteryDashboard] 页面挂载，强制刷新设备数据')
    refreshAllDevices()
  }, [refreshAllDevices])
  
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
  
  // 获取选中设备的历史数据，转换为图表所需格式
  const historyData = selectedVehicle ? getDeviceHistory(selectedVehicle).map((item, index) => ({
    time: item.time,
    level: item.level || 0,
    voltage: item.voltage || 0,
    temperature: item.temperature || 0
  })) : [] // 数据已经按时间顺序排列（最旧在前，最新在后）
  
  // 选择第一个设备（如果还没选择）
  useEffect(() => {
    if (!selectedVehicle && devicesList.length > 0) {
      setSelectedVehicle(devicesList[0])
      console.log(`[BatteryDashboard] 自动选择设备: ${devicesList[0]}`)
    }
  }, [selectedVehicle, devicesList])
  
  // 当选择设备变化时，加载该设备的历史数据
  useEffect(() => {
    if (selectedVehicle) {
      const existingHistory = getDeviceHistory(selectedVehicle)
      if (existingHistory.length === 0) {
        console.log(`[BatteryDashboard] 为设备 ${selectedVehicle} 加载历史数据`)
        // 刷新单个设备数据来获取历史
        refreshDeviceData(selectedVehicle)
      }
    }
  }, [selectedVehicle, refreshDeviceData, getDeviceHistory])
  
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
    console.log('[BatteryDashboard] 开始手动同步云端数据和历史记录...')
    
    try {
      // 同步云端历史数据
      await syncCloudHistory()
      
      // 刷新所有设备数据
      await refreshAllDevices()
      
      console.log('[BatteryDashboard] 云端数据和历史记录同步完成')
    } catch (error) {
      console.error('[BatteryDashboard] 同步云端数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && batteryData.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading battery data...</p>
          </div>
        </div>
      </div>
    )
  }

  const selectedBattery = batteryData.find(b => b.vehicleId === selectedVehicle)

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Battery Monitor</h1>
          <p className="text-muted-foreground">Real-time fleet battery status and performance monitoring</p>
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
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={syncCloudData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            {isPolling ? 'Polling' : 'Offline Mode'}
          </Button>
        </div>
      </div>

      {/* Main Content - Left-Right Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Vehicle List */}
        <div className="w-[700px] border-r bg-gray-50/50">
          <Card className="h-full rounded-none border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Battery className="w-5 h-5" />
                Vehicle List
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="h-[calc(100vh-180px)] overflow-y-auto px-6">
                <div className="space-y-3">
                  {batteryData.map((battery) => {
                    const isSelected = selectedVehicle === battery.vehicleId
                    const status = getDeviceStatus(battery.vehicleId)
                    
                    return (
                      <button
                        key={battery.vehicleId}
                        onClick={() => setSelectedVehicle(battery.vehicleId)}
                        className={`w-full p-4 rounded-lg border-2 transition-all hover:shadow-md text-left ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Left: Icon and Vehicle ID */}
                          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                            {getBatteryIcon(battery.currentLevel, battery.chargingStatus)}
                            <span className="font-semibold text-base">{battery.vehicleId}</span>
                            <Badge variant={!status.isOnline ? "secondary" : "default"} className="text-xs">
                              {status.isOnline ? "Online" : "Offline"}
                            </Badge>
                          </div>
                          
                          {/* Middle: Battery Level */}
                          <div className="flex-1 px-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-600">Battery</span>
                              <span className={`text-lg font-bold ${getBatteryColor(battery.currentLevel)}`}>
                                {battery.currentLevel}%
                              </span>
                            </div>
                            <Progress value={battery.currentLevel} className="h-2" />
                          </div>
                          
                          {/* Right: Details */}
                          <div className="flex flex-col text-xs text-gray-600 text-right min-w-0 flex-shrink-0 space-y-1">
                            <div>
                              <span className="font-medium">{battery.voltage.toFixed(1)}V</span>
                            </div>
                            <div>
                              <span className="font-medium">{battery.temperature.toFixed(1)}°C</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {battery.chargingStatus === "charging" ? "🔌" :
                               battery.chargingStatus === "discharging" ? "🔋" : "⏸️"}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Selected Vehicle Details */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

      {selectedBattery && (
        <>
          {/* Battery Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Battery Level</CardTitle>
                {getBatteryIcon(selectedBattery.currentLevel, selectedBattery.chargingStatus)}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getBatteryColor(selectedBattery.currentLevel)}`}>
                  {selectedBattery.currentLevel}%
                </div>
                <Progress value={selectedBattery.currentLevel} className="mt-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedBattery.chargingStatus === "charging" ? "Charging" :
                   selectedBattery.chargingStatus === "discharging" ? "Discharging" : "Idle"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Voltage</CardTitle>
                <Zap className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedBattery.voltage.toFixed(2)}V</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedBattery.voltage > 12 ? "Normal" : "Low"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                <Thermometer className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedBattery.temperature.toFixed(1)}°C</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedBattery.temperature > 40 ? "High" : 
                   selectedBattery.temperature < 0 ? "Low" : "Normal"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Range</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedBattery.estimatedRange}km</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Estimated based on current battery
                </p>
              </CardContent>
            </Card>
          </div>

          {/* History Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Battery History - {selectedVehicle}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncCloudData}
                  disabled={isLoading}
                  className="ml-auto flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Sync Cloud
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
                      label={{ value: 'Battery (%)', angle: -90, position: 'insideLeft' }}
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
                    <p className="text-gray-600">No historical data</p>
                    <p className="text-sm text-gray-500 mt-2">Waiting for device data updates...</p>
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
                  Alert Information
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
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Health</p>
                  <p className="text-lg font-semibold">{selectedBattery.health}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Charge Cycles</p>
                  <p className="text-lg font-semibold">{selectedBattery.cycleCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Updated</p>
                  <p className="text-lg font-semibold">{selectedBattery.lastProbe}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      
      {!selectedBattery && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Battery className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">Select Vehicle</h3>
            <p className="text-gray-600">Please select a vehicle from the left panel to view details</p>
          </div>
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  )
}
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
  Thermometer,
  Wifi,
  WifiOff
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts"
import { useAllVehicleData } from "@/hooks/use-mqtt"
import { VehicleBatteryData } from "@/lib/mqtt-config"

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

// Mock battery data for fallback
const mockBatteryData: BatteryData[] = [
  {
    vehicleId: "PE-001",
    currentLevel: 78,
    voltage: 12.6,
    temperature: 32,
    health: 95,
    cycleCount: 1247,
    estimatedRange: 156,
    chargingStatus: "discharging",
    lastProbe: "30 secs ago",
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

// Convert MQTT battery data to local format
function convertMQTTBatteryData(mqttData: VehicleBatteryData): BatteryData {
  const alerts: string[] = []

  if (mqttData.level < 20) {
    alerts.push("Low Battery")
  } else if (mqttData.level < 50) {
    alerts.push("Moderate Battery")
  }

  if (mqttData.temperature > 40) {
    alerts.push("High Temperature")
  }

  if (mqttData.health < 80) {
    alerts.push("Battery Health Low")
  }

  return {
    vehicleId: mqttData.vehicleId,
    currentLevel: mqttData.level,
    voltage: mqttData.voltage,
    temperature: mqttData.temperature,
    health: mqttData.health,
    cycleCount: mqttData.cycleCount,
    estimatedRange: mqttData.estimatedRange,
    chargingStatus: mqttData.chargingStatus,
    lastProbe: "Live data",
    alerts
  }
}

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

  // MQTT集成
  const {
    isConnected: mqttConnected,
    isConnecting: mqttConnecting,
    error: mqttError,
    vehicleData: mqttVehicleData,
    connect: connectMQTT,
    disconnect: disconnectMQTT
  } = useAllVehicleData()

  // 将MQTT数据转换为电池数据格式
  useEffect(() => {
    if (mqttConnected && mqttVehicleData.size > 0) {
      const mqttBatteryData: BatteryData[] = []

      mqttVehicleData.forEach((data, vehicleId) => {
        if (data.battery) {
          const batteryInfo = convertMQTTBatteryData(data.battery)
          mqttBatteryData.push(batteryInfo)
        }
      })

      if (mqttBatteryData.length > 0) {
        setBatteryData(mqttBatteryData)
      }
    }
  }, [mqttConnected, mqttVehicleData])

  useEffect(() => {
    setHistoryData(generateHistoryData(selectedVehicle))
  }, [selectedVehicle])

  // Simulate real-time battery probing for mock data
  useEffect(() => {
    if (mqttConnected) return // Don't simulate if MQTT is connected

    const interval = setInterval(() => {
      setBatteryData(prev => prev.map(battery => {
        const change = (Math.random() - 0.5) * 2 // ±1% change
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
  }, [mqttConnected])

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

  return (
    <div className="space-y-6">
      {/* MQTT状态指示器 */}
      <Card className={`border-l-4 ${mqttConnected ? 'border-l-green-500 bg-green-50' : mqttError ? 'border-l-red-500 bg-red-50' : 'border-l-yellow-500 bg-yellow-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {mqttConnected ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <p className="font-medium">
                  MQTT Battery Data: {mqttConnecting ? "Connecting..." : mqttConnected ? "Live" : "Simulated"}
                </p>
                {mqttError && (
                  <p className="text-sm text-red-600">Error: {mqttError}</p>
                )}
                {!mqttConnected && !mqttError && (
                  <p className="text-sm text-gray-600">Using mock battery data</p>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              {!mqttConnected && (
                <Button
                  size="sm"
                  onClick={connectMQTT}
                  disabled={mqttConnecting}
                >
                  {mqttConnecting ? "Connecting..." : "Connect MQTT"}
                </Button>
              )}
              {mqttConnected && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={disconnectMQTT}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div className="mt-2 flex items-center text-sm">
              <span className={mqttConnected ? "text-green-600" : "text-blue-600"}>
                {mqttConnected ? "🔴 Live" : "📊 Mock"}
              </span>
            </div>
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
                  disabled={isProbing || mqttConnected}
                  className="mt-1"
                >
                  {isProbing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4" />
                  )}
                  {mqttConnected ? "Live" : isProbing ? "Probing..." : "Probe All"}
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
            <CardTitle className="flex items-center gap-2">
              Vehicle Battery Status
              {mqttConnected && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Live MQTT Data
                </Badge>
              )}
            </CardTitle>
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
                      {mqttConnected && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live Data" />
                      )}
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
          <CardHeader>
            <CardTitle>Battery History - {selectedVehicle}</CardTitle>
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
              <CardTitle className="flex items-center gap-2">
                Battery Health - {selectedVehicle}
                {mqttConnected && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    Live
                  </Badge>
                )}
              </CardTitle>
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

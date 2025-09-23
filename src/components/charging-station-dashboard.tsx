"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Zap, Power, Clock, Gauge, RefreshCw, AlertCircle, Battery } from "lucide-react"

// 充电桩数据接口
export interface ChargingStation {
  id: string
  name: string
  status: "idle" | "charging" | "fault" | "offline" | "occupied"
  voltage?: number        // 电压 (V)
  current?: number        // 电流 (A)
  power?: number          // 功率 (kW)
  energy?: number         // 已充电能量 (kWh)
  remainingTime?: number  // 剩余时间 (分钟)
  temperature?: number    // 温度 (°C)
  lastUpdate: string
  connectorType?: string  // 连接器类型
  maxPower?: number       // 最大功率 (kW)
  location?: string       // 位置
  isTimeout?: boolean     // 是否超时离线
}

interface ChargingStationDashboardProps {
  stations: ChargingStation[]
  onStationSelect?: (station: ChargingStation) => void
  selectedStation?: ChargingStation | null
}

function getStatusColor(status: ChargingStation["status"]) {
  switch (status) {
    case "charging":
      return "bg-green-500"
    case "idle":
      return "bg-blue-500"
    case "occupied":
      return "bg-yellow-500"
    case "fault":
      return "bg-red-500"
    case "offline":
      return "bg-gray-500"
    default:
      return "bg-gray-500"
  }
}

function getStatusBadgeVariant(status: ChargingStation["status"]) {
  switch (status) {
    case "charging":
      return "default" as const
    case "idle":
      return "secondary" as const
    case "occupied":
      return "outline" as const
    case "fault":
      return "destructive" as const
    case "offline":
      return "secondary" as const
    default:
      return "secondary" as const
  }
}

function formatTime(minutes?: number): string {
  if (!minutes) return "--:--"
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function formatPower(power?: number): string {
  if (!power) return "0"
  return power >= 1000 ? `${(power / 1000).toFixed(1)}MW` : `${power.toFixed(1)}kW`
}

export default function ChargingStationDashboard({ 
  stations, 
  onStationSelect, 
  selectedStation 
}: ChargingStationDashboardProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  // 统计数据
  const stats = useMemo(() => {
    const total = stations.length
    const charging = stations.filter(s => s.status === "charging").length
    const idle = stations.filter(s => s.status === "idle").length
    const fault = stations.filter(s => s.status === "fault").length
    const offline = stations.filter(s => s.status === "offline").length
    const totalPower = stations
      .filter(s => s.status === "charging" && s.power)
      .reduce((sum, s) => sum + (s.power || 0), 0)

    return { total, charging, idle, fault, offline, totalPower }
  }, [stations, refreshKey])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Charging Station Management</h1>
          <p className="text-gray-600">Real-time monitoring of charging station status and performance</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Battery className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Charging</p>
                <p className="text-xl font-bold text-green-600">{stats.charging}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Power className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Idle</p>
                <p className="text-xl font-bold text-blue-600">{stats.idle}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Fault</p>
                <p className="text-xl font-bold text-red-600">{stats.fault}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gray-500"></div>
              <div>
                <p className="text-sm text-gray-600">Offline</p>
                <p className="text-xl font-bold text-gray-600">{stats.offline}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Power</p>
                <p className="text-xl font-bold text-purple-600">{formatPower(stats.totalPower)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 充电桩列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stations.map((station) => (
          <Card 
            key={station.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedStation?.id === station.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => onStationSelect?.(station)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{station.name || station.id}</CardTitle>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(station.status)}`}></div>
                  <Badge variant={getStatusBadgeVariant(station.status)} className="text-xs">
                    {station.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* 电气参数 */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Voltage:</span>
                  <div className="font-mono text-blue-600">
                    {station.voltage ? `${station.voltage.toFixed(1)}V` : '--'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Current:</span>
                  <div className="font-mono text-green-600">
                    {station.current ? `${station.current.toFixed(1)}A` : '--'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Power:</span>
                  <div className="font-mono text-purple-600">
                    {station.power ? formatPower(station.power) : '--'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Temperature:</span>
                  <div className={`font-mono ${
                    station.temperature && station.temperature > 60 ? 'text-red-600' : 
                    station.temperature && station.temperature > 40 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {station.temperature ? `${station.temperature.toFixed(1)}°C` : '--'}
                  </div>
                </div>
              </div>

              {/* 充电信息 */}
              {station.status === "charging" && (
                <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-green-600" />
                      <span className="text-green-700">Remaining Time</span>
                    </div>
                    <span className="font-mono text-green-700">
                      {formatTime(station.remainingTime)}
                    </span>
                  </div>
                  {station.energy && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-green-700">Energy Charged</span>
                      <span className="font-mono text-green-700">
                        {station.energy.toFixed(1)} kWh
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 充电桩信息 */}
              <div className="text-xs text-gray-500 space-y-1">
                {station.connectorType && (
                  <div>Connector: {station.connectorType}</div>
                )}
                {station.maxPower && (
                  <div>Max Power: {formatPower(station.maxPower)}</div>
                )}
                {station.location && (
                  <div>Location: {station.location}</div>
                )}
                <div>Updated: {station.lastUpdate}</div>
                {station.isTimeout && (
                  <div className="text-red-500 text-sm mt-1">
                    ⚠️ Device timeout offline (no data for over 5 minutes)
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stations.length === 0 && (
        <div className="text-center py-12">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No charging station data</p>
          <p className="text-sm text-gray-500 mt-1">Please check MQTT connection and data source</p>
        </div>
      )}
    </div>
  )
}
"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, Zap, RefreshCw, AlertCircle, Truck } from "lucide-react"
import dynamic from "next/dynamic"
import { useDeviceData } from "@/contexts/DeviceDataContext"

type MapProps = {
  vehicles: Vehicle[]
  selectedVehicle: Vehicle | null
  onVehicleSelect: (vehicle: Vehicle | null) => void
  initialCenter: [number, number]
}

const MapComponent = dynamic<MapProps>(() => import("./map-component"), { ssr: false })

export interface Vehicle {
  id: string
  name: string
  lat: number
  lng: number
  speed: number
  battery: number
  status: "active" | "idle" | "maintenance" | "offline"
  lastUpdate: string
  route?: string
}

function getStatusColor(status: Vehicle["status"]) {
  switch (status) {
    case "active":
      return "bg-green-500"
    case "idle":
      return "bg-yellow-500"
    case "maintenance":
      return "bg-red-500"
    case "offline":
      return "bg-gray-500"
    default:
      return "bg-gray-500"
  }
}

function getStatusBadgeVariant(status: Vehicle["status"]) {
  switch (status) {
    case "active":
      return "default"
    case "idle":
      return "secondary"
    case "maintenance":
      return "destructive"
    case "offline":
      return "outline"
    default:
      return "outline"
  }
}

export function GpsTrackingDashboard() {
  // 使用全局设备数据Context
  const {
    devicesData,
    devicesList,
    getDeviceData,
    getDeviceStatus,
    startPolling,
    stopPolling,
    isPolling,
    refreshAllDevices
  } = useDeviceData()
  
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isLiveTracking, setIsLiveTracking] = useState(true)
  const [initialMapCenter, setInitialMapCenter] = useState<[number, number] | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const kphToMph = (kph?: number) => (typeof kph === "number" && Number.isFinite(kph) ? Math.round(kph * 0.621371) : 0)
  
  const timeAgo = (ts: number) => {
    const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
    if (sec < 15) return "Just now"
    if (sec < 60) return `${sec}s ago`
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min} min${min > 1 ? "s" : ""} ago`
    const hr = Math.floor(min / 60)
    return `${hr} hour${hr > 1 ? "s" : ""} ago`
  }

  // 从全局Context构建车辆数据
  const vehicles: Vehicle[] = useMemo(() => {
    return devicesList.map(deviceId => {
      const deviceData = getDeviceData(deviceId)
      const status = getDeviceStatus(deviceId)
      
      // 默认值
      let lat = 0, lng = 0, speed = 0
      
      if (deviceData?.gps) {
        lat = deviceData.gps.lat || 0
        lng = deviceData.gps.lng || 0
        speed = kphToMph(deviceData.gps.speed)
      }
      
      // 确定状态
      let vehicleStatus: Vehicle["status"] = "offline"
      if (status.isOnline) {
        if (lat !== 0 && lng !== 0) {
          vehicleStatus = speed > 1 ? "active" : "idle"
        } else {
          vehicleStatus = "idle"
        }
      }
      
      return {
        id: deviceId,
        name: deviceId,
        lat,
        lng,
        speed,
        battery: Math.round(deviceData?.soc || 0),
        status: vehicleStatus,
        lastUpdate: deviceData ? timeAgo(deviceData.ts) : "Never",
        route: undefined,
      }
    })
  }, [devicesData, devicesList, getDeviceData, getDeviceStatus])

  // 组件挂载时开始轮询
  useEffect(() => {
    console.log('[GPS] 组件挂载，开始数据轮询')
    startPolling()
    
    return () => {
      console.log('[GPS] 组件卸载，停止数据轮询')
      stopPolling()
    }
  }, [startPolling, stopPolling])

  // 设置地图初始中心点
  useEffect(() => {
    if (!mapReady && vehicles.length > 0) {
      const firstValid = vehicles.find((v) => 
        Number.isFinite(v.lat) && Number.isFinite(v.lng) && !(v.lat === 0 && v.lng === 0)
      )
      if (firstValid) {
        setInitialMapCenter([firstValid.lat, firstValid.lng])
        setMapReady(true)
        console.log(`[GPS] 设置地图中心: ${firstValid.lat}, ${firstValid.lng}`)
      }
    }
  }, [vehicles, mapReady])

  // 控制实时跟踪
  useEffect(() => {
    if (isLiveTracking) {
      startPolling()
    } else {
      stopPolling()
    }
  }, [isLiveTracking, startPolling, stopPolling])

  const activeVehicles = vehicles.filter((v) => v.status === "active").length
  const totalVehicles = vehicles.length
  const averageBattery = vehicles.length ? Math.round(vehicles.reduce((sum, v) => sum + v.battery, 0) / vehicles.length) : 0

  const mapVehicles = useMemo(() => {
    return vehicles.filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng) && !(v.lat === 0 && v.lng === 0))
  }, [vehicles])

  const handleRefresh = async () => {
    console.log('[GPS] 手动刷新数据')
    await refreshAllDevices()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GPS 车辆追踪</h1>
          <p className="text-muted-foreground">实时监控车队位置和状态</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
          <Button
            variant={isLiveTracking ? "default" : "outline"}
            size="sm"
            onClick={() => setIsLiveTracking(!isLiveTracking)}
            className="flex items-center gap-2"
          >
            {isLiveTracking ? (
              <>
                <Zap className="w-4 h-4" />
                实时跟踪
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                暂停跟踪
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活跃车辆</p>
                <p className="text-2xl font-bold">{activeVehicles}/{totalVehicles}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均电量</p>
                <p className="text-2xl font-bold">{averageBattery}%</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">数据状态</p>
                <p className="text-2xl font-bold">{isPolling ? "实时" : "暂停"}</p>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isPolling ? "bg-green-100" : "bg-gray-100"
              }`}>
                <Navigation className={`w-4 h-4 ${
                  isPolling ? "text-green-600" : "text-gray-600"
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">在线设备</p>
                <p className="text-2xl font-bold">
                  {vehicles.filter(v => v.status !== "offline").length}
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              车辆列表
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedVehicle?.id === vehicle.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedVehicle(vehicle)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.status)}`}
                    />
                    <span className="font-semibold">{vehicle.name}</span>
                  </div>
                  <Badge variant={getStatusBadgeVariant(vehicle.status)}>
                    {vehicle.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>电量:</span>
                    <span className={`font-medium ${
                      vehicle.battery > 50 ? "text-green-600" : 
                      vehicle.battery > 20 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {vehicle.battery}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>速度:</span>
                    <span>{vehicle.speed} mph</span>
                  </div>
                  <div className="flex justify-between">
                    <span>位置:</span>
                    <span>
                      {vehicle.lat !== 0 && vehicle.lng !== 0 
                        ? `${vehicle.lat.toFixed(4)}, ${vehicle.lng.toFixed(4)}`
                        : "未知"
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>更新:</span>
                    <span>{vehicle.lastUpdate}</span>
                  </div>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">暂无车辆数据</p>
                <p className="text-sm text-gray-500 mt-1">等待设备连接...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              实时地图
              {selectedVehicle && (
                <Badge variant="outline" className="ml-auto">
                  {selectedVehicle.name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] w-full rounded-lg overflow-hidden">
              {mapReady && initialMapCenter ? (
                <MapComponent
                  vehicles={mapVehicles}
                  selectedVehicle={selectedVehicle}
                  onVehicleSelect={setSelectedVehicle}
                  initialCenter={initialMapCenter}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-100">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">等待GPS数据...</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {vehicles.length === 0 ? "没有设备数据" : "等待位置信息"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Vehicle Details */}
      {selectedVehicle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              {selectedVehicle.name} - 详细信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">状态</p>
                <Badge variant={getStatusBadgeVariant(selectedVehicle.status)}>
                  {selectedVehicle.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">电池电量</p>
                <p className={`text-xl font-bold ${
                  selectedVehicle.battery > 50 ? "text-green-600" : 
                  selectedVehicle.battery > 20 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {selectedVehicle.battery}%
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">当前速度</p>
                <p className="text-xl font-bold">{selectedVehicle.speed} mph</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">最后更新</p>
                <p className="text-xl font-bold">{selectedVehicle.lastUpdate}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-500 mb-2">GPS坐标</p>
              <p className="text-lg font-mono">
                {selectedVehicle.lat !== 0 && selectedVehicle.lng !== 0 
                  ? `${selectedVehicle.lat.toFixed(6)}, ${selectedVehicle.lng.toFixed(6)}`
                  : "位置信息不可用"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
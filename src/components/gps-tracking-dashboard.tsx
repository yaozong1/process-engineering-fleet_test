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
  initialZoom?: number
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
  const [initialCenter, setInitialCenter] = useState<[number, number] | null>(null)
  const [initialZoom, setInitialZoom] = useState<number | null>(null)

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

  // 页面初次加载时尝试从本地缓存恢复地图中心
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (initialCenter) return
    try {
      const raw = localStorage.getItem('gps:lastView')
      if (raw) {
        const saved = JSON.parse(raw)
        const c = Array.isArray(saved?.center) ? saved.center : null
        const z = typeof saved?.zoom === 'number' ? saved.zoom : null
        if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
          setInitialCenter([c[0], c[1]])
        }
        if (z != null && Number.isFinite(z)) {
          setInitialZoom(z)
        }
      }
    } catch { /* ignore */ }
  }, [initialCenter])

  // 从vehicles数据中恢复地图中心（如果没有本地存储的视图）
  useEffect(() => {
    if (!initialCenter && vehicles.length) {
      const validVehicle = vehicles.find(v => Number.isFinite(v.lat) && Number.isFinite(v.lng) && !(v.lat === 0 && v.lng === 0))
      if (validVehicle) {
        setInitialCenter([validVehicle.lat, validVehicle.lng])
      }
    }
  }, [initialCenter, vehicles])

  // 一旦确定了初始中心，也将其持久化，确保下一次进入无需等待
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!initialCenter) return
    try {
      const currentZoom = initialZoom ?? 11
      localStorage.setItem('gps:lastView', JSON.stringify({ center: initialCenter, zoom: currentZoom }))
    } catch { /* ignore */ }
  }, [initialCenter, initialZoom])

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

  // 允许红点位置更新，但使用深度比较避免不必要的地图重新渲染
  const mapVehicles = useMemo(() => {
    const filtered = vehicles.filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lng) && !(v.lat === 0 && v.lng === 0))
    return filtered
  }, [
    vehicles.length,
    vehicles.map(v => `${v.id}:${v.lat.toFixed(5)}:${v.lng.toFixed(5)}:${v.status}`).join('|')
  ])

  const handleRefresh = async () => {
    console.log('[GPS] 手动刷新数据')
    await refreshAllDevices()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GPS Vehicle Tracking</h1>
          <p className="text-muted-foreground">Real-time fleet location and status monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
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
                Live Tracking
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Paused
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
                <p className="text-sm font-medium text-gray-600">Active Vehicles</p>
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
                <p className="text-sm font-medium text-gray-600">Avg Battery</p>
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
                <p className="text-sm font-medium text-gray-600">Data Status</p>
                <p className="text-2xl font-bold">{isPolling ? "Live" : "Paused"}</p>
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
                <p className="text-sm font-medium text-gray-600">Online Devices</p>
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
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setSelectedVehicle(null)}
            title={selectedVehicle ? "Click header to deselect vehicle" : ""}
          >
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Vehicle List
            </CardTitle>
          </CardHeader>
          <CardContent 
            className="h-[600px] overflow-y-auto cursor-pointer"
            onClick={(e) => {
              // 点击空白处取消选中
              if (e.target === e.currentTarget) {
                setSelectedVehicle(null)
              }
            }}
            title={selectedVehicle ? "Click blank area to deselect vehicle" : ""}
          >
            <div 
              className="space-y-4"
              onClick={(e) => {
                // 点击空白处取消选中
                if (e.target === e.currentTarget) {
                  setSelectedVehicle(null)
                }
              }}
            >
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedVehicle?.id === vehicle.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation() // 防止冒泡到父容器
                    setSelectedVehicle(vehicle)
                  }}
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
                      <span>Battery:</span>
                      <span className={`font-medium ${
                        vehicle.battery > 50 ? "text-green-600" : 
                        vehicle.battery > 20 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {vehicle.battery}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Speed:</span>
                      <span>{vehicle.speed} mph</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Location:</span>
                      <span>
                        {vehicle.lat !== 0 && vehicle.lng !== 0 
                          ? `${vehicle.lat.toFixed(4)}, ${vehicle.lng.toFixed(4)}`
                          : "Unknown"
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Updated:</span>
                      <span>{vehicle.lastUpdate}</span>
                    </div>
                  </div>
                </div>
              ))}
              {vehicles.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No vehicle data</p>
                  <p className="text-sm text-gray-500 mt-1">Waiting for device connection...</p>
                </div>
              )}
              
              {/* 额外的空白区域，便于点击取消选中 */}
              {selectedVehicle && vehicles.length > 0 && (
                <div 
                  className="h-20 flex items-center justify-center text-gray-400 text-sm italic cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedVehicle(null)
                  }}
                >
                  Click here to deselect vehicle
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Real-time Map
              {selectedVehicle && (
                <Badge variant="outline" className="ml-auto">
                  {selectedVehicle.name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] w-full rounded-lg overflow-hidden">
              {initialCenter ? (
                <MapComponent
                  vehicles={mapVehicles}
                  selectedVehicle={selectedVehicle}
                  onVehicleSelect={setSelectedVehicle}
                  initialCenter={initialCenter}
                  initialZoom={initialZoom ?? undefined}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-100">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Waiting for GPS data...</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {vehicles.length === 0 ? "No device data" : "Waiting for location info"}
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
              {selectedVehicle.name} - Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge variant={getStatusBadgeVariant(selectedVehicle.status)}>
                  {selectedVehicle.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Battery Level</p>
                <p className={`text-xl font-bold ${
                  selectedVehicle.battery > 50 ? "text-green-600" : 
                  selectedVehicle.battery > 20 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {selectedVehicle.battery}%
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Current Speed</p>
                <p className="text-xl font-bold">{selectedVehicle.speed} mph</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Last Updated</p>
                <p className="text-xl font-bold">{selectedVehicle.lastUpdate}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-500 mb-2">GPS Coordinates</p>
              <p className="text-lg font-mono">
                {selectedVehicle.lat !== 0 && selectedVehicle.lng !== 0 
                  ? `${selectedVehicle.lat.toFixed(6)}, ${selectedVehicle.lng.toFixed(6)}`
                  : "Location unavailable"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin,
  Navigation,
  Clock,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Truck,
  Wifi,
  WifiOff
} from "lucide-react"
import dynamic from "next/dynamic"
import { useAllVehicleData } from "@/hooks/use-mqtt"
import { VehicleGPSData, VehicleBatteryData, VehicleStatusData } from "@/lib/mqtt-config"

// Dynamically import map component to avoid SSR issues
const MapComponent = dynamic(() => import("./map-component"), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">Loading map...</div>
})

interface Vehicle {
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

// Mock vehicles for fallback when MQTT is not connected
const mockVehicles: Vehicle[] = [
  {
    id: "PE-001",
    name: "Process Truck 1",
    lat: 40.7128,
    lng: -74.0060,
    speed: 45,
    battery: 78,
    status: "active",
    lastUpdate: "2 mins ago",
    route: "Downtown Route"
  },
  {
    id: "PE-002",
    name: "Process Truck 2",
    lat: 40.7589,
    lng: -73.9851,
    speed: 0,
    battery: 92,
    status: "idle",
    lastUpdate: "5 mins ago",
    route: "Midtown Route"
  },
  {
    id: "PE-003",
    name: "Process Truck 3",
    lat: 40.6892,
    lng: -74.0445,
    speed: 28,
    battery: 15,
    status: "active",
    lastUpdate: "1 min ago",
    route: "Harbor Route"
  },
  {
    id: "PE-004",
    name: "Process Truck 4",
    lat: 40.7505,
    lng: -73.9934,
    speed: 0,
    battery: 65,
    status: "maintenance",
    lastUpdate: "2 hours ago",
    route: "Central Route"
  },
  {
    id: "PE-005",
    name: "Process Truck 5",
    lat: 40.7282,
    lng: -73.7949,
    speed: 52,
    battery: 43,
    status: "active",
    lastUpdate: "30 secs ago",
    route: "Airport Route"
  }
]

function convertMQTTDataToVehicle(
  vehicleId: string,
  gps?: VehicleGPSData,
  battery?: VehicleBatteryData,
  status?: VehicleStatusData
): Vehicle {
  return {
    id: vehicleId,
    name: `Process Truck ${vehicleId.split('-')[1] || vehicleId}`,
    lat: gps?.latitude || 0,
    lng: gps?.longitude || 0,
    speed: gps?.speed || status?.speed || 0,
    battery: battery?.level || 0,
    status: status?.status || "offline",
    lastUpdate: status?.lastUpdate || gps?.timestamp || battery?.timestamp || "Unknown",
    route: `Route ${vehicleId}`
  }
}

function getStatusColor(status: Vehicle["status"]) {
  switch (status) {
    case "active": return "bg-green-500"
    case "idle": return "bg-yellow-500"
    case "maintenance": return "bg-red-500"
    case "offline": return "bg-gray-500"
    default: return "bg-gray-500"
  }
}

function getStatusBadgeVariant(status: Vehicle["status"]) {
  switch (status) {
    case "active": return "default"
    case "idle": return "secondary"
    case "maintenance": return "destructive"
    case "offline": return "outline"
    default: return "outline"
  }
}

export function GpsTrackingDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isLiveTracking, setIsLiveTracking] = useState(true)

  // MQTT集成
  const {
    isConnected: mqttConnected,
    isConnecting: mqttConnecting,
    error: mqttError,
    vehicleData: mqttVehicleData,
    connect: connectMQTT,
    disconnect: disconnectMQTT
  } = useAllVehicleData()

  // 将MQTT数据转换为Vehicle格式
  useEffect(() => {
    if (mqttConnected && mqttVehicleData.size > 0) {
      const mqttVehicles: Vehicle[] = []

      mqttVehicleData.forEach((data, vehicleId) => {
        const vehicle = convertMQTTDataToVehicle(
          vehicleId,
          data.gps,
          data.battery,
          data.status
        )
        mqttVehicles.push(vehicle)
      })

      if (mqttVehicles.length > 0) {
        setVehicles(mqttVehicles)
      }
    }
  }, [mqttConnected, mqttVehicleData])

  // Simulate real-time updates for mock data when MQTT is not connected
  useEffect(() => {
    if (!isLiveTracking || mqttConnected) return

    const interval = setInterval(() => {
      setVehicles(prev => prev.map(vehicle => {
        if (vehicle.status === "active") {
          // Small random movements to simulate real-time tracking
          const latOffset = (Math.random() - 0.5) * 0.001
          const lngOffset = (Math.random() - 0.5) * 0.001
          const speedChange = (Math.random() - 0.5) * 10

          return {
            ...vehicle,
            lat: vehicle.lat + latOffset,
            lng: vehicle.lng + lngOffset,
            speed: Math.max(0, Math.min(80, vehicle.speed + speedChange)),
            lastUpdate: "Just now"
          }
        }
        return vehicle
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [isLiveTracking, mqttConnected])

  const activeVehicles = vehicles.filter(v => v.status === "active").length
  const totalVehicles = vehicles.length
  const averageBattery = Math.round(vehicles.reduce((sum, v) => sum + v.battery, 0) / vehicles.length)

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
                  MQTT Status: {mqttConnecting ? "Connecting..." : mqttConnected ? "Connected" : "Disconnected"}
                </p>
                {mqttError && (
                  <p className="text-sm text-red-600">Error: {mqttError}</p>
                )}
                {!mqttConnected && !mqttError && (
                  <p className="text-sm text-gray-600">Using simulated data</p>
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

      {/* Real-time Stats */}
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
            <div className="mt-2 flex items-center text-sm">
              <span className={mqttConnected ? "text-green-600" : "text-blue-600"}>
                {mqttConnected ? "🔴 Live Data" : "📊 Simulated"}
              </span>
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
                <p className="text-sm font-medium text-gray-600">Live Tracking</p>
                <p className="text-lg font-bold">
                  {isLiveTracking ? "ON" : "OFF"}
                </p>
              </div>
              <Button
                variant={isLiveTracking ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLiveTracking(!isLiveTracking)}
              >
                <RefreshCw className={`w-4 h-4 ${isLiveTracking && !mqttConnected ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Data Source</p>
                <p className="text-lg font-bold">
                  {mqttConnected ? "MQTT" : "Mock"}
                </p>
              </div>
              <div className={`w-8 h-8 ${mqttConnected ? 'bg-green-100' : 'bg-gray-100'} rounded-lg flex items-center justify-center`}>
                {mqttConnected ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map and Vehicle List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Real-time Vehicle Tracking
              {mqttConnected && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Live MQTT Data
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MapComponent
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onVehicleSelect={setSelectedVehicle}
            />
          </CardContent>
        </Card>

        {/* Vehicle List */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedVehicle?.id === vehicle.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedVehicle(vehicle)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(vehicle.status)}`} />
                      <span className="font-medium text-sm">{vehicle.id}</span>
                      {mqttConnected && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live Data" />
                      )}
                    </div>
                    <Badge variant={getStatusBadgeVariant(vehicle.status)} className="text-xs">
                      {vehicle.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      <span>{vehicle.speed} mph</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{vehicle.battery}%</span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-xs text-gray-500">{vehicle.route}</p>
                    <p className="text-xs text-gray-400">Updated: {vehicle.lastUpdate}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Vehicle Details */}
      {selectedVehicle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Vehicle Details - {selectedVehicle.id}
              {mqttConnected && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Live Data
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium">
                  {selectedVehicle.lat.toFixed(4)}, {selectedVehicle.lng.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Speed</p>
                <p className="font-medium">{selectedVehicle.speed} mph</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Battery Level</p>
                <p className="font-medium">{selectedVehicle.battery}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge variant={getStatusBadgeVariant(selectedVehicle.status)}>
                  {selectedVehicle.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

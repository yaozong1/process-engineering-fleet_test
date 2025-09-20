"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, Clock, Zap, RefreshCw, AlertCircle, Truck } from "lucide-react"
import dynamic from "next/dynamic"

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isLiveTracking, setIsLiveTracking] = useState(true)
  const POLL_INTERVAL_MS = Math.max(3000, Number(process.env.NEXT_PUBLIC_GPS_POLL_INTERVAL_MS) || 5000)

  const kphToMph = (kph?: number) => (typeof kph === 'number' && Number.isFinite(kph)) ? Math.round(kph * 0.621371) : 0
  const timeAgo = (ts: number) => {
    const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
    if (sec < 15) return 'Just now'
    if (sec < 60) return `${sec}s ago`
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min} min${min>1?'s':''} ago`
    const hr = Math.floor(min / 60)
    return `${hr} hour${hr>1?'s':''} ago`
  }

  async function fetchDevices(): Promise<string[]> {
    const res = await fetch('/api/telemetry?list=1', { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json.devices) ? json.devices : []
  }

  async function fetchLatest(deviceId: string): Promise<any | null> {
    const res = await fetch(`/api/telemetry?device=${encodeURIComponent(deviceId)}&latest=1`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    try { console.debug('[GPS] latest raw for', deviceId, JSON.stringify(json)) } catch {}
    if (json && json.latest) return json.latest
    if (Array.isArray(json.data) && json.data.length) return json.data[0]
    return null
  }

  async function loadOnce() {
    try {
      const deviceIds = await fetchDevices()
      const latestList = await Promise.all(deviceIds.map(async id => ({ id, data: await fetchLatest(id) })))
      const mapped: Vehicle[] = latestList.map(({ id, data }) => {
        const gps = data?.gps
        const soc = typeof data?.soc === 'number' ? data.soc : 0
        const ts = typeof data?.ts === 'number' ? data.ts : Date.now()
        const hasGps = gps && typeof gps.lat === 'number' && typeof gps.lng === 'number'
        const speedMph = kphToMph(gps?.speed)
        const status: Vehicle['status'] = !hasGps
          ? 'offline'
          : (speedMph > 1 ? 'active' : 'idle')
        return {
          id,
          name: id,
          lat: hasGps ? gps.lat : 0,
          lng: hasGps ? gps.lng : 0,
          speed: speedMph,
          battery: Math.round(soc),
          status,
          lastUpdate: timeAgo(ts),
          route: undefined
        }
      }).filter(v => v.id)
      setVehicles(mapped)
      if (!selectedVehicle && mapped.length) setSelectedVehicle(mapped.find(v => v.status !== 'offline') || mapped[0])
    } catch (e) {
      console.error('[GPS] loadOnce error:', e)
    }
  }

  useEffect(() => {
    loadOnce()
    if (!isLiveTracking) return
    const timer = setInterval(loadOnce, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiveTracking])

  const activeVehicles = vehicles.filter(v => v.status === "active").length
  const totalVehicles = vehicles.length
  const averageBattery = vehicles.length ? Math.round(vehicles.reduce((sum, v) => sum + v.battery, 0) / vehicles.length) : 0
  const mapVehicles = useMemo(() => vehicles.filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lng) && !(v.lat === 0 && v.lng === 0)), [vehicles])

  return (
    <div className="space-y-6">
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
                <RefreshCw className={`w-4 h-4 ${isLiveTracking ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Alerts</p>
                <p className="text-2xl font-bold text-orange-600">2</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-orange-600" />
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MapComponent
              vehicles={mapVehicles}
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
                    <p className="text-[10px] text-gray-400">lat: {Number.isFinite(vehicle.lat) ? vehicle.lat.toFixed(5) : 'n/a'}, lng: {Number.isFinite(vehicle.lng) ? vehicle.lng.toFixed(5) : 'n/a'}</p>
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
            <CardTitle>Vehicle Details - {selectedVehicle.id}</CardTitle>
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

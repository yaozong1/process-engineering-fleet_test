"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default markers in React Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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

interface MapComponentProps {
  vehicles: Vehicle[]
  selectedVehicle: Vehicle | null
  onVehicleSelect: (vehicle: Vehicle) => void
}

// Custom vehicle icon based on status
function createVehicleIcon(status: Vehicle["status"], isSelected: boolean = false) {
  let color = "#6b7280" // gray default

  switch (status) {
    case "active":
      color = "#22c55e" // green
      break
    case "idle":
      color = "#eab308" // yellow
      break
    case "maintenance":
      color = "#ef4444" // red
      break
    case "offline":
      color = "#6b7280" // gray
      break
  }

  const size = isSelected ? 32 : 24
  const iconHtml = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ${isSelected ? 'transform: scale(1.2);' : ''}
    ">
      <svg width="${size * 0.6}" height="${size * 0.6}" viewBox="0 0 24 24" fill="white">
        <path d="M3 6h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"/>
      </svg>
    </div>
  `

  return L.divIcon({
    html: iconHtml,
    className: 'custom-vehicle-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  })
}

// Component to handle map events and centering
function MapController({ selectedVehicle, vehicles }: { selectedVehicle: Vehicle | null, vehicles: Vehicle[] }) {
  const map = useMap()

  useEffect(() => {
    if (selectedVehicle) {
      map.setView([selectedVehicle.lat, selectedVehicle.lng], 13, {
        animate: true,
        duration: 1
      })
    } else if (vehicles.length > 0) {
      // Fit map to show all vehicles
      const group = new L.FeatureGroup(
        vehicles.map(vehicle =>
          L.marker([vehicle.lat, vehicle.lng])
        )
      )
      map.fitBounds(group.getBounds().pad(0.1))
    }
  }, [selectedVehicle, vehicles, map])

  return null
}

export default function MapComponent({ vehicles, selectedVehicle, onVehicleSelect }: MapComponentProps) {
  // Default center (New York City)
  const defaultCenter: [number, number] = [40.7128, -74.0060]

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapController selectedVehicle={selectedVehicle} vehicles={vehicles} />

        {vehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={[vehicle.lat, vehicle.lng]}
            icon={createVehicleIcon(vehicle.status, selectedVehicle?.id === vehicle.id)}
            eventHandlers={{
              click: () => onVehicleSelect(vehicle)
            }}
          >
            <Popup>
              <div className="p-2 min-w-48">
                <div className="font-semibold text-sm mb-2">{vehicle.id}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className={`inline-block ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                      vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
                      vehicle.status === 'idle' ? 'bg-yellow-100 text-yellow-800' :
                      vehicle.status === 'maintenance' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle.status}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Speed:</span>
                    <span className="ml-1 font-medium">{vehicle.speed} mph</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Battery:</span>
                    <span className={`ml-1 font-medium ${
                      vehicle.battery < 20 ? 'text-red-600' :
                      vehicle.battery < 50 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {vehicle.battery}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Route:</span>
                    <span className="ml-1 font-medium">{vehicle.route}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Updated: {vehicle.lastUpdate}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

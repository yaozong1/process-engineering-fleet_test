"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Vehicle {
  id: string;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  battery: number;
  status: "active" | "idle" | "maintenance" | "offline";
  lastUpdate: string;
  route?: string;
}

interface MapComponentProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onVehicleSelect: (vehicle: Vehicle) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  mapMode?:
    | "normal"
    | "grayscale"
    | "positron"
    | "dark"
    | "toner"
    | "toner-lite";
}

// Red circle icons (normal & selected)
const redIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;border:2px solid #fff;border-radius:50%;background:#dc2626;box-shadow:0 0 2px rgba(0,0,0,0.4);"></div>',
  className: "fleet-red-icon",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const redIconSelected = L.divIcon({
  html: '<div style="width:26px;height:26px;border:3px solid #fff;border-radius:50%;background:#b91c1c;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>',
  className: "fleet-red-icon-selected",
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// Component to handle map events and centering
function MapController({
  selectedVehicle,
  vehicles,
}: {
  selectedVehicle: Vehicle | null;
  vehicles: Vehicle[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedVehicle) {
      map.setView([selectedVehicle.lat, selectedVehicle.lng], 13, {
        animate: true,
        duration: 1,
      });
    } else if (vehicles.length > 0) {
      // Fit map to show all vehicles
      const group = new L.FeatureGroup(
        vehicles.map((vehicle) => L.marker([vehicle.lat, vehicle.lng]))
      );
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [selectedVehicle, vehicles, map]);

  return null;
}

export default function MapComponent({
  vehicles,
  selectedVehicle,
  onVehicleSelect,
  initialCenter,
  initialZoom,
  mapMode = "normal",
}: MapComponentProps) {
  const defaultCenter: [number, number] = initialCenter || [40.7128, -74.006];
  const defaultZoom = initialZoom || 11;
  const [mapKey] = useState(() => "map_" + Math.random().toString(36).slice(2));

  // 根据mapMode选择不同的瓦片图层
  const getTileLayer = () => {
    switch (mapMode) {
      case "grayscale":
        // CartoDB Light - 干净的浅灰色地图
        return {
          url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        };

      case "positron":
        // CartoDB Positron - 极简无标签灰色地图（最接近您的截图）
        return {
          url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        };

      case "dark":
        // CartoDB Dark - 深色主题地图
        return {
          url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        };

      case "toner":
        // Stamen Toner - 高对比度黑白地图
        return {
          url: "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a>',
          subdomains: "",
          maxZoom: 20,
        };

      case "toner-lite":
        // Stamen Toner Lite - 淡雅灰度地图
        return {
          url: "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a>',
          subdomains: "",
          maxZoom: 20,
        };

      default:
        // OpenStreetMap Standard - 标准彩色地图
        return {
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          subdomains: "abc",
          maxZoom: 19,
        };
    }
  };

  const tileLayer = getTileLayer();

  return (
    <div
      className="rounded-lg overflow-hidden mx-[5px] mb-[25px]"
      style={{
        aspectRatio: "18 / 9",
        width: "calc(100% - 10px)",
        // 如果使用CSS滤镜作为备选方案
        filter: mapMode === "grayscale" ? "none" : "none", // 我们使用不同的瓦片图层，所以不需要CSS滤镜
      }}
    >
      <MapContainer
        key={mapKey}
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          url={tileLayer.url}
          attribution={tileLayer.attribution}
          subdomains={tileLayer.subdomains}
          maxZoom={tileLayer.maxZoom}
        />

        <MapController selectedVehicle={selectedVehicle} vehicles={vehicles} />

        {vehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={[vehicle.lat, vehicle.lng]}
            icon={
              selectedVehicle?.id === vehicle.id ? redIconSelected : redIcon
            }
            eventHandlers={{ click: () => onVehicleSelect(vehicle) }}
          >
            <Popup>
              <div className="p-2 min-w-48">
                <div className="font-semibold text-sm mb-2">{vehicle.id}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div
                      className={`inline-block ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                        vehicle.status === "active"
                          ? "bg-green-100 text-green-800"
                          : vehicle.status === "idle"
                          ? "bg-yellow-100 text-yellow-800"
                          : vehicle.status === "maintenance"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {vehicle.status}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Speed:</span>
                    <span className="ml-1 font-medium">
                      {vehicle.speed} mph
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Battery:</span>
                    <span
                      className={`ml-1 font-medium ${
                        vehicle.battery < 20
                          ? "text-red-600"
                          : vehicle.battery < 50
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
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
  );
}

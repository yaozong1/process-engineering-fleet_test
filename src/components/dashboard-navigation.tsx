"use client"

import { useState } from "react"
import {
  BarChart3,
  Truck,
  Users,
  Wrench,
  Route,
  Fuel,
  DollarSign,
  FileText,
  MapPin,
  Battery
} from "lucide-react"

export type NavigationTab =
  | "overview"
  | "vehicles"
  | "drivers"
  | "maintenance"
  | "routes"
  | "fuel"
  | "expenses"
  | "reports"
  | "gps-tracking"
  | "battery-monitor"

interface DashboardNavigationProps {
  activeTab: NavigationTab
  onTabChange: (tab: NavigationTab) => void
}

const tabs = [
  { id: "overview" as const, label: "Overview", icon: BarChart3 },
  { id: "vehicles" as const, label: "Vehicles", icon: Truck },
  { id: "gps-tracking" as const, label: "GPS Tracking", icon: MapPin },
  { id: "battery-monitor" as const, label: "Battery Monitor", icon: Battery },
  { id: "drivers" as const, label: "Drivers", icon: Users },
  { id: "maintenance" as const, label: "Maintenance", icon: Wrench },
  { id: "routes" as const, label: "Routes", icon: Route },
  { id: "fuel" as const, label: "Fuel", icon: Fuel },
  { id: "expenses" as const, label: "Expenses", icon: DollarSign },
  { id: "reports" as const, label: "Reports", icon: FileText },
]

export function DashboardNavigation({ activeTab, onTabChange }: DashboardNavigationProps) {
  return (
    <nav className="bg-white border-b">
      <div className="px-6">
        <div className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

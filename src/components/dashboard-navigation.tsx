"use client";

import { useState } from "react";
import {
  BarChart3,
  Truck,
  Zap,
  Wrench,
  Route,
  Fuel,
  DollarSign,
  FileText,
  MapPin,
  Battery,
} from "lucide-react";

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
  | "battery-monitor";

interface DashboardNavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

const tabs = [
  { id: "overview" as const, label: "Overview", icon: BarChart3 },
  { id: "vehicles" as const, label: "Vehicles", icon: Truck },
  { id: "gps-tracking" as const, label: "GPS", icon: MapPin },
  { id: "battery-monitor" as const, label: "Battery", icon: Battery },
  { id: "drivers" as const, label: "Charge", icon: Zap },
  { id: "maintenance" as const, label: "Maintain", icon: Wrench },
  { id: "routes" as const, label: "Routes", icon: Route },
  { id: "fuel" as const, label: "Fuel", icon: Fuel },
  { id: "expenses" as const, label: "Expenses", icon: DollarSign },
  { id: "reports" as const, label: "Reports", icon: FileText },
];

export function DashboardNavigation({
  activeTab,
  onTabChange,
}: DashboardNavigationProps) {
  return (
    <nav className="bg-white border-r border-gray-200 w-[100px] h-full flex flex-col">
      <div className="py-4">
        <div className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex flex-col items-center justify-center px-2 py-3 rounded-lg text-xs font-bold transition-colors min-h-[90px] ${
                  isActive
                    ? "bg-green-100 text-green-700 border-r-4 border-green-500"
                    : "hover:bg-gray-100"
                }`}
                title={tab.label}
              >
                <Icon
                  className={
                    isActive
                      ? "w-7 h-7 mb-1 text-green-700"
                      : "w-7 h-7 mb-1 text-gray-700"
                  }
                />
                <span
                  className={
                    isActive
                      ? "text-center leading-tight text-green-700 font-bold"
                      : "text-center leading-tight text-gray-400 font-bold"
                  }
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

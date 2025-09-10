"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LoginPage } from "@/components/login-page"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNavigation, type NavigationTab } from "@/components/dashboard-navigation"
import { OverviewDashboard } from "@/components/overview-dashboard"
import { GpsTrackingDashboard } from "@/components/gps-tracking-dashboard"
import { BatteryMonitorDashboard } from "@/components/battery-monitor-dashboard"

export default function FleetManagerPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // 从URL路径中设置初始选项卡（深度链接）
  const initialTab = (() => {
    switch (pathname) {
      case "/gps-tracking":
        return "gps-tracking"
      case "/battery-monitor":
        return "battery-monitor"
      case "/vehicles":
        return "vehicles"
      case "/drivers":
        return "drivers"
      case "/maintenance":
        return "maintenance"
      case "/routes":
        return "routes"
      case "/fuel":
        return "fuel"
      case "/expenses":
        return "expenses"
      case "/reports":
        return "reports"
      default:
        return "overview"
    }
  })()

  const [activeTab, setActiveTab] = useState<NavigationTab>(initialTab as NavigationTab)

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setActiveTab("overview")
    router.push("/")
  }

  const onTabChange = (tab: NavigationTab) => {
    setActiveTab(tab)
    router.push(tab === "overview" ? "/" : `/${tab}`)
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  const renderDashboard = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewDashboard />
      case "gps-tracking":
        return <GpsTrackingDashboard />
      case "battery-monitor":
        return <BatteryMonitorDashboard />
      case "vehicles":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Vehicles Dashboard</h3>
            <p className="text-gray-600">Vehicle management features coming soon...</p>
          </div>
        )
      case "drivers":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Drivers Dashboard</h3>
            <p className="text-gray-600">Driver management features coming soon...</p>
          </div>
        )
      case "maintenance":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Maintenance Dashboard</h3>
            <p className="text-gray-600">Maintenance tracking features coming soon...</p>
          </div>
        )
      case "routes":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Routes Dashboard</h3>
            <p className="text-gray-600">Route optimization features coming soon...</p>
          </div>
        )
      case "fuel":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Fuel Dashboard</h3>
            <p className="text-gray-600">Fuel management features coming soon...</p>
          </div>
        )
      case "expenses":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Expenses Dashboard</h3>
            <p className="text-gray-600">Expense tracking features coming soon...</p>
          </div>
        )
      case "reports":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Reports Dashboard</h3>
            <p className="text-gray-600">Reporting features coming soon...</p>
          </div>
        )
      default:
        return <OverviewDashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader onLogout={handleLogout} />
      <DashboardNavigation activeTab={activeTab} onTabChange={onTabChange} />
      <main className="p-6">{renderDashboard()}</main>
    </div>
  )
}

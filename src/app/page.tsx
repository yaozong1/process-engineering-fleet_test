"use client"

import { useState, useEffect } from "react"
import { LoginPage } from "@/components/login-page"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNavigation, type NavigationTab } from "@/components/dashboard-navigation"
import { OverviewDashboard } from "@/components/overview-dashboard"
import { GpsTrackingDashboard } from "@/components/gps-tracking-dashboard"
import { BatteryMonitorDashboard } from "@/components/battery-monitor-dashboard"

interface User {
  userId: string
  username: string
  role: 'admin' | 'user'
  email?: string
}

export default function FleetManagerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<NavigationTab>("overview")
  const [loading, setLoading] = useState(true)

  // Check for existing authentication on page load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.log('No valid authentication found')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
    setIsAuthenticated(true)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/verify', { method: 'POST' }) // Logout endpoint
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    setUser(null)
    setIsAuthenticated(false)
    setActiveTab("overview") // Reset to overview when logging out
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
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
      <DashboardHeader user={user} onLogout={handleLogout} />
      <DashboardNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <main className="p-6">
        {renderDashboard()}
      </main>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { LoginPage } from "@/components/login-page"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNavigation, type NavigationTab } from "@/components/dashboard-navigation"
import { OverviewDashboard } from "@/components/overview-dashboard"
import { GpsTrackingDashboard } from "@/components/gps-tracking-dashboard"
import { BatteryMonitorDashboard } from "@/components/battery-monitor-dashboard"

export default function FleetManagerPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<NavigationTab>("overview")
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const [remainingMinutes, setRemainingMinutes] = useState(0)
  
  const lastActivityRef = useRef<number>(Date.now())
  const checkIntervalRef = useRef<NodeJS.Timeout>()
  const warningShownRef = useRef<boolean>(false)

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setActiveTab("overview")
    setShowTimeoutWarning(false)
  }

  // 更新活动时间
  const updateActivity = () => {
    lastActivityRef.current = Date.now()
    warningShownRef.current = false
    setShowTimeoutWarning(false)
    console.log('[INACTIVITY] 活动检测，重置计时器')
  }

  // 执行注销
  const performLogout = async () => {
    console.log('[INACTIVITY] 执行自动注销')
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('注销失败:', error)
    } finally {
      handleLogout()
      router.push('/')
    }
  }

  // 检查不活动状态
  const checkInactivity = () => {
    if (!isAuthenticated) return

    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current
    const timeoutMs = 60000 // 1分钟
    const warningMs = 30000 // 30秒警告
    
    const secondsInactive = Math.floor(timeSinceLastActivity / 1000)
    const remainingMs = timeoutMs - timeSinceLastActivity
    const remainingSeconds = Math.floor(remainingMs / 1000)
    
    console.log(`[INACTIVITY] 检查: 不活动${secondsInactive}秒, 剩余${remainingSeconds}秒`)

    // 超时注销
    if (timeSinceLastActivity >= timeoutMs) {
      console.log('[INACTIVITY] 超时注销!')
      performLogout()
      return
    }

    // 显示警告
    if (remainingMs <= warningMs && !warningShownRef.current) {
      const remainingMinutes = Math.ceil(remainingMs / 60000)
      console.log(`[INACTIVITY] 显示警告: ${remainingMinutes}分钟`)
      warningShownRef.current = true
      setRemainingMinutes(remainingMinutes)
      setShowTimeoutWarning(true)
    }
  }

  // 监听用户活动
  useEffect(() => {
    if (!isAuthenticated) return

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    let throttleTimer: NodeJS.Timeout | null = null
    const throttledUpdate = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        updateActivity()
        throttleTimer = null
      }, 1000)
    }

    events.forEach(event => {
      document.addEventListener(event, throttledUpdate, true)
    })

    checkIntervalRef.current = setInterval(checkInactivity, 5000)
    updateActivity()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdate, true)
      })
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      if (throttleTimer) {
        clearTimeout(throttleTimer)
      }
    }
  }, [isAuthenticated])

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
      <DashboardHeader 
        onLogout={handleLogout}
        user={isAuthenticated ? { userId: '1', username: 'admin', role: 'admin' } : undefined}
      />
      <DashboardNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <main className="p-6">
        {renderDashboard()}
      </main>
      
      {showTimeoutWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="bg-amber-100 rounded-full p-2 mr-3">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">会话即将过期</h3>
            </div>
            <p className="text-gray-600 mb-6">
              您的会话将在 {remainingMinutes} 分钟后过期。请选择继续使用或立即注销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  console.log('[INACTIVITY] 延长会话')
                  setShowTimeoutWarning(false)
                  updateActivity()
                  try {
                    await fetch('/api/auth/extend', { method: 'POST' })
                  } catch (error) {
                    console.error('延长会话失败:', error)
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                继续使用
              </button>
              <button
                onClick={() => {
                  console.log('[INACTIVITY] 立即注销')
                  performLogout()
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                立即注销
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

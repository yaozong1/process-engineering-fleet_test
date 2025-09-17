'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SessionTimeoutWarning } from './session-timeout-warning'

interface InactivityMonitorProps {
  isAuthenticated: boolean
  onLogout: () => void
  timeoutMinutes?: number
  warningMinutes?: number
}

export function InactivityMonitor({ 
  isAuthenticated, 
  onLogout, 
  timeoutMinutes = 1, // 1分钟测试
  warningMinutes = 0.5 // 30秒警告
}: InactivityMonitorProps) {
  const router = useRouter()
  const lastActivityRef = useRef<number>(Date.now())
  const checkIntervalRef = useRef<NodeJS.Timeout>()
  const warningShownRef = useRef<boolean>(false)
  
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const [remainingMinutes, setRemainingMinutes] = useState(0)

  // 更新活动时间
  const updateActivity = () => {
    lastActivityRef.current = Date.now()
    warningShownRef.current = false
    setShowTimeoutWarning(false)
    console.log('[INACTIVITY] 用户活动，重置计时器')
  }

  // 执行注销
  const performLogout = async () => {
    console.log('[INACTIVITY] ? 执行不活动注销')
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('注销请求失败:', error)
    } finally {
      onLogout()
      router.push('/')
    }
  }

  // 检查不活动状态
  const checkInactivity = () => {
    if (!isAuthenticated) return

    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current
    const timeoutMs = timeoutMinutes * 60 * 1000
    const warningMs = warningMinutes * 60 * 1000
    
    const secondsInactive = Math.floor(timeSinceLastActivity / 1000)
    const remainingMs = timeoutMs - timeSinceLastActivity
    const remainingSeconds = Math.floor(remainingMs / 1000)
    
    console.log(`[INACTIVITY] 检查: 不活动${secondsInactive}秒, 剩余${remainingSeconds}秒`)

    // 超时注销
    if (timeSinceLastActivity >= timeoutMs) {
      console.log(`[INACTIVITY] ? 超时！不活动${timeoutMinutes}分钟，执行注销`)
      performLogout()
      return
    }

    // 显示警告
    if (remainingMs <= warningMs && !warningShownRef.current) {
      const remainingMinutes = Math.ceil(remainingMs / 60000)
      console.log(`[INACTIVITY] ?? 警告: 还有${remainingMinutes}分钟自动注销`)
      warningShownRef.current = true
      setRemainingMinutes(remainingMinutes)
      setShowTimeoutWarning(true)
    }
  }

  // 监听用户活动
  useEffect(() => {
    if (!isAuthenticated) return

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    // 节流更新
    let throttleTimer: NodeJS.Timeout | null = null
    const throttledUpdate = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        updateActivity()
        throttleTimer = null
      }, 1000)
    }

    // 添加事件监听
    events.forEach(event => {
      document.addEventListener(event, throttledUpdate, true)
    })

    // 启动定时检查 - 每5秒检查一次
    checkIntervalRef.current = setInterval(checkInactivity, 5000)
    
    // 初始化活动时间
    updateActivity()

    return () => {
      // 清理
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

  // 延长会话
  const handleExtendSession = async () => {
    console.log('[INACTIVITY] 用户点击延长会话')
    setShowTimeoutWarning(false)
    updateActivity()
    try {
      await fetch('/api/auth/extend', { method: 'POST' })
      console.log('[INACTIVITY] 会话已延长')
    } catch (error) {
      console.error('延长会话失败:', error)
    }
  }

  // 立即注销
  const handleLogoutNow = () => {
    console.log('[INACTIVITY] 用户点击立即注销')
    performLogout()
  }

  return (
    <>
      {showTimeoutWarning && (
        <SessionTimeoutWarning
          remainingMinutes={remainingMinutes}
          onExtendSession={handleExtendSession}
          onLogout={handleLogoutNow}
        />
      )}
    </>
  )
}
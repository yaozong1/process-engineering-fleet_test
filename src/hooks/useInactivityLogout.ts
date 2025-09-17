import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  userId: string
  username: string
  role: 'admin' | 'user'
}

interface UseInactivityLogoutOptions {
  user: User | null
  onLogout?: () => void
  timeoutMinutes?: number // 不活动超时时间（分钟），默认15分钟
  checkInterval?: number // 检查间隔（毫秒），默认1分钟
  warningMinutes?: number // 在超时前多少分钟显示警告，默认2分钟
  onWarning?: (remainingMinutes: number) => void
}

export function useInactivityLogout({
  user,
  onLogout,
  timeoutMinutes = 1, // 测试用1分钟，正式版改为15
  checkInterval = 5000, // 5秒检查一次，更快响应
  warningMinutes = 0.5, // 测试用30秒警告，正式版改为2分钟
  onWarning
}: UseInactivityLogoutOptions) {
  const router = useRouter()
  const lastActivityRef = useRef<number>(Date.now())
  const checkIntervalRef = useRef<NodeJS.Timeout>()
  const warningShownRef = useRef<boolean>(false)

  // 更新最后活动时间
  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    warningShownRef.current = false
    console.log('[INACTIVITY] Activity detected, resetting timer')
  }, [])

  // 执行登出
  const performLogout = useCallback(async () => {
    console.log('[INACTIVITY] Logging out due to inactivity')
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      if (onLogout) {
        onLogout()
      }
      router.push('/')
    }
  }, [onLogout, router])

  // 检查不活动时间
  const checkInactivity = useCallback(() => {
    if (!user) return

    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current
    const timeoutMs = timeoutMinutes * 60 * 1000
    const warningMs = warningMinutes * 60 * 1000

    // 添加详细的调试日志
    const secondsInactive = Math.floor(timeSinceLastActivity / 1000)
    const remainingMs = timeoutMs - timeSinceLastActivity
    const remainingSeconds = Math.floor(remainingMs / 1000)
    
    console.log(`[INACTIVITY] 检查状态:`)
    console.log(`  - 不活动时间: ${secondsInactive}秒`)
    console.log(`  - 超时设置: ${timeoutMinutes}分钟 (${timeoutMs/1000}秒)`)
    console.log(`  - 剩余时间: ${remainingSeconds}秒`)

    // 检查是否超过超时时间
    if (timeSinceLastActivity >= timeoutMs) {
      console.log(`[INACTIVITY] ? 超时！用户不活动${timeoutMinutes}分钟，执行注销`)
      performLogout()
      return
    }

    // 检查是否需要显示警告
    const remainingTime = timeoutMs - timeSinceLastActivity
    if (remainingTime <= warningMs && !warningShownRef.current) {
      const remainingMinutes = Math.ceil(remainingTime / (60 * 1000))
      console.log(`[INACTIVITY] ?? 警告: 还有${remainingMinutes}分钟自动注销`)
      warningShownRef.current = true
      if (onWarning) {
        onWarning(remainingMinutes)
      }
    }
  }, [user, timeoutMinutes, warningMinutes, onWarning, performLogout])

  // 监听用户活动事件
  useEffect(() => {
    if (!user) return

    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    // 节流函数，避免过于频繁的更新
    let throttleTimer: NodeJS.Timeout | null = null
    const throttledUpdateActivity = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        updateLastActivity()
        throttleTimer = null
      }, 1000) // 1秒内最多更新一次
    }

    // 添加事件监听器
    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, true)
    })

    // 启动定时检查
    checkIntervalRef.current = setInterval(checkInactivity, checkInterval)

    // 初始化最后活动时间
    updateLastActivity()

    return () => {
      // 清理事件监听器
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity, true)
      })

      // 清理定时器
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      if (throttleTimer) {
        clearTimeout(throttleTimer)
      }
    }
  }, [user, updateLastActivity, checkInactivity, checkInterval])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [])

  // 手动重置活动时间（可以在特定操作时调用）
  const resetActivity = useCallback(() => {
    updateLastActivity()
  }, [updateLastActivity])

  // 获取剩余时间（分钟）
  const getRemainingMinutes = useCallback(() => {
    if (!user) return 0
    const timeSinceLastActivity = Date.now() - lastActivityRef.current
    const timeoutMs = timeoutMinutes * 60 * 1000
    const remainingMs = Math.max(0, timeoutMs - timeSinceLastActivity)
    return Math.ceil(remainingMs / (60 * 1000))
  }, [user, timeoutMinutes])

  return {
    resetActivity,
    getRemainingMinutes,
    performLogout
  }
}
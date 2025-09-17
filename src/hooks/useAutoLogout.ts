import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  userId: string
  username: string
  role: 'admin' | 'user'
}

interface UseAutoLogoutOptions {
  user: User | null
  onLogout?: () => void
  checkInterval?: number // 检查间隔（毫秒），默认30秒
  warningBeforeExpiry?: number // 在过期前多少毫秒显示警告，默认2分钟
  onWarning?: (remainingTime: number) => void // 警告回调
}

export function useAutoLogout({ 
  user, 
  onLogout, 
  checkInterval = 30000,
  warningBeforeExpiry = 2 * 60 * 1000, // 2分钟
  onWarning 
}: UseAutoLogoutOptions) {
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout>()
  const [sessionWarning, setSessionWarning] = useState(false)

  const performLogout = async () => {
    try {
      // 调用登出API清除服务器端cookie
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      // 无论API调用是否成功，都执行客户端登出
      if (onLogout) {
        onLogout()
      }
      router.push('/')
    }
  }

  const checkTokenValidity = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.error === 'Token expired') {
          console.log('[AUTO-LOGOUT] Token expired, logging out...')
        } else {
          console.log('[AUTO-LOGOUT] Token invalid, logging out...')
        }
        await performLogout()
      } else {
        // Token仍然有效，清除警告状态
        setSessionWarning(false)
      }
    } catch (error) {
      console.error('[AUTO-LOGOUT] Token check failed:', error)
      await performLogout()
    }
  }

  useEffect(() => {
    // 只有当用户已登录时才启动定时检查
    if (user) {
      // 立即检查一次
      checkTokenValidity()

      // 设置定时检查
      intervalRef.current = setInterval(checkTokenValidity, checkInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    } else {
      // 用户未登录时清除定时器
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user, checkInterval])

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return { 
    checkTokenValidity, 
    performLogout,
    sessionWarning,
    extendSession: checkTokenValidity // 可以手动延长会话
  }
}
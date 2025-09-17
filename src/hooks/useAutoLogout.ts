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
  checkInterval?: number // ����������룩��Ĭ��30��
  warningBeforeExpiry?: number // �ڹ���ǰ���ٺ�����ʾ���棬Ĭ��2����
  onWarning?: (remainingTime: number) => void // ����ص�
}

export function useAutoLogout({ 
  user, 
  onLogout, 
  checkInterval = 30000,
  warningBeforeExpiry = 2 * 60 * 1000, // 2����
  onWarning 
}: UseAutoLogoutOptions) {
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout>()
  const [sessionWarning, setSessionWarning] = useState(false)

  const performLogout = async () => {
    try {
      // ���õǳ�API�����������cookie
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      // ����API�����Ƿ�ɹ�����ִ�пͻ��˵ǳ�
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
        // Token��Ȼ��Ч���������״̬
        setSessionWarning(false)
      }
    } catch (error) {
      console.error('[AUTO-LOGOUT] Token check failed:', error)
      await performLogout()
    }
  }

  useEffect(() => {
    // ֻ�е��û��ѵ�¼ʱ��������ʱ���
    if (user) {
      // �������һ��
      checkTokenValidity()

      // ���ö�ʱ���
      intervalRef.current = setInterval(checkTokenValidity, checkInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    } else {
      // �û�δ��¼ʱ�����ʱ��
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user, checkInterval])

  // ���ж��ʱ�����ʱ��
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
    extendSession: checkTokenValidity // �����ֶ��ӳ��Ự
  }
}
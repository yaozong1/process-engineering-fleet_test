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
  timeoutMinutes?: number // �����ʱʱ�䣨���ӣ���Ĭ��15����
  checkInterval?: number // ����������룩��Ĭ��1����
  warningMinutes?: number // �ڳ�ʱǰ���ٷ�����ʾ���棬Ĭ��2����
  onWarning?: (remainingMinutes: number) => void
}

export function useInactivityLogout({
  user,
  onLogout,
  timeoutMinutes = 1, // ������1���ӣ���ʽ���Ϊ15
  checkInterval = 5000, // 5����һ�Σ�������Ӧ
  warningMinutes = 0.5, // ������30�뾯�棬��ʽ���Ϊ2����
  onWarning
}: UseInactivityLogoutOptions) {
  const router = useRouter()
  const lastActivityRef = useRef<number>(Date.now())
  const checkIntervalRef = useRef<NodeJS.Timeout>()
  const warningShownRef = useRef<boolean>(false)

  // �������ʱ��
  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    warningShownRef.current = false
    console.log('[INACTIVITY] Activity detected, resetting timer')
  }, [])

  // ִ�еǳ�
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

  // ��鲻�ʱ��
  const checkInactivity = useCallback(() => {
    if (!user) return

    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current
    const timeoutMs = timeoutMinutes * 60 * 1000
    const warningMs = warningMinutes * 60 * 1000

    // �����ϸ�ĵ�����־
    const secondsInactive = Math.floor(timeSinceLastActivity / 1000)
    const remainingMs = timeoutMs - timeSinceLastActivity
    const remainingSeconds = Math.floor(remainingMs / 1000)
    
    console.log(`[INACTIVITY] ���״̬:`)
    console.log(`  - ���ʱ��: ${secondsInactive}��`)
    console.log(`  - ��ʱ����: ${timeoutMinutes}���� (${timeoutMs/1000}��)`)
    console.log(`  - ʣ��ʱ��: ${remainingSeconds}��`)

    // ����Ƿ񳬹���ʱʱ��
    if (timeSinceLastActivity >= timeoutMs) {
      console.log(`[INACTIVITY] ? ��ʱ���û����${timeoutMinutes}���ӣ�ִ��ע��`)
      performLogout()
      return
    }

    // ����Ƿ���Ҫ��ʾ����
    const remainingTime = timeoutMs - timeSinceLastActivity
    if (remainingTime <= warningMs && !warningShownRef.current) {
      const remainingMinutes = Math.ceil(remainingTime / (60 * 1000))
      console.log(`[INACTIVITY] ?? ����: ����${remainingMinutes}�����Զ�ע��`)
      warningShownRef.current = true
      if (onWarning) {
        onWarning(remainingMinutes)
      }
    }
  }, [user, timeoutMinutes, warningMinutes, onWarning, performLogout])

  // �����û���¼�
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

    // �����������������Ƶ���ĸ���
    let throttleTimer: NodeJS.Timeout | null = null
    const throttledUpdateActivity = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        updateLastActivity()
        throttleTimer = null
      }, 1000) // 1����������һ��
    }

    // ����¼�������
    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, true)
    })

    // ������ʱ���
    checkIntervalRef.current = setInterval(checkInactivity, checkInterval)

    // ��ʼ�����ʱ��
    updateLastActivity()

    return () => {
      // �����¼�������
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity, true)
      })

      // ����ʱ��
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      if (throttleTimer) {
        clearTimeout(throttleTimer)
      }
    }
  }, [user, updateLastActivity, checkInactivity, checkInterval])

  // ���ж��ʱ����
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [])

  // �ֶ����ûʱ�䣨�������ض�����ʱ���ã�
  const resetActivity = useCallback(() => {
    updateLastActivity()
  }, [updateLastActivity])

  // ��ȡʣ��ʱ�䣨���ӣ�
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
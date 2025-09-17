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
  timeoutMinutes = 1, // 1���Ӳ���
  warningMinutes = 0.5 // 30�뾯��
}: InactivityMonitorProps) {
  const router = useRouter()
  const lastActivityRef = useRef<number>(Date.now())
  const checkIntervalRef = useRef<NodeJS.Timeout>()
  const warningShownRef = useRef<boolean>(false)
  
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const [remainingMinutes, setRemainingMinutes] = useState(0)

  // ���»ʱ��
  const updateActivity = () => {
    lastActivityRef.current = Date.now()
    warningShownRef.current = false
    setShowTimeoutWarning(false)
    console.log('[INACTIVITY] �û�������ü�ʱ��')
  }

  // ִ��ע��
  const performLogout = async () => {
    console.log('[INACTIVITY] ? ִ�в��ע��')
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('ע������ʧ��:', error)
    } finally {
      onLogout()
      router.push('/')
    }
  }

  // ��鲻�״̬
  const checkInactivity = () => {
    if (!isAuthenticated) return

    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current
    const timeoutMs = timeoutMinutes * 60 * 1000
    const warningMs = warningMinutes * 60 * 1000
    
    const secondsInactive = Math.floor(timeSinceLastActivity / 1000)
    const remainingMs = timeoutMs - timeSinceLastActivity
    const remainingSeconds = Math.floor(remainingMs / 1000)
    
    console.log(`[INACTIVITY] ���: ���${secondsInactive}��, ʣ��${remainingSeconds}��`)

    // ��ʱע��
    if (timeSinceLastActivity >= timeoutMs) {
      console.log(`[INACTIVITY] ? ��ʱ�����${timeoutMinutes}���ӣ�ִ��ע��`)
      performLogout()
      return
    }

    // ��ʾ����
    if (remainingMs <= warningMs && !warningShownRef.current) {
      const remainingMinutes = Math.ceil(remainingMs / 60000)
      console.log(`[INACTIVITY] ?? ����: ����${remainingMinutes}�����Զ�ע��`)
      warningShownRef.current = true
      setRemainingMinutes(remainingMinutes)
      setShowTimeoutWarning(true)
    }
  }

  // �����û��
  useEffect(() => {
    if (!isAuthenticated) return

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    // ��������
    let throttleTimer: NodeJS.Timeout | null = null
    const throttledUpdate = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        updateActivity()
        throttleTimer = null
      }, 1000)
    }

    // ����¼�����
    events.forEach(event => {
      document.addEventListener(event, throttledUpdate, true)
    })

    // ������ʱ��� - ÿ5����һ��
    checkIntervalRef.current = setInterval(checkInactivity, 5000)
    
    // ��ʼ���ʱ��
    updateActivity()

    return () => {
      // ����
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

  // �ӳ��Ự
  const handleExtendSession = async () => {
    console.log('[INACTIVITY] �û�����ӳ��Ự')
    setShowTimeoutWarning(false)
    updateActivity()
    try {
      await fetch('/api/auth/extend', { method: 'POST' })
      console.log('[INACTIVITY] �Ự���ӳ�')
    } catch (error) {
      console.error('�ӳ��Ựʧ��:', error)
    }
  }

  // ����ע��
  const handleLogoutNow = () => {
    console.log('[INACTIVITY] �û��������ע��')
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
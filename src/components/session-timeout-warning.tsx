'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, AlertTriangle } from 'lucide-react'

interface SessionTimeoutWarningProps {
  remainingMinutes: number
  onExtendSession?: () => void
  onLogout?: () => void
}

export function SessionTimeoutWarning({ 
  remainingMinutes, 
  onExtendSession,
  onLogout 
}: SessionTimeoutWarningProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // ��ʣ��2����ʱ��ʾ����
    if (remainingMinutes <= 2 && remainingMinutes > 0) {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [remainingMinutes])

  if (!visible) return null

  return (
    <div className="fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            �Ự��������
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            ���ڳ�ʱ���޲��������ĻỰ���� <strong>{remainingMinutes}</strong> ���Ӻ��Զ��ǳ���
          </p>
          <div className="flex space-x-2 mt-3">
            <Button 
              size="sm" 
              onClick={() => {
                if (onExtendSession) onExtendSession()
                setVisible(false)
              }}
              className="text-xs"
            >
              �����Ự
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                if (onLogout) onLogout()
              }}
              className="text-xs"
            >
              �����ǳ�
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SessionStatusProps {
  remainingMinutes: number
  showDetails?: boolean
}

export function SessionStatus({ remainingMinutes, showDetails = false }: SessionStatusProps) {
  if (!showDetails) return null

  const isWarning = remainingMinutes <= 5
  const statusColor = isWarning ? 'text-yellow-600' : 'text-green-600'

  return (
    <div className="flex items-center space-x-2 text-xs">
      <Clock className={`w-3 h-3 ${statusColor}`} />
      <span className={statusColor}>
        �Ựʣ��: {remainingMinutes} ����
      </span>
    </div>
  )
}
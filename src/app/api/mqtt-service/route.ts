/**
 * MQTT Service Management API
 * 用于管理后端MQTT服务的启动、停止和状态查询
 */

import { NextRequest, NextResponse } from 'next/server'
import { mqttService } from '../../../services/mqtt-service'

export async function GET(request: NextRequest) {
  try {
    const status = mqttService.getStatus()
    const logs = mqttService.getRecentLogs() // 我们需要添加这个方法
    
    return NextResponse.json({
      success: true,
      status: status,
      logs: logs,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[MQTT Service API] Error getting status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get MQTT service status'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    switch (action) {
      case 'start':
        await mqttService.start()
        return NextResponse.json({
          success: true,
          message: 'MQTT service start requested'
        })
        
      case 'stop':
        await mqttService.stop()
        return NextResponse.json({
          success: true,
          message: 'MQTT service stopped'
        })
        
      case 'restart':
        await mqttService.stop()
        await new Promise(resolve => setTimeout(resolve, 2000)) // 等待2秒
        await mqttService.start()
        return NextResponse.json({
          success: true,
          message: 'MQTT service restarted'
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: start, stop, or restart'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('[MQTT Service API] Error processing request:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process MQTT service request'
    }, { status: 500 })
  }
}
// MQTT测试API端点
import { NextRequest, NextResponse } from 'next/server'
import { createVehicleSimulator, generateTestVehicleData } from '@/utils/mqtt-simulator'

// 静态导出配置
export const dynamic = 'force-static'
export const revalidate = false

// 全局模拟器实例
let simulator: any = null
let publishCallback: ((topic: string, data: any) => void) | null = null

// 模拟的MQTT发布函数
const mockPublish = (topic: string, data: any) => {
  console.log(`📡 MQTT Publish - Topic: ${topic}`)
  console.log(`📊 Data:`, JSON.stringify(data, null, 2))

  // 这里可以连接到真实的MQTT Broker
  // 或者存储数据以供WebSocket客户端获取
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'status':
        return NextResponse.json({
          simulator: simulator?.getSimulatorStatus() || { isRunning: false, vehicleCount: 0, vehicles: [] },
          mqtt: {
            connected: false, // 这里应该检查真实的MQTT连接状态
            broker: process.env.NEXT_PUBLIC_MQTT_HOST || 'Not configured'
          }
        })

      case 'start':
        if (!simulator) {
          simulator = createVehicleSimulator(mockPublish)
        }

        simulator.start(3000) // 每3秒更新一次

        return NextResponse.json({
          success: true,
          message: 'MQTT Vehicle Simulator started',
          status: simulator.getSimulatorStatus()
        })

      case 'stop':
        if (simulator) {
          simulator.stop()
        }

        return NextResponse.json({
          success: true,
          message: 'MQTT Vehicle Simulator stopped',
          status: simulator?.getSimulatorStatus() || { isRunning: false, vehicleCount: 0, vehicles: [] }
        })

      case 'publish-now':
        if (simulator) {
          simulator.publishNow()
          return NextResponse.json({
            success: true,
            message: 'Data published immediately',
            timestamp: new Date().toISOString()
          })
        } else {
          return NextResponse.json({
            success: false,
            message: 'Simulator not started'
          }, { status: 400 })
        }

      case 'generate-test':
        const vehicleId = searchParams.get('vehicleId') || 'TEST-001'
        const testData = generateTestVehicleData(vehicleId)

        // 发布测试数据
        mockPublish(`fleet/vehicle/${vehicleId}/gps`, testData.gps)
        mockPublish(`fleet/vehicle/${vehicleId}/battery`, testData.battery)
        mockPublish(`fleet/vehicle/${vehicleId}/status`, testData.status)

        return NextResponse.json({
          success: true,
          message: `Test data generated for vehicle ${vehicleId}`,
          data: testData
        })

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['status', 'start', 'stop', 'publish-now', 'generate-test']
        }, { status: 400 })
    }
  } catch (error) {
    console.error('MQTT Test API Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, vehicleId, value } = body

    if (!simulator) {
      return NextResponse.json({
        error: 'Simulator not started'
      }, { status: 400 })
    }

    switch (action) {
      case 'set-status':
        if (!vehicleId || !value) {
          return NextResponse.json({
            error: 'vehicleId and value (status) are required'
          }, { status: 400 })
        }

        simulator.setVehicleStatus(vehicleId, value)
        return NextResponse.json({
          success: true,
          message: `Vehicle ${vehicleId} status set to ${value}`
        })

      case 'set-battery':
        if (!vehicleId || value === undefined) {
          return NextResponse.json({
            error: 'vehicleId and value (battery level) are required'
          }, { status: 400 })
        }

        simulator.setBatteryLevel(vehicleId, value)
        return NextResponse.json({
          success: true,
          message: `Vehicle ${vehicleId} battery set to ${value}%`
        })

      case 'publish-custom':
        const { topic, data } = body
        if (!topic || !data) {
          return NextResponse.json({
            error: 'topic and data are required'
          }, { status: 400 })
        }

        mockPublish(topic, data)
        return NextResponse.json({
          success: true,
          message: `Custom data published to topic: ${topic}`
        })

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['set-status', 'set-battery', 'publish-custom']
        }, { status: 400 })
    }
  } catch (error) {
    console.error('MQTT Test API POST Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 清理函数（在服务器关闭时调用）
process.on('SIGTERM', () => {
  if (simulator) {
    simulator.stop()
  }
})

process.on('SIGINT', () => {
  if (simulator) {
    simulator.stop()
  }
})

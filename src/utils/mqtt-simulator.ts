// MQTT设备数据模拟器 - 用于测试和演示
import {
  VehicleGPSData,
  VehicleBatteryData,
  VehicleStatusData,
  MQTT_TOPICS
} from '@/lib/mqtt-config'

// 车辆配置
export interface VehicleConfig {
  id: string
  name: string
  initialLat: number
  initialLng: number
  route: {
    lat: number
    lng: number
  }[]
  batteryCapacity: number
  maxSpeed: number
}

// 预定义车辆配置
export const VEHICLE_CONFIGS: VehicleConfig[] = [
  {
    id: "PE-001",
    name: "Process Truck 1",
    initialLat: 40.7128,
    initialLng: -74.0060,
    route: [
      { lat: 40.7128, lng: -74.0060 },
      { lat: 40.7589, lng: -73.9851 },
      { lat: 40.7505, lng: -73.9934 }
    ],
    batteryCapacity: 100,
    maxSpeed: 80
  },
  {
    id: "PE-002",
    name: "Process Truck 2",
    initialLat: 40.7589,
    initialLng: -73.9851,
    route: [
      { lat: 40.7589, lng: -73.9851 },
      { lat: 40.7282, lng: -73.7949 },
      { lat: 40.6892, lng: -74.0445 }
    ],
    batteryCapacity: 100,
    maxSpeed: 75
  },
  {
    id: "PE-003",
    name: "Process Truck 3",
    initialLat: 40.6892,
    initialLng: -74.0445,
    route: [
      { lat: 40.6892, lng: -74.0445 },
      { lat: 40.7505, lng: -73.9934 },
      { lat: 40.7128, lng: -74.0060 }
    ],
    batteryCapacity: 100,
    maxSpeed: 70
  },
  {
    id: "PE-004",
    name: "Process Truck 4",
    initialLat: 40.7505,
    initialLng: -73.9934,
    route: [
      { lat: 40.7505, lng: -73.9934 },
      { lat: 40.7128, lng: -74.0060 },
      { lat: 40.7589, lng: -73.9851 }
    ],
    batteryCapacity: 100,
    maxSpeed: 85
  },
  {
    id: "PE-005",
    name: "Process Truck 5",
    initialLat: 40.7282,
    initialLng: -73.7949,
    route: [
      { lat: 40.7282, lng: -73.7949 },
      { lat: 40.6892, lng: -74.0445 },
      { lat: 40.7505, lng: -73.9934 }
    ],
    batteryCapacity: 100,
    maxSpeed: 90
  }
]

// 车辆状态管理
interface VehicleState {
  config: VehicleConfig
  currentPosition: { lat: number, lng: number }
  currentSpeed: number
  batteryLevel: number
  batteryVoltage: number
  batteryTemperature: number
  batteryHealth: number
  cycleCount: number
  chargingStatus: "charging" | "discharging" | "idle" | "full"
  status: "active" | "idle" | "maintenance" | "offline"
  routeIndex: number
  lastUpdate: number
}

export class MQTTVehicleSimulator {
  private vehicles: Map<string, VehicleState> = new Map()
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private publishCallback?: (topic: string, data: any) => void

  constructor(publishCallback?: (topic: string, data: any) => void) {
    this.publishCallback = publishCallback
    this.initializeVehicles()
  }

  private initializeVehicles() {
    VEHICLE_CONFIGS.forEach(config => {
      const state: VehicleState = {
        config,
        currentPosition: {
          lat: config.initialLat,
          lng: config.initialLng
        },
        currentSpeed: 0,
        batteryLevel: 80 + Math.random() * 20, // 80-100%
        batteryVoltage: 12.5 + Math.random() * 1.0, // 12.5-13.5V
        batteryTemperature: 25 + Math.random() * 15, // 25-40°C
        batteryHealth: 85 + Math.random() * 15, // 85-100%
        cycleCount: Math.floor(Math.random() * 3000),
        chargingStatus: "discharging",
        status: Math.random() > 0.8 ? "idle" : "active",
        routeIndex: 0,
        lastUpdate: Date.now()
      }
      this.vehicles.set(config.id, state)
    })
  }

  // 启动模拟器
  start(intervalMs: number = 3000) {
    if (this.isRunning) return

    this.isRunning = true
    console.log('🚀 MQTT Vehicle Simulator started')

    this.intervalId = setInterval(() => {
      this.updateAllVehicles()
    }, intervalMs)

    // 立即发送一次数据
    this.updateAllVehicles()
  }

  // 停止模拟器
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('🛑 MQTT Vehicle Simulator stopped')
  }

  // 更新所有车辆
  private updateAllVehicles() {
    this.vehicles.forEach((state, vehicleId) => {
      this.updateVehicle(vehicleId, state)
    })
  }

  // 更新单个车辆
  private updateVehicle(vehicleId: string, state: VehicleState) {
    const now = Date.now()
    const timeDelta = (now - state.lastUpdate) / 1000 // 秒

    // 更新位置（如果在移动）
    if (state.status === "active") {
      this.updatePosition(state, timeDelta)
      this.updateSpeed(state)
    } else {
      state.currentSpeed = 0
    }

    // 更新电池
    this.updateBattery(state, timeDelta)

    // 更新状态
    this.updateStatus(state)

    state.lastUpdate = now

    // 发布数据
    this.publishVehicleData(vehicleId, state)
  }

  // 更新位置
  private updatePosition(state: VehicleState, timeDelta: number) {
    const { route } = state.config
    if (route.length === 0) return

    const target = route[state.routeIndex]
    const current = state.currentPosition

    // 计算到目标点的距离
    const distance = this.calculateDistance(current, target)

    // 如果到达目标点，切换到下一个点
    if (distance < 0.001) { // ~100米
      state.routeIndex = (state.routeIndex + 1) % route.length
      return
    }

    // 移动向目标点
    const speed = state.currentSpeed / 3600 // 将mph转换为度/秒的近似值
    const moveDistance = speed * timeDelta * 0.00001 // 简化的移动计算

    if (moveDistance > 0) {
      const factor = Math.min(moveDistance / distance, 1)
      state.currentPosition.lat += (target.lat - current.lat) * factor
      state.currentPosition.lng += (target.lng - current.lng) * factor
    }
  }

  // 更新速度
  private updateSpeed(state: VehicleState) {
    const targetSpeed = state.status === "active"
      ? 20 + Math.random() * (state.config.maxSpeed - 20)
      : 0

    // 平滑速度变化
    const speedDiff = targetSpeed - state.currentSpeed
    state.currentSpeed += speedDiff * 0.1 // 10%的速度调整
    state.currentSpeed = Math.max(0, Math.min(state.currentSpeed, state.config.maxSpeed))
  }

  // 更新电池
  private updateBattery(state: VehicleState, timeDelta: number) {
    // 电池消耗（基于速度和时间）
    const consumptionRate = state.currentSpeed > 0
      ? 0.1 + (state.currentSpeed / state.config.maxSpeed) * 0.2  // 0.1-0.3% per second
      : 0.02 // 待机消耗

    state.batteryLevel -= (consumptionRate * timeDelta)
    state.batteryLevel = Math.max(0, state.batteryLevel)

    // 更新电压（与电池电量相关）
    state.batteryVoltage = 11.5 + (state.batteryLevel / 100) * 2 + (Math.random() - 0.5) * 0.2

    // 更新温度（运行时温度较高）
    const targetTemp = state.currentSpeed > 0 ? 30 + Math.random() * 15 : 25 + Math.random() * 10
    const tempDiff = targetTemp - state.batteryTemperature
    state.batteryTemperature += tempDiff * 0.05

    // 充电状态
    if (state.batteryLevel < 20 && state.currentSpeed === 0) {
      state.chargingStatus = "charging"
      state.batteryLevel += 0.5 * timeDelta // 充电速度
    } else if (state.batteryLevel >= 95) {
      state.chargingStatus = "full"
    } else if (state.currentSpeed > 0) {
      state.chargingStatus = "discharging"
    } else {
      state.chargingStatus = "idle"
    }

    // 健康度缓慢下降
    if (Math.random() < 0.001) { // 0.1%概率
      state.batteryHealth = Math.max(60, state.batteryHealth - 0.1)
      state.cycleCount += 1
    }
  }

  // 更新状态
  private updateStatus(state: VehicleState) {
    // 基于电池电量和随机事件更新状态
    if (state.batteryLevel < 5) {
      state.status = "offline"
    } else if (state.batteryLevel < 15 && Math.random() < 0.1) {
      state.status = "maintenance"
    } else if (Math.random() < 0.05) { // 5%概率状态变化
      const statuses: Array<VehicleState["status"]> = ["active", "idle"]
      state.status = statuses[Math.floor(Math.random() * statuses.length)]
    }
  }

  // 发布车辆数据
  private publishVehicleData(vehicleId: string, state: VehicleState) {
    const timestamp = new Date().toISOString()

    // GPS数据
    const gpsData: VehicleGPSData = {
      vehicleId,
      latitude: state.currentPosition.lat,
      longitude: state.currentPosition.lng,
      speed: state.currentSpeed,
      heading: Math.random() * 360,
      accuracy: 5 + Math.random() * 10,
      timestamp
    }

    // 电池数据
    const batteryData: VehicleBatteryData = {
      vehicleId,
      level: Math.round(state.batteryLevel),
      voltage: Math.round(state.batteryVoltage * 10) / 10,
      temperature: Math.round(state.batteryTemperature),
      health: Math.round(state.batteryHealth),
      cycleCount: state.cycleCount,
      chargingStatus: state.chargingStatus,
      estimatedRange: Math.round(state.batteryLevel * 2), // 简化计算
      timestamp
    }

    // 状态数据
    const statusData: VehicleStatusData = {
      vehicleId,
      status: state.status,
      speed: state.currentSpeed,
      odometer: Math.random() * 100000,
      lastUpdate: timestamp,
      timestamp
    }

    // 发布到MQTT
    if (this.publishCallback) {
      this.publishCallback(MQTT_TOPICS.VEHICLE_GPS(vehicleId), gpsData)
      this.publishCallback(MQTT_TOPICS.VEHICLE_BATTERY(vehicleId), batteryData)
      this.publishCallback(MQTT_TOPICS.VEHICLE_STATUS(vehicleId), statusData)
    }
  }

  // 计算两点间距离（简化版）
  private calculateDistance(
    point1: { lat: number, lng: number },
    point2: { lat: number, lng: number }
  ): number {
    const latDiff = point2.lat - point1.lat
    const lngDiff = point2.lng - point1.lng
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff)
  }

  // 获取车辆状态
  getVehicleState(vehicleId: string): VehicleState | undefined {
    return this.vehicles.get(vehicleId)
  }

  // 获取所有车辆状态
  getAllVehicleStates(): Map<string, VehicleState> {
    return new Map(this.vehicles)
  }

  // 手动触发数据发送
  publishNow() {
    this.updateAllVehicles()
  }

  // 设置车辆状态
  setVehicleStatus(vehicleId: string, status: VehicleState["status"]) {
    const vehicle = this.vehicles.get(vehicleId)
    if (vehicle) {
      vehicle.status = status
      console.log(`🚗 Vehicle ${vehicleId} status set to: ${status}`)
    }
  }

  // 设置电池电量
  setBatteryLevel(vehicleId: string, level: number) {
    const vehicle = this.vehicles.get(vehicleId)
    if (vehicle) {
      vehicle.batteryLevel = Math.max(0, Math.min(100, level))
      console.log(`🔋 Vehicle ${vehicleId} battery set to: ${level}%`)
    }
  }

  // 获取模拟器状态
  getSimulatorStatus() {
    return {
      isRunning: this.isRunning,
      vehicleCount: this.vehicles.size,
      vehicles: Array.from(this.vehicles.keys())
    }
  }
}

// 导出便捷函数
export function createVehicleSimulator(publishCallback?: (topic: string, data: any) => void) {
  return new MQTTVehicleSimulator(publishCallback)
}

// 生成测试数据的辅助函数
export function generateTestVehicleData(vehicleId: string = "TEST-001") {
  const now = new Date().toISOString()

  return {
    gps: {
      vehicleId,
      latitude: 40.7128 + (Math.random() - 0.5) * 0.01,
      longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
      speed: Math.random() * 80,
      heading: Math.random() * 360,
      accuracy: 5 + Math.random() * 10,
      timestamp: now
    } as VehicleGPSData,

    battery: {
      vehicleId,
      level: Math.round(Math.random() * 100),
      voltage: 11.5 + Math.random() * 2,
      temperature: 25 + Math.random() * 20,
      health: 80 + Math.random() * 20,
      cycleCount: Math.floor(Math.random() * 3000),
      chargingStatus: ["charging", "discharging", "idle", "full"][Math.floor(Math.random() * 4)] as any,
      estimatedRange: Math.round(Math.random() * 200),
      timestamp: now
    } as VehicleBatteryData,

    status: {
      vehicleId,
      status: ["active", "idle", "maintenance", "offline"][Math.floor(Math.random() * 4)] as any,
      speed: Math.random() * 80,
      odometer: Math.random() * 100000,
      lastUpdate: now,
      timestamp: now
    } as VehicleStatusData
  }
}

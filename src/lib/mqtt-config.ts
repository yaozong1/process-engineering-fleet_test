// MQTT配置和类型定义
export interface MQTTConfig {
  host: string
  port: number
  protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss'
  clientId: string
  username?: string
  password?: string
  clean: boolean
  keepalive: number
}

// 阿里云IoT配置
export const aliyunIoTConfig: MQTTConfig = {
  host: process.env.NEXT_PUBLIC_MQTT_HOST || 'your-instance.mqtt.iothub.aliyuncs.com',
  port: parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || '443'),
  protocol: 'wss',
  clientId: `fleet_manager_${Math.random().toString(16).substr(2, 8)}`,
  username: process.env.NEXT_PUBLIC_MQTT_USERNAME || '',
  password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || '',
  clean: true,
  keepalive: 60
}

// 本地Mosquitto配置（开发用）
export const localMQTTConfig: MQTTConfig = {
  host: process.env.NEXT_PUBLIC_MQTT_HOST || 'localhost',
  port: parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || '8083'),
  protocol: 'ws',
  clientId: `fleet_manager_${Math.random().toString(16).substr(2, 8)}`,
  clean: true,
  keepalive: 60
}

// Topic结构定义
export const MQTT_TOPICS = {
  // 车辆GPS数据
  VEHICLE_GPS: (vehicleId: string) => `fleet/vehicle/${vehicleId}/gps`,

  // 车辆电池数据
  VEHICLE_BATTERY: (vehicleId: string) => `fleet/vehicle/${vehicleId}/battery`,

  // 车辆状态
  VEHICLE_STATUS: (vehicleId: string) => `fleet/vehicle/${vehicleId}/status`,

  // 传感器数据
  VEHICLE_SENSORS: (vehicleId: string) => `fleet/vehicle/${vehicleId}/sensors`,

  // 设备心跳
  DEVICE_HEARTBEAT: (deviceId: string) => `fleet/device/${deviceId}/heartbeat`,

  // 控制命令
  VEHICLE_COMMAND: (vehicleId: string) => `fleet/vehicle/${vehicleId}/command`,

  // 批量数据订阅
  ALL_VEHICLES: 'fleet/vehicle/+/+',
  ALL_GPS: 'fleet/vehicle/+/gps',
  ALL_BATTERY: 'fleet/vehicle/+/battery',
  ALL_STATUS: 'fleet/vehicle/+/status'
} as const

// 数据类型定义
export interface VehicleGPSData {
  vehicleId: string
  latitude: number
  longitude: number
  altitude?: number
  speed: number
  heading?: number
  accuracy?: number
  timestamp: string
}

export interface VehicleBatteryData {
  vehicleId: string
  level: number // 0-100
  voltage: number
  current?: number
  temperature: number
  health: number // 0-100
  cycleCount: number
  chargingStatus: 'charging' | 'discharging' | 'idle' | 'full'
  estimatedRange: number
  timestamp: string
}

export interface VehicleStatusData {
  vehicleId: string
  status: 'active' | 'idle' | 'maintenance' | 'offline'
  speed: number
  odometer?: number
  fuelLevel?: number
  engineStatus?: 'on' | 'off'
  lastUpdate: string
  timestamp: string
}

export interface VehicleSensorData {
  vehicleId: string
  sensors: {
    temperature?: number
    humidity?: number
    pressure?: number
    vibration?: number
    fuel?: number
    [key: string]: number | undefined
  }
  timestamp: string
}

export interface DeviceHeartbeat {
  deviceId: string
  vehicleId?: string
  status: 'online' | 'offline'
  lastSeen: string
  batteryLevel?: number
  signalStrength?: number
}

// MQTT消息类型
export type MQTTMessage =
  | VehicleGPSData
  | VehicleBatteryData
  | VehicleStatusData
  | VehicleSensorData
  | DeviceHeartbeat

// 环境检测
export const getMQTTConfig = (): MQTTConfig => {
  // 如果在阿里云环境或有配置，使用阿里云IoT
  if (process.env.NEXT_PUBLIC_MQTT_HOST && process.env.NEXT_PUBLIC_MQTT_HOST.includes('aliyuncs.com')) {
    return aliyunIoTConfig
  }

  // 否则使用本地配置
  return localMQTTConfig
}

// 数据验证函数
export const validateGPSData = (data: any): data is VehicleGPSData => {
  return (
    typeof data.vehicleId === 'string' &&
    typeof data.latitude === 'number' &&
    typeof data.longitude === 'number' &&
    typeof data.speed === 'number' &&
    typeof data.timestamp === 'string'
  )
}

export const validateBatteryData = (data: any): data is VehicleBatteryData => {
  return (
    typeof data.vehicleId === 'string' &&
    typeof data.level === 'number' &&
    typeof data.voltage === 'number' &&
    typeof data.temperature === 'number' &&
    typeof data.health === 'number' &&
    typeof data.timestamp === 'string'
  )
}

export const validateStatusData = (data: any): data is VehicleStatusData => {
  return (
    typeof data.vehicleId === 'string' &&
    typeof data.status === 'string' &&
    typeof data.speed === 'number' &&
    typeof data.timestamp === 'string'
  )
}

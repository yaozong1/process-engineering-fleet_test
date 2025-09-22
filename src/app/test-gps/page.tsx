"use client"

import { useDeviceData } from "../../contexts/DeviceDataContext"
import { useEffect } from "react"

export default function TestGPSPage() {
  const {
    devicesList,
    devicesData,
    isPolling,
    startPolling,
    stopPolling,
    refreshAllDevices
  } = useDeviceData()

  useEffect(() => {
    console.log('[TEST-GPS] GPS页面加载')
    console.log('[TEST-GPS] 设备列表:', devicesList)
    console.log('[TEST-GPS] 轮询状态:', isPolling)
    
    if (!isPolling) {
      console.log('[TEST-GPS] 启动轮询')
      startPolling()
    }
  }, [])

  useEffect(() => {
    console.log('[TEST-GPS] 设备数据更新:', Object.keys(devicesData).length, '个设备')
  }, [devicesData])

  const vehicles = devicesList.map(deviceId => {
    const deviceData = devicesData[deviceId]
    if (!deviceData) return null
    
    const gps = deviceData.gps
    const hasGps = gps && typeof gps.lat === 'number' && typeof gps.lng === 'number'
    
    return {
      id: deviceId,
      lat: hasGps ? gps.lat : 0,
      lng: hasGps ? gps.lng : 0,
      speed: gps?.speed || 0,
      battery: deviceData.soc || 0,
      lastUpdate: new Date(deviceData.ts).toLocaleTimeString()
    }
  }).filter(Boolean)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">测试 GPS 页面</h1>
      
      <div className="mb-4">
        <p>轮询状态: {isPolling ? '运行中' : '已停止'}</p>
        <p>设备数量: {devicesList.length}</p>
        <p>有GPS数据的车辆: {vehicles.length}</p>
      </div>

      <div className="flex gap-4 mb-4">
        <button 
          onClick={() => {
            console.log('[TEST-GPS] 手动刷新数据')
            refreshAllDevices()
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          刷新数据
        </button>
        
        <button 
          onClick={() => {
            if (isPolling) {
              console.log('[TEST-GPS] 停止轮询')
              stopPolling()
            } else {
              console.log('[TEST-GPS] 开始轮询')
              startPolling()
            }
          }}
          className={`px-4 py-2 rounded ${isPolling ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
        >
          {isPolling ? '停止轮询' : '开始轮询'}
        </button>
        
        <a 
          href="/test-battery" 
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          切换到电池页面
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle, index) => (
          <div key={vehicle?.id || index} className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">{vehicle?.id}</h3>
            <p>位置: {vehicle?.lat.toFixed(4)}, {vehicle?.lng.toFixed(4)}</p>
            <p>速度: {vehicle?.speed} km/h</p>
            <p>电池: {vehicle?.battery}%</p>
            <p className="text-sm text-gray-500">更新: {vehicle?.lastUpdate}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
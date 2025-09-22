"use client"

import { useDeviceData } from "../../contexts/DeviceDataContext"
import { useEffect } from "react"

export default function TestDeviceContext() {
  const {
    devicesList,
    devicesData,
    isPolling,
    startPolling,
    refreshAllDevices
  } = useDeviceData()

  useEffect(() => {
    console.log('[TEST] DeviceDataContext测试页面加载')
    console.log('[TEST] 设备列表:', devicesList)
    console.log('[TEST] 设备数据:', devicesData)
    console.log('[TEST] 是否轮询:', isPolling)
    
    // 启动数据加载
    startPolling()
  }, [])

  useEffect(() => {
    console.log('[TEST] 设备列表更新:', devicesList)
  }, [devicesList])

  useEffect(() => {
    console.log('[TEST] 设备数据更新:', Object.keys(devicesData))
  }, [devicesData])

  const handleRefresh = () => {
    console.log('[TEST] 手动刷新数据')
    refreshAllDevices()
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">DeviceDataContext 测试页面</h1>
      
      <div className="mb-4">
        <p>轮询状态: {isPolling ? '运行中' : '已停止'}</p>
        <p>设备数量: {devicesList.length}</p>
        <p>设备列表: {devicesList.join(', ')}</p>
      </div>

      <button 
        onClick={handleRefresh}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        手动刷新数据
      </button>

      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">设备数据:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(devicesData, null, 2)}
        </pre>
      </div>
    </div>
  )
}
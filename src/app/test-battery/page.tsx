"use client"

import { useDeviceData } from "../../contexts/DeviceDataContext"
import { useEffect, useState } from "react"

export default function TestBatteryPage() {
  const {
    devicesList,
    devicesData,
    isPolling,
    startPolling,
    stopPolling,
    refreshAllDevices,
    getDeviceHistory,
    refreshDeviceHistory
  } = useDeviceData()

  const [selectedDevice, setSelectedDevice] = useState<string>("")

  useEffect(() => {
    console.log('[TEST-BATTERY] 电池页面加载')
    console.log('[TEST-BATTERY] 设备列表:', devicesList)
    console.log('[TEST-BATTERY] 轮询状态:', isPolling)
    
    if (!isPolling) {
      console.log('[TEST-BATTERY] 启动轮询')
      startPolling()
    }
  }, [])

  useEffect(() => {
    console.log('[TEST-BATTERY] 设备数据更新:', Object.keys(devicesData).length, '个设备')
  }, [devicesData])

  useEffect(() => {
    if (!selectedDevice && devicesList.length > 0) {
      setSelectedDevice(devicesList[0])
    }
  }, [selectedDevice, devicesList])

  const batteryData = devicesList.map(deviceId => {
    const deviceData = devicesData[deviceId]
    if (!deviceData) {
      return {
        vehicleId: deviceId,
        currentLevel: 0,
        voltage: 0,
        temperature: 0,
        lastProbe: "No data"
      }
    }
    
    return {
      vehicleId: deviceId,
      currentLevel: deviceData.soc || 0,
      voltage: deviceData.voltage || 0,
      temperature: deviceData.temperature || 0,
      lastProbe: new Date(deviceData.ts).toLocaleString()
    }
  })

  const historyData = selectedDevice ? getDeviceHistory(selectedDevice) : []

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">测试 电池监控 页面</h1>
      
      <div className="mb-4">
        <p>轮询状态: {isPolling ? '运行中' : '已停止'}</p>
        <p>设备数量: {devicesList.length}</p>
        <p>选中设备: {selectedDevice}</p>
        <p>历史数据条数: {historyData.length}</p>
      </div>

      <div className="flex gap-4 mb-4">
        <button 
          onClick={() => {
            console.log('[TEST-BATTERY] 手动刷新数据')
            refreshAllDevices()
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          刷新数据
        </button>
        
        <button 
          onClick={() => {
            if (selectedDevice) {
              console.log('[TEST-BATTERY] 刷新历史数据:', selectedDevice)
              refreshDeviceHistory(selectedDevice, 50)
            }
          }}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          刷新历史数据
        </button>
        
        <button 
          onClick={() => {
            if (isPolling) {
              console.log('[TEST-BATTERY] 停止轮询')
              stopPolling()
            } else {
              console.log('[TEST-BATTERY] 开始轮询')
              startPolling()
            }
          }}
          className={`px-4 py-2 rounded ${isPolling ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
        >
          {isPolling ? '停止轮询' : '开始轮询'}
        </button>
        
        <a 
          href="/test-gps" 
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          切换到GPS页面
        </a>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">选择设备查看历史数据:</label>
        <select 
          value={selectedDevice} 
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="border rounded px-3 py-2"
        >
          {devicesList.map(deviceId => (
            <option key={deviceId} value={deviceId}>{deviceId}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {batteryData.map((battery) => (
          <div key={battery.vehicleId} className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">{battery.vehicleId}</h3>
            <p>电量: {battery.currentLevel}%</p>
            <p>电压: {battery.voltage}V</p>
            <p>温度: {battery.temperature}°C</p>
            <p className="text-sm text-gray-500">更新: {battery.lastProbe}</p>
          </div>
        ))}
      </div>

      {selectedDevice && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">{selectedDevice} 历史数据</h3>
          {historyData.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">时间</th>
                    <th className="text-left py-2">电量</th>
                    <th className="text-left py-2">电压</th>
                    <th className="text-left py-2">温度</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.slice(0, 10).map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-1">{new Date(item.ts).toLocaleTimeString()}</td>
                      <td className="py-1">{item.soc || 0}%</td>
                      <td className="py-1">{item.voltage || 0}V</td>
                      <td className="py-1">{item.temperature || 0}°C</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">暂无历史数据</p>
          )}
        </div>
      )}
    </div>
  )
}
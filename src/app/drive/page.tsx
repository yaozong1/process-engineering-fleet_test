"use client"

import { useState, useEffect, useRef } from "react"
import { useDeviceData } from "@/contexts/DeviceDataContext"
import ChargingStationDashboard from "@/components/charging-station-dashboard"
import type { ChargingStation } from "@/components/charging-station-dashboard"
import mqtt, { MqttClient } from "mqtt"
import { mqttEnv, buildClientId, fetchSignedCredentials } from "@/lib/mqtt"

interface LogEntry { 
  ts: number
  level: "info" | "error" | "warn"
  msg: string
  data?: any 
}

function useLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const push = (level: LogEntry["level"], msg: string, data?: any) => {
    setLogs(l => [...l.slice(-99), { ts: Date.now(), level, msg, data }]) // 保持最新100条
  }
  return { logs, push }
}

export default function ChargingStationPage() {
  const { chargingStations, chargingStationsList, updateChargingStationData } = useDeviceData()
  const { logs, push } = useLogger()
  
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle")
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null)
  const [clientId, setClientId] = useState(buildClientId())
  const clientRef = useRef<MqttClient | null>(null)

  // 转换充电桩数据格式
  const stations: ChargingStation[] = chargingStationsList.map(stationId => {
    const data = chargingStations.get(stationId)
    if (!data) return null
    
    return {
      id: data.stationId,
      name: `充电桩 ${data.stationId}`,
      status: data.status,
      voltage: data.voltage,
      current: data.current,
      power: data.power,
      energy: data.energy,
      remainingTime: data.remainingTime,
      temperature: data.temperature,
      lastUpdate: new Date(data.ts).toLocaleString(),
      connectorType: data.connectorType,
      maxPower: data.maxPower,
      location: data.location
    }
  }).filter(Boolean) as ChargingStation[]

  // MQTT连接
  useEffect(() => {
    attemptConnect()
    return () => { 
      clientRef.current?.end(true)
    }
  }, [])

  async function attemptConnect() {
    if (!mqttEnv.host) {
      setStatus("error")
      push("error", "No MQTT host configured")
      return
    }

    setStatus("connecting")
    let cid = buildClientId()
    let username = mqttEnv.username
    let password = mqttEnv.password

    if (!password) {
      try {
        const signed = await fetchSignedCredentials()
        cid = signed.clientId
        username = signed.username
        password = signed.password
        push("info", "Signed credentials fetched")
      } catch (e: any) {
        push("error", "Sign fetch failed", { message: e?.message })
        setStatus("error")
        return
      }
    }

    setClientId(cid)
    const url = `wss://${mqttEnv.host}/mqtt`
    push("info", "Connecting to charging station MQTT", { url, cid, username })

    const client = mqtt.connect(url, {
      clientId: cid,
      username,
      password,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 5000,
      protocolVersion: 4
    })

    clientRef.current = client

    client.on("connect", () => {
      setStatus("connected")
      push("info", "Connected to MQTT broker")
      
      // 订阅充电桩主题
      const topic = "fleet/chargenode/+"
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          push("error", "Subscribe failed", { topic, err: String(err) })
        } else {
          push("info", "Subscribed to charging stations", { topic })
        }
      })
    })

    client.on("message", (topic, payload) => {
      try {
        const message = payload.toString()
        const data = JSON.parse(message)
        
        // 解析充电桩ID
        const match = topic.match(/fleet\/chargenode\/(.+)/)
        if (match) {
          const stationId = match[1]
          
          // 更新充电桩数据
          updateChargingStationData(stationId, {
            stationId,
            ts: data.ts || Date.now(),
            status: data.status || "offline",
            voltage: data.voltage,
            current: data.current,
            power: data.power,
            energy: data.energy,
            remainingTime: data.remainingTime,
            temperature: data.temperature,
            connectorType: data.connectorType,
            maxPower: data.maxPower,
            location: data.location,
            faultCode: data.faultCode,
            faultMessage: data.faultMessage
          })
          
          push("info", "Charging station data updated", { 
            stationId, 
            status: data.status,
            power: data.power 
          })
        }
      } catch (error) {
        push("error", "Failed to parse message", { topic, error: String(error) })
      }
    })

    client.on("error", (error) => {
      push("error", "MQTT Error", { message: error?.message })
      setStatus("error")
    })

    client.on("close", () => {
      if (status === "connected") {
        push("warn", "MQTT connection closed")
        setStatus("idle")
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* MQTT状态栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                status === "connected" ? "bg-green-500" : 
                status === "connecting" ? "bg-yellow-500" : 
                status === "error" ? "bg-red-500" : "bg-gray-500"
              }`}></div>
              <span className="text-sm font-medium">MQTT: {status}</span>
            </div>
            <div className="text-sm text-gray-600">
              Client: {clientId}
            </div>
            <div className="text-sm text-gray-600">
              Topic: fleet/chargenode/+
            </div>
          </div>
          <div className="text-sm text-gray-600">
            充电桩总数: {stations.length}
          </div>
        </div>
      </div>

      {/* 充电桩仪表板 */}
      <ChargingStationDashboard
        stations={stations}
        selectedStation={selectedStation}
        onStationSelect={setSelectedStation}
      />

      {/* MQTT日志 */}
      <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="px-4 py-2 border-b border-gray-200">
          <h3 className="text-sm font-medium">MQTT 日志</h3>
        </div>
        <div className="h-64 overflow-auto p-2 bg-gray-900 text-xs font-mono">
          {logs.slice(-20).map(log => (
            <div key={log.ts + log.msg} className={
              log.level === "error" ? "text-red-400" : 
              log.level === "warn" ? "text-yellow-400" : "text-green-400"
            }>
              {new Date(log.ts).toLocaleTimeString()} [{log.level}] {log.msg}
              {log.data && <div className="text-gray-400 ml-2">{JSON.stringify(log.data)}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

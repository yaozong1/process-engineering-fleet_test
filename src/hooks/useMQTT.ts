"use client"
import { useEffect, useRef, useState } from 'react'
import mqtt, { MqttClient } from 'mqtt'
import { mqttEnv, buildClientId, wssUrl, parseAliyunPropertyPayload, MQTTBatteryData, fetchSignedCredentials } from '@/lib/mqtt'

interface UseMQTTReturn {
  connected: boolean
  status: 'idle' | 'connecting' | 'connected' | 'error'
  error?: string
  data: MQTTBatteryData[]
}

export function useMQTT(): UseMQTTReturn {
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [error, setError] = useState<string>()
  const [data, setData] = useState<MQTTBatteryData[]>([])
  const clientRef = useRef<MqttClient | null>(null)

  useEffect(() => {
    const url = wssUrl()
    if (!url) { setStatus('error'); setError('No MQTT host'); return }
    setStatus('connecting')
    console.log('[MQTT] debug config', { url, buildClientId: buildClientId(), username: mqttEnv.username, productKey: mqttEnv.productKey, deviceName: mqttEnv.deviceName })
    ;(async () => {
      let clientId = buildClientId()
      let username = mqttEnv.username
      let password = mqttEnv.password
      try {
        if (!password) {
          const signed = await fetchSignedCredentials()
            clientId = signed.clientId
            username = signed.username
            password = signed.password
            console.log('[MQTT] fetched signed credentials')
        }
      } catch (e) {
        console.error('[MQTT] sign fetch failed', e)
        setError('Ç©Ãû»ñÈ¡Ê§°Ü'); setStatus('error'); return
      }
      const client = mqtt.connect(url, {
        clientId,
        username,
        password,
        keepalive: 60,
        clean: true,
        reconnectPeriod: 5000,
        protocolVersion: 4
      })
      clientRef.current = client
      client.on('connect', () => {
        setConnected(true); setStatus('connected')
        const topic = propertyTopic()
        if (topic) client.subscribe(topic)
      })
      client.on('message', (topic, payload) => {
        try {
          const json = JSON.parse(payload.toString())
          const parsed = parseAliyunPropertyPayload(topic, json)
          if (parsed) setData(prev => [...prev.filter(d => d.vehicleId !== parsed.vehicleId), parsed])
        } catch {}
      })
      client.on('error', e => { setError(e?.message || String(e)); setStatus('error'); setConnected(false) })
      client.on('close', () => { setConnected(false); if (status !== 'error') setStatus('idle') })
    })()
  return () => { clientRef.current?.end(true) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { connected, status, error, data }
}

function propertyTopic(): string | '' {
  if (!mqttEnv.productKey || !mqttEnv.deviceName) return ''
  return `/sys/${mqttEnv.productKey}/${mqttEnv.deviceName}/thing/event/property/post`
}
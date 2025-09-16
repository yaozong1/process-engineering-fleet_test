"use client"
import { useState, useRef, useEffect } from 'react'
import mqtt, { MqttClient } from 'mqtt'

interface LogItem { ts: number; level: 'info' | 'error'; msg: string }

export default function MQTTConnectPage() {
  const [host, setHost] = useState('')
  const [port, setPort] = useState('443')
  const [path, setPath] = useState('/mqtt')
  const [clientId, setClientId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [clean, setClean] = useState(true)
  const [keepalive, setKeepalive] = useState(60)
  const [status, setStatus] = useState<'idle'|'connecting'|'connected'|'error'>('idle')
  const [subTopic, setSubTopic] = useState('')
  const [pubTopic, setPubTopic] = useState('')
  const [pubPayload, setPubPayload] = useState('')
  const [logs, setLogs] = useState<LogItem[]>([])
  const clientRef = useRef<MqttClient | null>(null)
  const [akProductKey, setAkProductKey] = useState('')
  const [akDeviceName, setAkDeviceName] = useState('')
  const [akDeviceSecret, setAkDeviceSecret] = useState('')
  const [signPreview, setSignPreview] = useState('')

  function log(level: 'info'|'error', msg: string) {
    setLogs(l => [{ ts: Date.now(), level, msg }, ...l].slice(0,400))
  }

  function buildUrl() {
    if (!host) return ''
    const h = host.replace(/^wss:\/\//,'').replace(/^mqtts:\/\//,'').trim()
    return `wss://${h}:${port}${path}`.replace(':443/','/').replace(':443$','')
  }

  function connect() {
    const url = buildUrl()
    if (!url) { log('error','host empty'); return }
    clientRef.current?.end(true)
    setStatus('connecting')
    log('info', 'connecting ' + url)
    try {
      const c = mqtt.connect(url, { clientId: clientId || undefined, username: username || undefined, password: password || undefined, clean, keepalive, reconnectPeriod: 0, protocolVersion: 4, wsOptions: { protocol: 'mqtt' } })
      clientRef.current = c
      c.on('connect', () => { setStatus('connected'); log('info','connected') })
      c.on('error', (e) => { setStatus('error'); log('error','error '+(e?.message||e)) })
      c.stream?.on?.('close', (hadErr: any) => { log('info', 'ws low-level close hadError='+hadErr) })
      c.stream?.on?.('error', (e:any)=>{ log('error','ws low-level error '+(e?.message||e)) })
      c.on('close', () => { if (status !== 'error') setStatus('idle'); log('info','closed') })
      c.on('message', (topic, payload) => log('info', 'msg '+topic+' '+payload.toString()))
      c.on('packetreceive', (p: any) => { if (p.cmd === 'connack') { log('info','connack rc='+(p.returnCode!==undefined?p.returnCode:p.reasonCode)) } })
      c.on('packetsend', (p:any)=> { if (p.cmd==='connect') log('info','sent CONNECT proto='+p.protocolId+' v'+p.protocolVersion) })
    } catch (e:any) {
      setStatus('error'); log('error','throw '+(e?.message||e))
    }
  }

  function disconnect() {
    clientRef.current?.end(true); clientRef.current=null; setStatus('idle'); log('info','manual disconnect')
  }

  function subscribeTopic() {
    if (!clientRef.current) { log('error','not connected'); return }
    const t = subTopic.trim(); if (!t) { log('error','sub topic empty'); return }
    clientRef.current.subscribe(t, err => err? log('error','sub fail '+err.message):log('info','sub '+t))
  }

  function publishMsg() {
    if (!clientRef.current) { log('error','not connected'); return }
    const t = pubTopic.trim(); if (!t) { log('error','pub topic empty'); return }
    clientRef.current.publish(t, pubPayload, { qos:0 }, err => err? log('error','pub fail '+err.message):log('info','pub '+t))
  }

  async function pingTest() {
    try {
      log('info','ping https://1.1.1.1/cdn-cgi/trace')
      const res = await fetch('https://1.1.1.1/cdn-cgi/trace',{cache:'no-store'})
      const text = await res.text()
      log('info','ping ok bytes='+text.length)
    } catch(e:any) {
      log('error','ping fail '+(e?.message||e))
    }
  }

  function fillMosquitto() {
    setHost('test.mosquitto.org'); setPort('8081'); setPath('/mqtt'); setClientId('testClient_'+Date.now()); setUsername(''); setPassword(''); log('info','filled public broker test.mosquitto.org:8081')
  }

  function fillAliyunTemplate() {
    setHost('iot-xxxxx.mqtt.iothub.aliyuncs.com'); setPort('443'); setPath('/mqtt'); log('info','filled aliyun template host/port/path'); 
  }

  function genAliyunCreds() {
    if (!akProductKey || !akDeviceName || !akDeviceSecret) { log('error','Aliyun fields empty'); return }
    const ts = Date.now().toString()
    const clientIdCore = `${akProductKey}.${akDeviceName}`
    const signContent = `clientId${clientIdCore}deviceName${akDeviceName}productKey${akProductKey}timestamp${ts}`
    setSignPreview(signContent + ' |len='+signContent.length)
    let hmac: string
    try {
      // browser crypto subtle digest cannot use hmac directly without key import; fallback to simple js lib not present.
      // Use dynamic import of built-in Web Crypto for HMAC.
      // Simpler: try to use window.crypto.subtle
      const enc = new TextEncoder()
      const keyData = enc.encode(akDeviceSecret)
      ;(async()=>{
        try {
          const key = await crypto.subtle.importKey('raw', keyData, { name:'HMAC', hash:'SHA-256' }, false, ['sign'])
          const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(signContent))
          const bytes = Array.from(new Uint8Array(sigBuf))
          hmac = bytes.map(b=>b.toString(16).padStart(2,'0')).join('')
          const clientIdGen = `${clientIdCore}|securemode=2,signmethod=hmacsha256,timestamp=${ts}|`
          const usernameGen = `${akDeviceName}&${akProductKey}`
          setClientId(clientIdGen)
            ;(document.querySelector('input[placeholder="username"]') as HTMLInputElement|null)?.focus()
          setUsername(usernameGen)
          setPassword(hmac)
          setHost(`${akProductKey}.mqtt.iothub.aliyuncs.com`)
          setPort('443'); setPath('/mqtt')
          log('info','Aliyun credentials generated')
        } catch(e:any){ log('error','crypto fail '+(e?.message||e)) }
      })()
    } catch(e:any) { log('error','gen error '+(e?.message||e)) }
  }

  function rawWsTest(){
    const url = buildUrl(); if(!url){ log('error','host empty'); return }
    let ws: WebSocket
    try {
      log('info','raw ws start '+url)
      ws = new WebSocket(url,'mqtt')
      ws.onopen = ()=>log('info','raw ws open (HTTP 101 success)')
      ws.onerror = (e:any)=>log('error','raw ws error '+(e?.message||''))
      ws.onclose = (ev)=>log('info',`raw ws close code=${ev.code} reason=${ev.reason}`)
    } catch(e:any){ log('error','raw ws throw '+(e?.message||e)) }
  }

  useEffect(()=>()=>{ clientRef.current?.end(true) },[])

  return (
    <div style={{ fontFamily:'system-ui', padding:20, maxWidth:1200, margin:'0 auto' }}>
      <h1 style={{ fontSize:24, fontWeight:600 }}>MQTT Connect Tester</h1>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:12, marginBottom:8 }}>
        <button onClick={pingTest} style={{background:'#0d9488',color:'#fff',padding:'4px 10px',border:'none',borderRadius:4}}>Net Ping</button>
        <button onClick={fillMosquitto} style={{background:'#9333ea',color:'#fff',padding:'4px 10px',border:'none',borderRadius:4}}>Fill Public Broker</button>
        <button onClick={fillAliyunTemplate} style={{background:'#475569',color:'#fff',padding:'4px 10px',border:'none',borderRadius:4}}>Aliyun Template</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <div>
          <div style={{ border:'1px solid #ccc', padding:12, borderRadius:6, marginBottom:16 }}>
            <h2 style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Connection</h2>
            <div style={{ display:'grid', gridTemplateColumns:'90px 1fr', gap:6, fontSize:12 }}>
              <label>Host</label><input value={host} onChange={e=>setHost(e.target.value)} placeholder="iot-xxx.mqtt.iothub.aliyuncs.com" style={{border:'1px solid #999',padding:4,borderRadius:4}} />
              <label>Port</label><input value={port} onChange={e=>setPort(e.target.value)} style={{border:'1px solid #999',padding:4,borderRadius:4}} />
              <label>Path</label><input value={path} onChange={e=>setPath(e.target.value)} style={{border:'1px solid #999',padding:4,borderRadius:4}} />
              <label>ClientId</label><input value={clientId} onChange={e=>setClientId(e.target.value)} style={{border:'1px solid #999',padding:4,borderRadius:4}} />
              <label>Username</label><input value={username} onChange={e=>setUsername(e.target.value)} style={{border:'1px solid #999',padding:4,borderRadius:4}} />
              <label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{border:'1px solid #999',padding:4,borderRadius:4}} />
              <label>Keepalive</label><input type="number" value={keepalive} onChange={e=>setKeepalive(Number(e.target.value)||0)} style={{border:'1px solid #999',padding:4,borderRadius:4}} />
              <label>Clean</label><input type="checkbox" checked={clean} onChange={e=>setClean(e.target.checked)} />
            </div>
            <div style={{ display:'flex', gap:8, marginTop:10, fontSize:12 }}>
              <button onClick={connect} disabled={status==='connecting'} style={{background:'#16a34a',color:'#fff',padding:'4px 10px',borderRadius:4,border:'none'}}>Connect</button>
              <button onClick={disconnect} style={{background:'#475569',color:'#fff',padding:'4px 10px',borderRadius:4,border:'none'}}>Disconnect</button>
              <span>Status: {status}</span>
            </div>
            <div style={{ fontSize:11, color:'#555', marginTop:6 }}>URL: {buildUrl()||'(empty)'}</div>
          </div>
          <div style={{ border:'1px solid #ccc', padding:12, borderRadius:6 }}>
            <h2 style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Subscribe / Publish</h2>
            <div style={{ display:'flex', gap:6, marginBottom:6 }}>
              <input value={subTopic} onChange={e=>setSubTopic(e.target.value)} placeholder="/sys/.../post" style={{flex:1,border:'1px solid #999',padding:4,borderRadius:4,fontSize:12}} />
              <button onClick={subscribeTopic} style={{background:'#2563eb',color:'#fff',padding:'4px 10px',border:'none',borderRadius:4,fontSize:12}}>Sub</button>
            </div>
            <div style={{ display:'flex', gap:6, marginBottom:6 }}>
              <input value={pubTopic} onChange={e=>setPubTopic(e.target.value)} placeholder="topic" style={{flex:1,border:'1px solid #999',padding:4,borderRadius:4,fontSize:12}} />
              <button onClick={publishMsg} style={{background:'#4f46e5',color:'#fff',padding:'4px 10px',border:'none',borderRadius:4,fontSize:12}}>Pub</button>
            </div>
            <textarea value={pubPayload} onChange={e=>setPubPayload(e.target.value)} placeholder="payload" style={{width:'100%',height:80,border:'1px solid #999',padding:4,borderRadius:4,fontSize:12,fontFamily:'monospace'}} />
          </div>
        </div>
        <div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <h2 style={{ fontSize:14, fontWeight:600 }}>Logs</h2>
            <button onClick={()=>setLogs([])} style={{ background:'none', border:'none', color:'#2563eb', fontSize:11, textDecoration:'underline', cursor:'pointer' }}>Clear</button>
          </div>
          <div style={{ border:'1px solid #222', background:'#000', color:'#d1d5db', height:540, overflow:'auto', fontSize:11, padding:8, fontFamily:'monospace' }}>
            {logs.map(l => (
              <div key={l.ts+Math.random()} style={{ color: l.level==='error'? '#f87171':'#86efac' }}>
                {new Date(l.ts).toLocaleTimeString()} [{l.level}] {l.msg}
              </div>
            ))}
            {logs.length===0 && <div style={{color:'#555'}}>no logs</div>}
          </div>
        </div>
      </div>
      <div style={{ fontSize:11, color:'#555', marginTop:10 }}>
        Browser must use wss. Typical path is /mqtt. For Aliyun use host like iot-xxxxx.mqtt.iothub.aliyuncs.com.
      </div>
      <div style={{marginTop:20, padding:12, border:'1px solid #334155', borderRadius:8}}>
        <h2 style={{fontSize:16,margin:'0 0 8px'}}>Aliyun Sign Helper (local only)</h2>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          <input placeholder='ProductKey' value={akProductKey} onChange={e=>setAkProductKey(e.target.value)} style={{flex:'1 1 160px'}} />
          <input placeholder='DeviceName' value={akDeviceName} onChange={e=>setAkDeviceName(e.target.value)} style={{flex:'1 1 160px'}} />
          <input placeholder='DeviceSecret (never commit)' type='password' value={akDeviceSecret} onChange={e=>setAkDeviceSecret(e.target.value)} style={{flex:'2 1 240px'}} />
          <button onClick={genAliyunCreds} style={{background:'#2563eb',color:'#fff',padding:'6px 14px',border:'none',borderRadius:4}}>Generate</button>
        </div>
        <p style={{fontSize:12,opacity:.7,marginTop:6}}>Generates clientId/username/password + host automatically using HMAC-SHA256 in browser.</p>
        <div style={{marginTop:8, display:'flex', gap:8, flexWrap:'wrap'}}>
          <button onClick={rawWsTest} style={{background:'#111827',color:'#fff',padding:'6px 14px',border:'none',borderRadius:4}}>Raw WS Test</button>
          {signPreview && <div style={{fontSize:11, background:'#1e293b', color:'#e2e8f0', padding:'4px 8px', borderRadius:4, maxWidth:600, wordBreak:'break-all'}}>signContent: {signPreview}</div>}
        </div>
      </div>
    </div>
  )
}

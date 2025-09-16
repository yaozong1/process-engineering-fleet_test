"use client";
import { useState, useEffect, useRef } from "react";
import mqtt, { MqttClient } from "mqtt";
import { mqttEnv, buildClientId, fetchSignedCredentials } from "@/lib/mqtt";

interface LogEntry { ts: number; level: "info" | "error" | "warn"; msg: string; data?: any }

function useLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const push = (level: LogEntry["level"], msg: string, data?: any) => {
    setLogs(l => [...l, { ts: Date.now(), level, msg, data }]);
  };
  return { logs, push };
}

export default function DriveMQTTPage() {
  const { logs, push } = useLogger();
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [clientId, setClientId] = useState(buildClientId());
  const [lastMessage, setLastMessage] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [subscribed, setSubscribed] = useState<string[]>([]);
  const triedRef = useRef<Set<string>>(new Set());
  const clientRef = useRef<MqttClient | null>(null);

  const urls: string[] = [];
  if (mqttEnv.host) urls.push(`wss://${mqttEnv.host}/mqtt`);
  // Only add fallback productKey host if different from instance host
  if (mqttEnv.productKey && mqttEnv.host && !mqttEnv.host.startsWith(`${mqttEnv.productKey}.`)) {
    urls.push(`wss://${mqttEnv.productKey}.iot-as-mqtt.cn-shanghai.aliyuncs.com/mqtt`);
  }

  useEffect(() => {
    attemptConnect();
    return () => { clientRef.current?.end(true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function attemptConnect() {
    if (!urls.length) {
      setStatus("error");
      push("error", "No host configured");
      return;
    }
    const url = urls[currentUrlIndex];
    if (!url) return;
    if (triedRef.current.has(url)) return;
    triedRef.current.add(url);
    connect(url);
  }

  async function connect(url: string) {
    setStatus("connecting");
    let cid = buildClientId();
    let username = mqttEnv.username;
    let password = mqttEnv.password;
    if (!password) {
      try {
        const signed = await fetchSignedCredentials();
        cid = signed.clientId;
        username = signed.username;
        password = signed.password;
        push("info", "Signed credentials fetched");
      } catch (e: any) {
        push("error", "Sign fetch failed", { message: e?.message });
        setStatus("error");
        return;
      }
    }
    setClientId(cid);
    push("info", "Connecting", { url, cid, username });
    const c = mqtt.connect(url, {
      clientId: cid,
      username,
      password,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 0,
      protocolVersion: 4
    });
    clientRef.current = c;
    c.on("connect", () => {
      setStatus("connected");
      push("info", "Connected OK", { url });
    });
    c.on("message", (t, payload) => {
      const s = payload.toString();
      setLastMessage(`${t}: ${s}`);
      push("info", "Message", { topic: t, payload: s });
    });
    c.on("error", (e) => {
      push("error", "Error", { message: e?.message });
      setStatus("error");
      c.end(true);
      if (currentUrlIndex + 1 < urls.length) {
        setCurrentUrlIndex(i => i + 1);
        setTimeout(() => attemptConnect(), 50);
      }
    });
    c.on("close", () => {
      if (status === "connected") {
        push("warn", "Closed");
        setStatus("idle");
      }
    });
  }

  function subscribeTopic() {
    const t = topicInput.trim();
    if (!t || !clientRef.current) return;
    clientRef.current.subscribe(t, { qos: 0 }, err => {
      if (err) push("error", "Subscribe failed", { t, err: String(err) });
      else { setSubscribed(s => [...s, t]); push("info", "Subscribed", { t }); }
    });
  }

  function publishDemo() {
    if (!clientRef.current) return;
    const demoTopic = topicInput.trim() || `/sys/${mqttEnv.productKey}/${mqttEnv.deviceName}/thing/event/property/post`;
    const payload = JSON.stringify({ id: Date.now(), version: "1.0", params: { voltage: 12.3, current: -2.1, temperature: 30, soc: 70 }, time: Date.now() });
    clientRef.current.publish(demoTopic, payload);
    push("info", "Published", { demoTopic, payload });
  }

  const currentUrl = urls[currentUrlIndex] || "";

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">MQTT Debug</h1>
      <div className="grid gap-2 text-sm">
        <div>Status: <span className="font-mono">{status}</span></div>
        <div>URL: <span className="font-mono break-all">{currentUrl}</span></div>
        <div>ClientID: <span className="font-mono break-all">{clientId}</span></div>
        <div>Username: <span className="font-mono">{mqttEnv.username}</span></div>
        <div>Has Password: {mqttEnv.password ? "Yes" : "No"}</div>
        <div>Last Msg: <span className="font-mono break-all">{lastMessage}</span></div>
      </div>
      <div className="flex gap-2 items-center">
        <input value={topicInput} onChange={e => setTopicInput(e.target.value)} placeholder="Topic" className="border px-2 py-1 rounded text-sm flex-1 bg-neutral-900 border-neutral-700" />
        <button onClick={subscribeTopic} className="px-3 py-1 bg-blue-600 rounded text-sm">Sub</button>
        <button onClick={publishDemo} className="px-3 py-1 bg-emerald-600 rounded text-sm">Pub</button>
      </div>
      {subscribed.length > 0 && (
        <div className="text-xs">Subscribed: {subscribed.join(", ")}</div>
      )}
      <div className="border border-neutral-700 rounded h-72 overflow-auto bg-neutral-950 text-xs font-mono p-2 space-y-1">
        {logs.map(l => (
          <div key={l.ts + l.msg} className={l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-yellow-400" : "text-neutral-300"}>
            {new Date(l.ts).toLocaleTimeString()} [{l.level}] {l.msg} {l.data ? JSON.stringify(l.data) : ""}
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Ensure password matches the exact clientId (timestamp sensitive). Browser must use wss on port 443.
      </p>
    </div>
  );
}

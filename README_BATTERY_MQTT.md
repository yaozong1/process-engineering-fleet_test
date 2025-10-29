# 电池数据 MQTT 指南

本文档说明如何向系统发布电池数据（Battery），以及如何配置/切换 MQTT Broker。

## 支持的主题总览

- 电池遥测（Battery）：`fleet/{deviceId}/battery`
- 设备状态（Status）：`fleet/{deviceId}/status`
- 充电桩（Charge Node）：`fleet/chargenode/{stationId}`

说明：
- `{deviceId}` 如 `PE-001`、`PE-002`；`{stationId}` 如 `PN-001`、`PN-003`。
- 下文以 Battery 为主，附带 Status 与 Charge Node 的规范与示例。

## 主题与负载

- 主题格式：`fleet/{deviceId}/battery`
  - 示例：`fleet/PE-002/battery`
- 负载示例：

```json
{
  "device": "PE-002",
  "ts": 1758616069567,
  "soc": 36,
  "voltage": 12.05,
  "temperature": 31.4,
  "health": 96,
  "cycleCount": 182,
  "estimatedRangeKm": 120.5,
  "chargingStatus": "discharging",
  "alerts": [],
  "gps": {
    "lat": 22.722924,
    "lng": 114.21307,
    "speed": 36.5,
    "heading": 245,
    "altitude": 12.3,
    "accuracy": 5
  }
}
```

说明：
- device：设备 ID，需与主题中的 `{deviceId}` 一致。
- ts：消息时间戳（毫秒）。若发送旧时间戳，后端会在必要时进行纠偏以避免“离线”显示。
- soc/voltage/temperature/health 等为电池关键指标。
- gps 为可选对象，包含定位/速度/航向/高度/精度等。

### Battery 字段规范（后端容错与同义字段）

- device（字符串，可选）：与主题中的 `{deviceId}` 一致；后端以主题解析的 ID 为准。
- ts（数字，可选）：毫秒时间戳；缺省由服务端到达时间填充。
- soc（数字，0-100，可选）
- voltage（数字，单位 V，可选）
- temperature（数字，单位 °C，可选）
- health（数字，0-100，可选）
- cycleCount（数字，可选）
- estimatedRangeKm（数字，可选）
- chargingStatus（字符串，可选）：如 `charging`、`discharging`、`idle`、`fully_charged`、`error` 等。
- alerts（字符串数组，可选）
- gps（对象，可选）：
  - lat / latitude（数字）
  - lng / lon / longitude（数字）
  - speed（数字，可选）
  - heading / course（数字，可选）
  - altitude（数字，可选）
  - accuracy（数字，可选）

后端容错：
- gps 可为对象或数组，若为数组则取第 0 个元素。
- 同义字段会被自动归一化：如 `lat`/`latitude`，`lng`/`lon`/`longitude`，`heading`/`course`。
- 若 JSON 存在常见的引号缺失等小问题，后端会尝试修复并解析（仅针对 battery）。

去重逻辑（Battery）：
- 现在规则为“任一关键要素变化即有效”：只要以下任意一项发生“有效变化”，就会视为有效数据并存储：
  - SOC 变化幅度 ≥ 0.1
  - 电压 Voltage 变化幅度 ≥ 0.01
  - GPS 发生变化（经纬度任一变化 ≥ 0.0001，约 11 米；或上一条有 GPS 而本条无 GPS、反之亦然）
- 仅当“以上三项都未发生变化”且“与上次存储时间间隔 < 30 秒”时，才会被判定为重复数据并跳过存储。

时间戳策略：
- Battery：如果未提供 `ts` 或提供旧时间戳，后端最终存储条目会使用接收时刻的当前时间（以保证前端“在线”显示的连贯性）。
- Charge Node：始终以服务器当前时间存储 `ts`，即使上报中带有旧时间戳。

QoS / Retain 建议：
- 建议 QoS=1（至少一次），避免丢失；不建议对遥测使用 Retain，以免新连接收到旧数据导致误判。

## Broker 配置与切换

本仓库已支持通过 `.env.local` 切换 MQTT Broker，优先顺序如下：

1. `MY_PUBLIC_MQTT_URL` / `MY_PUBLIC_MQTT_USERNAME` / `MY_PUBLIC_MQTT_PASSWORD`
2. 回退到 `NEXT_PUBLIC_MQTT_URL` / `NEXT_PUBLIC_MQTT_USERNAME` / `NEXT_PUBLIC_MQTT_PASSWORD`
3. 再回退到脚本内置的默认值（仅示例/测试用）

示例 `.env.local`：

```bash
# 后端/脚本共用（优先）
MY_PUBLIC_MQTT_URL=ws://processengineeringsz.com:8083/mqtt
MY_PUBLIC_MQTT_USERNAME=testuser
MY_PUBLIC_MQTT_PASSWORD=Hh3341136

# 兼容旧变量（可选）
NEXT_PUBLIC_MQTT_URL=ws://processengineeringsz.com:8083/mqtt
NEXT_PUBLIC_MQTT_USERNAME=testuser
NEXT_PUBLIC_MQTT_PASSWORD=Hh3341136
```

注意：
- 前端直连 MQTT 默认关闭（`NEXT_PUBLIC_ENABLE_FRONTEND_MQTT=false`）。后台服务与脚本不受其影响。
- 若仅提供 URL 且不需要鉴权，可省略用户名/密码。

## 发送示例脚本

已提供 `send-battery-message.js` 发布上述示例负载：

- 主题：`fleet/PE-002/battery`
- 负载：见上方 JSON 示例（其中 `chargingStatus` 固定为 `"discharging"`）
- 连接参数：从 `.env.local` 读取（优先 MY_PUBLIC_*，回退 NEXT_PUBLIC_*）

运行步骤（确保已安装依赖并填写 `.env.local`）：

```bash
# 方式一：直接运行脚本
node send-battery-message.js

# 方式二：通过 npm 脚本（如果已在 package.json 注册）
npm run mqtt:battery
```

更多 Battery 示例：

1）最小负载（仅 SOC）：

```json
{ "device": "PE-001", "soc": 55 }
```

2）包含 GPS 的动态更新：

```json
{
  "device": "PE-003",
  "soc": 72.5,
  "voltage": 12.1,
  "temperature": 26.3,
  "gps": { "lat": 22.58, "lng": 113.95, "speed": 14.2, "heading": 92 }
}
```

3）带告警：

```json
{
  "device": "PE-004",
  "soc": 12,
  "voltage": 11.7,
  "temperature": 45.8,
  "alerts": ["Low battery warning", "High temperature"]
}
```

## Status 主题（可选）

- 主题：`fleet/{deviceId}/status`
- 负载：简单字符串，如 `online` / `offline` / `charging` 等（后端目前仅记录日志，可用于状态面板扩展）。

示例：

```
Topic: fleet/PE-002/status
Payload: online
```

## Charge Node 充电桩主题

- 主题：`fleet/chargenode/{stationId}`
- 字段：
  - status（字符串，默认 `offline`）
  - voltage / current / power / energy（数值，可选）
  - remainingTime（数值，可选）
  - temperature（数值，可选）
  - connectorType（字符串，可选）
  - maxPower（数值，可选）
  - location（字符串，可选）
  - faultCode / faultMessage（字符串，可选）
- 时间戳规则：存储时总是使用服务器当前时间（覆盖上报中的旧 ts）。

示例：

```json
{
  "status": "charging",
  "voltage": 400.5,
  "current": 125.3,
  "power": 51.2,
  "energy": 15.7,
  "remainingTime": 45,
  "temperature": 50.2,
  "connectorType": "Type2",
  "maxPower": 60,
  "location": "Slot A01"
}
```

## 后端接入

后端服务 `src/services/mqtt-service.ts` 已切换为优先读取 `MY_PUBLIC_*` 环境变量，并回退到 `NEXT_PUBLIC_*` 或默认值，不影响原有功能。

- 订阅主题：
  - 电池：`fleet/+/battery`
  - 状态：`fleet/+/status`
  - 充电桩：`fleet/chargenode/+`
- 重复数据去重：30 秒内若数值/GPS 未变化，会跳过存储以降低噪音。

## 常见问题

- 连接报错：请检查 URL 是否可达（浏览器/服务器网络、端口与路径是否正确）。
- 无认证或密码错误：若 Broker 需要鉴权，请确保 `.env.local` 中用户名/密码正确。
- 前端不显示：前端默认使用轮询或后端入库的数据，若需前端直连，请将 `NEXT_PUBLIC_ENABLE_FRONTEND_MQTT=true` 并确保 `NEXT_PUBLIC_MQTT_URL` 指向 WSS。

## 小贴士

- 建议客户端设置：`keepalive=60`，`protocolVersion=4`（MQTT v3.1.1），`clean=true`，`reconnectPeriod=5000`（如需自动重连）。
- 生产环境避免发送 `retain` 的历史遥测；如需最后一次状态提示，可仅在 `status` 主题使用 retain。
- 服务器端具备入库失败重试与指数退避，网络抖动情况下可自行恢复。

---
如需扩展字段或新增主题，请在本文件补充规范并更新发布脚本。

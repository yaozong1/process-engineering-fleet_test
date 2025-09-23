# 充电桩（Charge Node）MQTT Payload 格式说明

## 1. MQTT主题格式
```
fleet/chargenode/{stationId}
```
示例：`fleet/chargenode/PN-001`，`fleet/chargenode/PN-002`

---

## 2. Payload 数据结构

```jsonc
{
  "ts": 1695456789123,                // 时间戳 (Unix毫秒)
  "status": "charging",                // 状态
  "voltage": 415.2,                     // 电压 (V)
  "current": 125.8,                     // 电流 (A)
  "power": 52.2,                        // 功率 (kW)
  "energy": 28.5,                       // 已充电能量 (kWh)
  "remainingTime": 45,                  // 剩余时间 (分钟)
  "temperature": 35.4,                  // 温度 (°C)
  "connectorType": "CCS2",             // 连接器类型
  "maxPower": 150,                      // 最大功率 (kW)
  "location": "停车位 001",             // 物理位置
  "faultCode": null,                    // 故障代码
  "faultMessage": null                  // 故障描述
}
```

---

## 3. 字段详细说明

| 字段            | 类型           | 必需 | 说明             | 示例值         |
|-----------------|----------------|------|------------------|----------------|
| ts              | number         | ✅   | Unix时间戳(毫秒) | 1695456789123  |
| status          | string         | ✅   | 充电桩状态       | "charging"    |
| voltage         | number/null    | ❌   | 输出电压(V)      | 415.2          |
| current         | number/null    | ❌   | 输出电流(A)      | 125.8          |
| power           | number/null    | ❌   | 当前功率(kW)     | 52.2           |
| energy          | number/null    | ❌   | 已充能量(kWh)    | 28.5           |
| remainingTime   | number/null    | ❌   | 剩余时间(分钟)   | 45             |
| maxPower        | number         | ✅   | 最大功率(kW)     | 150            |
| connectorType   | string         | ✅   | 连接器类型       | "CCS2"        |
| temperature     | number         | ✅   | 设备温度(°C)     | 35.4           |
| location        | string         | ✅   | 物理位置         | "停车位 001"  |
| faultCode       | string/null    | ❌   | 故障代码         | "E001"        |
| faultMessage    | string/null    | ❌   | 故障描述         | "温度过高"    |

---

## 4. 状态说明

| 状态        | 说明           | 电压/电流/功率 | 其他特征                |
|-------------|----------------|----------------|-------------------------|
| "idle"      | 空闲待机       | 有电压，无电流 | power = 0               |
| "charging"  | 正在充电       | 正常工作参数   | 有功率输出              |
| "fault"     | 设备故障       | 可能异常或为空 | 包含故障信息            |
| "offline"   | 离线断网       | 通常为空       | 设备无响应              |
| "occupied"  | 被占用未充电   | 可能有电压无电流 | 车辆已连接但未开始充电 |

---

## 5. Payload 示例

### 5.1 正在充电
```json
{
  "ts": 1695456789123,
  "status": "charging",
  "voltage": 415.2,
  "current": 125.8,
  "power": 52.2,
  "energy": 28.5,
  "remainingTime": 45,
  "temperature": 35.4,
  "connectorType": "CCS2",
  "maxPower": 150,
  "location": "停车位 001",
  "faultCode": null,
  "faultMessage": null
}
```

### 5.2 空闲待机
```json
{
  "ts": 1695456789123,
  "status": "idle",
  "voltage": 380.5,
  "current": 0,
  "power": 0,
  "energy": null,
  "remainingTime": null,
  "temperature": 25.2,
  "connectorType": "CCS2",
  "maxPower": 150,
  "location": "停车位 002",
  "faultCode": null,
  "faultMessage": null
}
```

### 5.3 设备故障
```json
{
  "ts": 1695456789123,
  "status": "fault",
  "voltage": null,
  "current": 0,
  "power": 0,
  "energy": null,
  "remainingTime": null,
  "temperature": 75.8,
  "connectorType": "CHAdeMO",
  "maxPower": 150,
  "location": "停车位 003",
  "faultCode": "E001",
  "faultMessage": "温度过高"
}
```

### 5.4 被占用未充电
```json
{
  "ts": 1695456789123,
  "status": "occupied",
  "voltage": 385.0,
  "current": 0,
  "power": 0,
  "energy": null,
  "remainingTime": null,
  "temperature": 28.1,
  "connectorType": "Type2",
  "maxPower": 150,
  "location": "停车位 004",
  "faultCode": null,
  "faultMessage": null
}
```

---

## 6. 连接器类型 (connectorType)
- "CCS2" - Combined Charging System 2
- "CHAdeMO" - 日本快充标准
- "Type2" - 欧洲交流充电标准
- "GB/T" - 中国国标

---

## 7. 功率计算
```
power (kW) = voltage (V) × current (A) ÷ 1000
```

---

本说明适用于所有 `fleet/chargenode/{stationId}` 主题的充电桩MQTT数据。
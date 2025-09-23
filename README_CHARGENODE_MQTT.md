# 充电桩（Charge Node）MQTT Payload 格式说明

## 1. MQTT主题格式
```
fleet/chargenode/{stationId}
```
示例：`fleet/chargenode/PN-001`，`fleet/chargenode/PN-002`

---

## 2. 数据存储架构（简化版 v2.0）

### Redis存储结构
充电桩数据现在使用与battery/GPS相同的单一键存储方式：

```
Redis键: telemetry:chargenode:{stationId}
存储类型: List（Redis List）
数据格式: JSON字符串
历史记录: 最多保留200条记录
过期时间: 24小时
```

**示例Redis键：**
- `telemetry:chargenode:PN-001`
- `telemetry:chargenode:PN-002`

### 离线检测机制
充电桩设备离线检测采用基于时间戳的超时机制：

```
超时阈值: 5分钟 (300秒)
检测逻辑: 当前时间 - 最后数据时间戳 > 300000毫秒
自动处理: 超时的充电桩自动标记为 "offline" 状态
检测频率: 每次API调用时实时检测
```

**离线检测流程：**
1. API获取充电桩最新数据时检查时间戳
2. 计算与当前时间的差值
3. 超过5分钟则强制设置状态为 "offline"
4. 前端显示超时警告提示

### 存储优势
1. **简化架构**：从3个Redis键简化为1个键
2. **一致性**：与battery/GPS数据存储方式完全一致
3. **维护性**：更容易管理和调试
4. **性能**：减少Redis操作次数
5. **离线检测**：自动检测设备离线状态

---

## 3. Payload 数据结构

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

## 4. 字段详细说明

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

| 状态        | 说明           | 电压/电流/功率 | 其他特征                | 触发条件 |
|-------------|----------------|----------------|-------------------------|----------|
| "idle"      | 空闲待机       | 有电压，无电流 | power = 0               | 设备正常通信，无充电活动 |
| "charging"  | 正在充电       | 正常工作参数   | 有功率输出              | 设备正常通信，正在充电 |
| "fault"     | 设备故障       | 可能异常或为空 | 包含故障信息            | 设备上报故障状态 |
| "offline"   | 离线断网       | 通常为空       | 设备无响应              | **超过5分钟无数据上传** |
| "occupied"  | 被占用未充电   | 可能有电压无电流 | 车辆已连接但未开始充电 | 设备检测到车辆连接 |

### 离线检测详情
- **超时时间**：5分钟 (300秒)
- **检测方式**：基于最后数据时间戳
- **自动处理**：API自动将超时设备标记为 "offline"
- **前端提示**：显示 "⚠️ 设备超时离线 (超过5分钟无数据)" 警告

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
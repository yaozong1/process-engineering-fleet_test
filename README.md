# Process Engineering Fleet Management System

一个基于Next.js的工程车队管理系统，提供实时电池监控、GPS跟踪和MQTT数据收集功能。

## ? 快速开始

### 安装依赖
```bash
npm install
```

### 配置环境变量
创建 `.env.local` 文件：
```bash
# MQTT配置
NEXT_PUBLIC_MQTT_URL=wss://your-mqtt-broker.com:8884/mqtt
NEXT_PUBLIC_MQTT_USERNAME=your_username
NEXT_PUBLIC_MQTT_PASSWORD=your_password

# Redis配置
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# JWT认证
JWT_SECRET=your-jwt-secret-key
NEXTAUTH_SECRET=your-nextauth-secret

# 设备配置
NEXT_PUBLIC_PRODUCT_KEY=your_product_key
NEXT_PUBLIC_DEVICE_NAME=PE-001
```

### 启动开发服务器
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## ? MQTT数据格式规范

### 主题结构
系统使用以下MQTT主题结构：
```
fleet/{设备ID}/{消息类型}
```

**示例：**
- `fleet/PE-001/battery` - PE-001设备的电池数据
- `fleet/PE-002/status` - PE-002设备的状态信息

### 电池数据格式 (battery)

**主题：** `fleet/{设备ID}/battery`

**JSON格式：**
```json
{
  "soc": 75,
  "voltage": 12.5,
  "temperature": 22,
  "health": 88,
  "cycleCount": 250,
  "estimatedRangeKm": 280,
  "chargingStatus": "idle",
  "alerts": ["Low battery warning", "High temperature"]
}
```

**字段说明：**
| 字段 | 类型 | 必需 | 说明 | 单位 | 范围 |
|------|------|------|------|------|------|
| `soc` | number | ? | 电池电量百分比 | % | 0-100 |
| `voltage` | number | ? | 电池电压 | V | 0-15 |
| `temperature` | number | ? | 电池温度 | °C | -40~85 |
| `health` | number | ? | 电池健康度 | % | 0-100 |
| `cycleCount` | number | ? | 充电循环次数 | 次 | ≥0 |
| `estimatedRangeKm` | number | ? | 预估续航里程 | km | ≥0 |
| `chargingStatus` | string | ? | 充电状态 | - | 见下表 |
| `alerts` | string[] | ? | 警告信息数组 | - | - |

**充电状态值：**
- `"idle"` - 空闲
- `"charging"` - 充电中
- `"discharging"` - 放电中
- `"fully_charged"` - 充满电
- `"error"` - 错误状态

### 状态数据格式 (status)

**主题：** `fleet/{设备ID}/status`

**JSON格式：**
```json
{
  "online": true,
  "lastSeen": "2025-09-19T10:30:00Z",
  "location": {
    "latitude": 39.9042,
    "longitude": 116.4074,
    "accuracy": 10
  },
  "signal": {
    "strength": -75,
    "quality": "good"
  }
}
```

## ? MQTT发送示例

### Node.js示例
```javascript
const mqtt = require('mqtt');

const client = mqtt.connect('wss://your-broker.com:8884/mqtt', {
  username: 'your_username',
  password: 'your_password'
});

client.on('connect', () => {
  // 发送电池数据
  const batteryData = {
    soc: 85,
    voltage: 12.8,
    temperature: 25,
    health: 92,
    cycleCount: 150,
    estimatedRangeKm: 320,
    chargingStatus: "charging",
    alerts: []
  };
  
  client.publish('fleet/PE-001/battery', JSON.stringify(batteryData));
});
```

### Python示例
```python
import paho.mqtt.client as mqtt
import json

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    
    # 发送电池数据
    battery_data = {
        "soc": 85,
        "voltage": 12.8,
        "temperature": 25,
        "health": 92,
        "cycleCount": 150,
        "estimatedRangeKm": 320,
        "chargingStatus": "charging",
        "alerts": []
    }
    
    client.publish("fleet/PE-001/battery", json.dumps(battery_data))

client = mqtt.Client()
client.username_pw_set("your_username", "your_password")
client.on_connect = on_connect
client.connect("your-broker.com", 8884, 60)
client.loop_forever()
```

## ?? 后端MQTT服务

系统包含独立的后端MQTT服务，可24/7持续接收和存储数据：

### 服务管理API

**获取服务状态：**
```bash
GET /api/mqtt-service
```

**启动服务：**
```bash
POST /api/mqtt-service
Content-Type: application/json

{"action": "start"}
```

**停止服务：**
```bash
POST /api/mqtt-service
Content-Type: application/json

{"action": "stop"}
```

**重启服务：**
```bash
POST /api/mqtt-service
Content-Type: application/json

{"action": "restart"}
```

### 特性
- ? 7x24小时持续运行
- ? 自动重连机制
- ? JSON格式自动修复
- ? 错误重试机制
- ? 详细日志记录

## ? 数据API

### 获取设备列表
```bash
GET /api/telemetry?list=1
```

### 获取设备数据
```bash
GET /api/telemetry?device=PE-001&limit=100
```

### 发送数据
```bash
POST /api/telemetry
Content-Type: application/json

{
  "device": "PE-001",
  "ts": 1758213574090,
  "soc": 75,
  "voltage": 12.5,
  "temperature": 22,
  "health": 88,
  "cycleCount": 250,
  "estimatedRangeKm": 280,
  "chargingStatus": "idle",
  "alerts": ["Low battery"]
}
```

## ?? 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API路由
│   │   ├── telemetry/     # 遥测数据API
│   │   └── mqtt-service/  # MQTT服务管理API
│   └── pages/             # 页面组件
├── components/            # React组件
│   ├── battery-monitor-dashboard.tsx
│   ├── gps-tracking-dashboard.tsx
│   └── ui/               # UI组件库
├── services/             # 后端服务
│   ├── mqtt-service.ts   # MQTT后端服务
│   └── server-init.ts    # 服务器初始化
├── lib/                  # 工具库
│   ├── redis.ts         # Redis客户端
│   └── utils.ts         # 通用工具
└── hooks/               # React Hooks
    ├── useMQTT.ts       # MQTT客户端Hook
    └── useAutoLogout.ts # 自动登出Hook
```

## ? 设备命名规范

设备ID格式：`PE-XXX`
- `PE` - Process Engineering 缩写
- `XXX` - 三位数字编号（001-999）

**示例：**
- `PE-001` - 1号工程车
- `PE-002` - 2号工程车
- `PE-100` - 100号工程车

## ? 开发工具

### 构建项目
```bash
npm run build
```

### 类型检查
```bash
npm run type-check
```

### 代码格式化
```bash
npm run format
```

## ? 注意事项

1. **数据类型**: 确保发送的JSON数据类型正确
2. **字符串引号**: 所有字符串值必须用双引号包围
3. **数组格式**: alerts字段必须是字符串数组
4. **设备ID**: 设备ID必须唯一且符合命名规范
5. **时间戳**: 系统会自动添加时间戳，无需手动提供

## ? 故障排除

### MQTT连接问题
- 检查网络连接
- 验证用户名密码
- 确认broker地址和端口

### JSON格式错误
系统具有自动JSON修复功能，但建议发送标准格式：
```json
// ? 错误格式
{"chargingStatus": charging, "alerts": [low battery]}

// ? 正确格式  
{"chargingStatus": "charging", "alerts": ["low battery"]}
```

### 查看服务日志
通过MQTT服务API获取详细日志：
```bash
GET /api/mqtt-service
```

## ? 支持

如有问题，请联系开发团队或查看项目文档。

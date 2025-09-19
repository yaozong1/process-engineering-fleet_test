# MQTT数据格式快速参考

## 🎯 主题格式
```
fleet/{设备ID}/{消息类型}
```

## 📋 电池数据 (battery)

### 最简格式
```json
{
  "soc": 75
}
```

### 完整格式
```json
{
  "soc": 75,
  "voltage": 12.5,
  "temperature": 22,
  "health": 88,
  "cycleCount": 250,
  "estimatedRangeKm": 280,
  "chargingStatus": "idle",
  "alerts": ["Low battery warning"]
}
```

## ⚡ 充电状态值
- `"idle"` - 空闲
- `"charging"` - 充电中  
- `"discharging"` - 放电中
- `"fully_charged"` - 充满电
- `"error"` - 错误状态

## 🚨 常见错误

❌ **错误格式:**
```json
{
  "chargingStatus": charging,
  "alerts": [low battery]
}
```

✅ **正确格式:**
```json
{
  "chargingStatus": "charging", 
  "alerts": ["low battery"]
}
```

## 🔧 测试命令

### 发送基本数据
```bash
node examples/mqtt-data-examples.js
```

### 检查设备列表
```bash
curl http://localhost:3000/api/telemetry?list=1
```

### 检查设备数据
```bash
curl http://localhost:3000/api/telemetry?device=PE-001&limit=1
```
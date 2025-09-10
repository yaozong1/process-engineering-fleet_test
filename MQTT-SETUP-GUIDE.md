# 🔗 MQTT集成配置指南 - Process Engineering Fleet Manager

## 📋 概述

本指南将帮助您将硬件设备通过MQTT协议连接到Fleet Manager系统，实现：
- 📍 实时GPS位置数据传输
- 🔋 电池状态监控和探测
- 📊 车辆状态和传感器数据同步
- 🔄 双向通信（监控和控制）

## 🎯 支持的MQTT Broker

### 1. 阿里云IoT平台（推荐生产环境）
- ✅ 企业级可靠性
- ✅ 设备管理和认证
- ✅ 数据存储和分析
- ✅ 规则引擎

### 2. 本地Mosquitto（开发测试）
- ✅ 快速部署
- ✅ 本地控制
- ✅ 免费开源
- ⚠️ 需要自行维护

### 3. AWS IoT Core / Azure IoT Hub
- ✅ 云端集成
- ✅ 全球部署
- ⚠️ 需要适配配置

## 🚀 快速开始

### 步骤1：环境配置

```bash
# 复制环境变量配置
cp .env.example .env.local

# 编辑配置文件
nano .env.local
```

```env
# 阿里云IoT配置
NEXT_PUBLIC_MQTT_HOST=your-instance.mqtt.iothub.aliyuncs.com
NEXT_PUBLIC_MQTT_PORT=443
NEXT_PUBLIC_MQTT_USERNAME=your-device-name&your-product-key
NEXT_PUBLIC_MQTT_PASSWORD=your-device-secret
NEXT_PUBLIC_MQTT_PROTOCOL=wss

# 或者本地Mosquitto配置
# NEXT_PUBLIC_MQTT_HOST=localhost
# NEXT_PUBLIC_MQTT_PORT=8083
# NEXT_PUBLIC_MQTT_PROTOCOL=ws
```

### 步骤2：启动应用

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev
```

### 步骤3：测试MQTT连接

访问GPS追踪页面，查看MQTT连接状态：
- 🟢 Connected - MQTT正常连接
- 🟡 Connecting - 正在连接中
- 🔴 Disconnected - 连接失败

## 📡 数据格式规范

### GPS数据格式
```json
{
  "vehicleId": "PE-001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "altitude": 10.5,
  "speed": 45.2,
  "heading": 180.5,
  "accuracy": 5.0,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Topic**: `fleet/vehicle/{vehicleId}/gps`

### 电池数据格式
```json
{
  "vehicleId": "PE-001",
  "level": 78,
  "voltage": 12.6,
  "current": -5.2,
  "temperature": 32,
  "health": 95,
  "cycleCount": 1247,
  "chargingStatus": "discharging",
  "estimatedRange": 156,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Topic**: `fleet/vehicle/{vehicleId}/battery`

### 车辆状态格式
```json
{
  "vehicleId": "PE-001",
  "status": "active",
  "speed": 45.2,
  "odometer": 125678.9,
  "fuelLevel": 75.5,
  "engineStatus": "on",
  "lastUpdate": "2024-01-15T10:30:00.000Z",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Topic**: `fleet/vehicle/{vehicleId}/status`

### 传感器数据格式
```json
{
  "vehicleId": "PE-001",
  "sensors": {
    "temperature": 25.6,
    "humidity": 45.2,
    "pressure": 1013.25,
    "vibration": 0.15,
    "fuel": 75.5
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Topic**: `fleet/vehicle/{vehicleId}/sensors`

## 🏗️ 阿里云IoT平台配置

### 1. 创建产品
1. 登录阿里云IoT控制台
2. 创建产品 -> 选择"设备接入"
3. 产品名称：`ProcessEngineeringFleet`
4. 数据格式：`JSON`
5. 认证方式：`设备密钥`

### 2. 添加设备
```bash
# 设备名称规范
PE-001, PE-002, PE-003...

# 设备密钥
自动生成或自定义
```

### 3. 获取连接信息
```bash
# 连接域名
${YourProductKey}.iot-as-mqtt.${YourRegionId}.aliyuncs.com

# 端口
443 (wss), 1883 (tcp)

# 客户端ID格式
${clientId}|securemode=2,signmethod=hmacsha1|

# 用户名格式
${deviceName}&${productKey}

# 密码
使用设备密钥计算HMAC-SHA1
```

### 4. Topic权限配置
```bash
# 发布权限
fleet/vehicle/+/gps
fleet/vehicle/+/battery
fleet/vehicle/+/status
fleet/vehicle/+/sensors

# 订阅权限
fleet/vehicle/+/command
```

## 🖥️ 本地Mosquitto部署

### 安装Mosquitto
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mosquitto mosquitto-clients

# CentOS/RHEL
sudo yum install mosquitto mosquitto-clients

# Docker方式
docker run -it -p 1883:1883 -p 8083:8083 eclipse-mosquitto
```

### 配置WebSocket支持
```bash
# 编辑配置文件
sudo nano /etc/mosquitto/mosquitto.conf
```

```conf
# MQTT over TCP
listener 1883
protocol mqtt

# MQTT over WebSocket
listener 8083
protocol websockets

# 允许匿名连接（仅测试用）
allow_anonymous true

# 日志配置
log_dest stdout
log_type all
```

### 启动服务
```bash
# 启动Mosquitto
sudo systemctl start mosquitto
sudo systemctl enable mosquitto

# 测试连接
mosquitto_pub -h localhost -t test/topic -m "Hello MQTT"
mosquitto_sub -h localhost -t test/topic
```

## 💻 硬件设备代码示例

### Arduino/ESP32示例
```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi和MQTT配置
const char* ssid = "Your_WiFi_SSID";
const char* password = "Your_WiFi_Password";
const char* mqtt_server = "your-mqtt-broker.com";
const int mqtt_port = 1883;
const char* vehicle_id = "PE-001";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // 每30秒发送数据
  static unsigned long lastSend = 0;
  if (millis() - lastSend > 30000) {
    sendGPSData();
    sendBatteryData();
    sendStatusData();
    lastSend = millis();
  }
}

void sendGPSData() {
  DynamicJsonDocument doc(1024);
  doc["vehicleId"] = vehicle_id;
  doc["latitude"] = getGPSLatitude();
  doc["longitude"] = getGPSLongitude();
  doc["speed"] = getSpeed();
  doc["timestamp"] = getTimestamp();

  String payload;
  serializeJson(doc, payload);

  String topic = "fleet/vehicle/" + String(vehicle_id) + "/gps";
  client.publish(topic.c_str(), payload.c_str());
}

void sendBatteryData() {
  DynamicJsonDocument doc(1024);
  doc["vehicleId"] = vehicle_id;
  doc["level"] = getBatteryLevel();
  doc["voltage"] = getBatteryVoltage();
  doc["temperature"] = getBatteryTemperature();
  doc["chargingStatus"] = getChargingStatus();
  doc["timestamp"] = getTimestamp();

  String payload;
  serializeJson(doc, payload);

  String topic = "fleet/vehicle/" + String(vehicle_id) + "/battery";
  client.publish(topic.c_str(), payload.c_str());
}

// 实现其他函数...
```

### Python示例
```python
import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime

# MQTT配置
MQTT_BROKER = "your-mqtt-broker.com"
MQTT_PORT = 1883
VEHICLE_ID = "PE-001"

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    # 订阅控制命令
    client.subscribe(f"fleet/vehicle/{VEHICLE_ID}/command")

def on_message(client, userdata, msg):
    print(f"Received: {msg.topic} {msg.payload.decode()}")
    # 处理控制命令

def send_gps_data(client):
    data = {
        "vehicleId": VEHICLE_ID,
        "latitude": 40.7128 + random.uniform(-0.01, 0.01),
        "longitude": -74.0060 + random.uniform(-0.01, 0.01),
        "speed": random.uniform(0, 80),
        "heading": random.uniform(0, 360),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

    topic = f"fleet/vehicle/{VEHICLE_ID}/gps"
    client.publish(topic, json.dumps(data))
    print(f"GPS data sent: {data}")

def send_battery_data(client):
    data = {
        "vehicleId": VEHICLE_ID,
        "level": random.randint(20, 100),
        "voltage": round(random.uniform(11.5, 13.5), 1),
        "temperature": random.randint(25, 45),
        "health": random.randint(80, 100),
        "chargingStatus": random.choice(["charging", "discharging", "idle"]),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

    topic = f"fleet/vehicle/{VEHICLE_ID}/battery"
    client.publish(topic, json.dumps(data))
    print(f"Battery data sent: {data}")

def main():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()

    try:
        while True:
            send_gps_data(client)
            send_battery_data(client)
            time.sleep(30)  # 每30秒发送一次
    except KeyboardInterrupt:
        print("Stopping...")
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
```

## 🧪 测试和调试

### 内置模拟器
```bash
# 启动内置设备模拟器
curl "http://localhost:3000/api/mqtt-test?action=start"

# 查看模拟器状态
curl "http://localhost:3000/api/mqtt-test?action=status"

# 立即发送测试数据
curl "http://localhost:3000/api/mqtt-test?action=publish-now"

# 停止模拟器
curl "http://localhost:3000/api/mqtt-test?action=stop"
```

### MQTT客户端工具
```bash
# 命令行测试
mosquitto_pub -h your-broker.com -t "fleet/vehicle/PE-001/gps" -m '{"vehicleId":"PE-001","latitude":40.7128,"longitude":-74.0060,"speed":45,"timestamp":"2024-01-15T10:30:00.000Z"}'

# 订阅所有车辆数据
mosquitto_sub -h your-broker.com -t "fleet/vehicle/+/+"
```

### GUI工具
- **MQTT Explorer** - 图形界面MQTT客户端
- **MQTTX** - 跨平台MQTT客户端
- **Postman** - 支持MQTT测试

## 🔧 故障排除

### 常见问题

1. **连接失败**
   ```bash
   # 检查防火墙
   sudo ufw allow 1883
   sudo ufw allow 8083

   # 检查服务状态
   sudo systemctl status mosquitto
   ```

2. **认证错误**
   - 检查用户名密码格式
   - 验证设备密钥计算
   - 确认Topic权限

3. **数据格式错误**
   - 验证JSON格式
   - 检查必需字段
   - 确认时间戳格式

### 调试命令
```bash
# 查看MQTT日志
sudo journalctl -u mosquitto -f

# 测试连接
telnet your-broker.com 1883

# 检查端口
netstat -tlnp | grep :1883
```

## 📊 监控和维护

### 性能指标
- 连接数量
- 消息吞吐量
- 延迟时间
- 错误率

### 告警配置
- 设备离线告警
- 电池低电量告警
- 异常位置告警
- 通信中断告警

## 🔐 安全最佳实践

1. **启用TLS加密**
2. **使用强密码和证书**
3. **限制Topic权限**
4. **定期更新设备密钥**
5. **监控异常行为**

## 📞 技术支持

如果遇到问题：
1. 查看项目[GitHub Issues](https://github.com/yaozong1/process-engineering-fleet/issues)
2. 参考[阿里云IoT文档](https://help.aliyun.com/product/30520.html)
3. 联系技术支持团队

---

**🎉 配置完成后，您的硬件设备就可以与Fleet Manager实时通信了！**

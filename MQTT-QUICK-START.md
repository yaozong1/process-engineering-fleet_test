# 🚀 MQTT物联网集成 - 快速上手指南

## 🎯 您的Fleet Manager现在支持MQTT物联网设备！

您可以通过MQTT协议将硬件设备（如GPS模块、电池监控器）连接到系统，实现：
- 📍 **实时GPS追踪** - 设备位置数据实时更新到地图
- 🔋 **电池状态监控** - 电压、温度、健康状态实时探测
- 📊 **传感器数据** - 温度、湿度、振动等传感器数据
- 🔄 **双向通信** - 向设备发送控制命令

## ⚡ 3分钟快速体验

### 1. 启动应用
```bash
# 进入项目目录
cd process-engineering-fleet

# 启动开发服务器
bun run dev
# 或 npm run dev
```

### 2. 查看MQTT功能
1. 访问 http://localhost:3000
2. 登录系统（admin@processengineering.com / admin123）
3. 点击 **"GPS Tracking"** 或 **"Battery Monitor"** 标签
4. 查看页面顶部的MQTT状态指示器

### 3. 测试MQTT连接
在新的浏览器标签页中访问：
```
http://localhost:3000/api/mqtt-test?action=start
```

这将启动内置的车辆数据模拟器，模拟5辆车的GPS和电池数据。

## 🔧 配置真实的MQTT Broker

### 选项1：阿里云IoT平台（推荐生产环境）

1. **创建环境配置文件**
```bash
cp .env.example .env.local
```

2. **编辑配置**
```env
# .env.local
NEXT_PUBLIC_MQTT_HOST=your-instance.mqtt.iothub.aliyuncs.com
NEXT_PUBLIC_MQTT_PORT=443
NEXT_PUBLIC_MQTT_USERNAME=your-device-name&your-product-key
NEXT_PUBLIC_MQTT_PASSWORD=your-device-secret
NEXT_PUBLIC_MQTT_PROTOCOL=wss
```

3. **在阿里云IoT控制台配置**
   - 创建产品："ProcessEngineeringFleet"
   - 添加设备：PE-001, PE-002, PE-003...
   - 获取连接信息填入上述配置

### 选项2：本地Mosquitto（开发测试）

1. **安装Mosquitto**
```bash
# Ubuntu/Debian
sudo apt install mosquitto mosquitto-clients

# 或使用Docker
docker run -p 1883:1883 -p 8083:8083 eclipse-mosquitto
```

2. **配置环境变量**
```env
# .env.local
NEXT_PUBLIC_MQTT_HOST=localhost
NEXT_PUBLIC_MQTT_PORT=8083
NEXT_PUBLIC_MQTT_PROTOCOL=ws
```

## 📡 连接您的硬件设备

### 数据格式示例

您的硬件设备需要发送JSON格式的数据到指定Topic：

**GPS数据** → Topic: `fleet/vehicle/PE-001/gps`
```json
{
  "vehicleId": "PE-001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "speed": 45.2,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**电池数据** → Topic: `fleet/vehicle/PE-001/battery`
```json
{
  "vehicleId": "PE-001",
  "level": 78,
  "voltage": 12.6,
  "temperature": 32,
  "chargingStatus": "discharging",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Arduino/ESP32代码示例
```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* mqtt_server = "your-mqtt-broker.com";
const char* vehicle_id = "PE-001";

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
```

### Python代码示例
```python
import paho.mqtt.client as mqtt
import json
from datetime import datetime

def send_gps_data():
    data = {
        "vehicleId": "PE-001",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "speed": 45.2,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

    client.publish("fleet/vehicle/PE-001/gps", json.dumps(data))

client = mqtt.Client()
client.connect("your-mqtt-broker.com", 1883, 60)
```

## 🧪 测试工具

### 内置模拟器控制
```bash
# 启动模拟器（模拟5辆车的数据）
curl "http://localhost:3000/api/mqtt-test?action=start"

# 查看状态
curl "http://localhost:3000/api/mqtt-test?action=status"

# 立即发送数据
curl "http://localhost:3000/api/mqtt-test?action=publish-now"

# 停止模拟器
curl "http://localhost:3000/api/mqtt-test?action=stop"
```

### 命令行测试
```bash
# 发送GPS测试数据
mosquitto_pub -h localhost -t "fleet/vehicle/PE-001/gps" \
  -m '{"vehicleId":"PE-001","latitude":40.7128,"longitude":-74.0060,"speed":45,"timestamp":"2024-01-15T10:30:00.000Z"}'

# 监听所有车辆数据
mosquitto_sub -h localhost -t "fleet/vehicle/+/+"
```

## 🎯 查看实时效果

1. **GPS追踪页面**
   - 实时地图更新
   - 车辆位置标记
   - 速度和状态显示
   - MQTT连接状态指示器

2. **电池监控页面**
   - 实时电池电量
   - 电压和温度监控
   - 充电状态显示
   - 健康度分析

3. **数据切换**
   - MQTT连接时显示实时数据
   - MQTT断开时自动切换到模拟数据
   - 连接状态实时提示

## 🔧 故障排除

### 常见问题

1. **MQTT连接失败**
   - 检查网络连接
   - 验证Broker地址和端口
   - 确认认证信息正确

2. **数据不更新**
   - 检查Topic格式是否正确
   - 验证JSON数据格式
   - 确认vehicleId匹配

3. **设备认证错误**
   - 检查用户名密码格式
   - 验证设备密钥计算（阿里云IoT）
   - 确认设备权限配置

### 调试命令
```bash
# 检查MQTT服务状态
sudo systemctl status mosquitto

# 查看连接日志
sudo journalctl -u mosquitto -f

# 测试网络连接
telnet your-broker.com 1883
```

## 📚 更多资源

- 📖 **详细配置指南**: [MQTT-SETUP-GUIDE.md](./MQTT-SETUP-GUIDE.md)
- 🏗️ **阿里云部署**: [README-DEPLOY-CN.md](./README-DEPLOY-CN.md)
- 🐳 **Docker部署**: [docker-compose.yml](./docker-compose.yml)
- 🧪 **测试工具**: http://localhost:3000/api/mqtt-test

## 🎉 开始您的物联网之旅！

现在您的Fleet Manager已经具备完整的MQTT物联网功能，可以：
- ✅ 连接真实的GPS设备
- ✅ 监控车辆电池状态
- ✅ 收集传感器数据
- ✅ 实现双向设备控制
- ✅ 支持多种MQTT Broker

**祝您使用愉快！** 🚀

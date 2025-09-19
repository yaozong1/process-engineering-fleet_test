# Process Engineering Fleet Management System

һ������Next.js�Ĺ��̳��ӹ���ϵͳ���ṩʵʱ��ؼ�ء�GPS���ٺ�MQTT�����ռ����ܡ�

## ? ���ٿ�ʼ

### ��װ����
```bash
npm install
```

### ���û�������
���� `.env.local` �ļ���
```bash
# MQTT����
NEXT_PUBLIC_MQTT_URL=wss://your-mqtt-broker.com:8884/mqtt
NEXT_PUBLIC_MQTT_USERNAME=your_username
NEXT_PUBLIC_MQTT_PASSWORD=your_password

# Redis����
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# JWT��֤
JWT_SECRET=your-jwt-secret-key
NEXTAUTH_SECRET=your-nextauth-secret

# �豸����
NEXT_PUBLIC_PRODUCT_KEY=your_product_key
NEXT_PUBLIC_DEVICE_NAME=PE-001
```

### ��������������
```bash
npm run dev
```

���� [http://localhost:3000](http://localhost:3000) �鿴Ӧ�á�

## ? MQTT���ݸ�ʽ�淶

### ����ṹ
ϵͳʹ������MQTT����ṹ��
```
fleet/{�豸ID}/{��Ϣ����}
```

**ʾ����**
- `fleet/PE-001/battery` - PE-001�豸�ĵ������
- `fleet/PE-002/status` - PE-002�豸��״̬��Ϣ

### ������ݸ�ʽ (battery)

**���⣺** `fleet/{�豸ID}/battery`

**JSON��ʽ��**
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

**�ֶ�˵����**
| �ֶ� | ���� | ���� | ˵�� | ��λ | ��Χ |
|------|------|------|------|------|------|
| `soc` | number | ? | ��ص����ٷֱ� | % | 0-100 |
| `voltage` | number | ? | ��ص�ѹ | V | 0-15 |
| `temperature` | number | ? | ����¶� | ��C | -40~85 |
| `health` | number | ? | ��ؽ����� | % | 0-100 |
| `cycleCount` | number | ? | ���ѭ������ | �� | ��0 |
| `estimatedRangeKm` | number | ? | Ԥ��������� | km | ��0 |
| `chargingStatus` | string | ? | ���״̬ | - | ���±� |
| `alerts` | string[] | ? | ������Ϣ���� | - | - |

**���״ֵ̬��**
- `"idle"` - ����
- `"charging"` - �����
- `"discharging"` - �ŵ���
- `"fully_charged"` - ������
- `"error"` - ����״̬

### ״̬���ݸ�ʽ (status)

**���⣺** `fleet/{�豸ID}/status`

**JSON��ʽ��**
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

## ? MQTT����ʾ��

### Node.jsʾ��
```javascript
const mqtt = require('mqtt');

const client = mqtt.connect('wss://your-broker.com:8884/mqtt', {
  username: 'your_username',
  password: 'your_password'
});

client.on('connect', () => {
  // ���͵������
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

### Pythonʾ��
```python
import paho.mqtt.client as mqtt
import json

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    
    # ���͵������
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

## ?? ���MQTT����

ϵͳ���������ĺ��MQTT���񣬿�24/7�������պʹ洢���ݣ�

### �������API

**��ȡ����״̬��**
```bash
GET /api/mqtt-service
```

**��������**
```bash
POST /api/mqtt-service
Content-Type: application/json

{"action": "start"}
```

**ֹͣ����**
```bash
POST /api/mqtt-service
Content-Type: application/json

{"action": "stop"}
```

**��������**
```bash
POST /api/mqtt-service
Content-Type: application/json

{"action": "restart"}
```

### ����
- ? 7x24Сʱ��������
- ? �Զ���������
- ? JSON��ʽ�Զ��޸�
- ? �������Ի���
- ? ��ϸ��־��¼

## ? ����API

### ��ȡ�豸�б�
```bash
GET /api/telemetry?list=1
```

### ��ȡ�豸����
```bash
GET /api/telemetry?device=PE-001&limit=100
```

### ��������
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

## ?? ��Ŀ�ṹ

```
src/
������ app/                    # Next.js App Router
��   ������ api/               # API·��
��   ��   ������ telemetry/     # ң������API
��   ��   ������ mqtt-service/  # MQTT�������API
��   ������ pages/             # ҳ�����
������ components/            # React���
��   ������ battery-monitor-dashboard.tsx
��   ������ gps-tracking-dashboard.tsx
��   ������ ui/               # UI�����
������ services/             # ��˷���
��   ������ mqtt-service.ts   # MQTT��˷���
��   ������ server-init.ts    # ��������ʼ��
������ lib/                  # ���߿�
��   ������ redis.ts         # Redis�ͻ���
��   ������ utils.ts         # ͨ�ù���
������ hooks/               # React Hooks
    ������ useMQTT.ts       # MQTT�ͻ���Hook
    ������ useAutoLogout.ts # �Զ��ǳ�Hook
```

## ? �豸�����淶

�豸ID��ʽ��`PE-XXX`
- `PE` - Process Engineering ��д
- `XXX` - ��λ���ֱ�ţ�001-999��

**ʾ����**
- `PE-001` - 1�Ź��̳�
- `PE-002` - 2�Ź��̳�
- `PE-100` - 100�Ź��̳�

## ? ��������

### ������Ŀ
```bash
npm run build
```

### ���ͼ��
```bash
npm run type-check
```

### �����ʽ��
```bash
npm run format
```

## ? ע������

1. **��������**: ȷ�����͵�JSON����������ȷ
2. **�ַ�������**: �����ַ���ֵ������˫���Ű�Χ
3. **�����ʽ**: alerts�ֶα������ַ�������
4. **�豸ID**: �豸ID����Ψһ�ҷ��������淶
5. **ʱ���**: ϵͳ���Զ����ʱ����������ֶ��ṩ

## ? �����ų�

### MQTT��������
- �����������
- ��֤�û�������
- ȷ��broker��ַ�Ͷ˿�

### JSON��ʽ����
ϵͳ�����Զ�JSON�޸����ܣ������鷢�ͱ�׼��ʽ��
```json
// ? �����ʽ
{"chargingStatus": charging, "alerts": [low battery]}

// ? ��ȷ��ʽ  
{"chargingStatus": "charging", "alerts": ["low battery"]}
```

### �鿴������־
ͨ��MQTT����API��ȡ��ϸ��־��
```bash
GET /api/mqtt-service
```

## ? ֧��

�������⣬����ϵ�����Ŷӻ�鿴��Ŀ�ĵ���

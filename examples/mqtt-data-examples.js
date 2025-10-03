/**
 * MQTT数据发送示例脚本
 * 演示正确的电池数据格式
 */

const mqtt = require('mqtt');

// MQTT连接配置（优先环境变量，默认使用 ws://:8083）
const MQTT_CONFIG = {
  url: process.env.MY_PUBLIC_MQTT_URL || process.env.NEXT_PUBLIC_MQTT_URL || 'ws://processengineeringsz.com:8083/mqtt',
  username: process.env.MY_PUBLIC_MQTT_USERNAME || process.env.NEXT_PUBLIC_MQTT_USERNAME || 'testuser',
  password: process.env.MY_PUBLIC_MQTT_PASSWORD || process.env.NEXT_PUBLIC_MQTT_PASSWORD || 'Hh3341136'
};

console.log('🚀 MQTT数据格式示例');
console.log('=====================================');

const client = mqtt.connect(MQTT_CONFIG.url, {
  username: MQTT_CONFIG.username,
  password: MQTT_CONFIG.password
});

client.on('connect', () => {
  console.log('✅ 已连接到MQTT broker');
  
  // 示例1: 完整的电池数据
  const fullBatteryData = {
    soc: 85,                           // 电池电量 0-100%
    voltage: 12.8,                     // 电池电压 V
    temperature: 25,                   // 电池温度 °C
    health: 92,                        // 电池健康度 0-100%
    cycleCount: 150,                   // 充电循环次数
    estimatedRangeKm: 320,            // 预估续航里程 km
    chargingStatus: "charging",        // 充电状态
    alerts: ["Normal operation"]       // 警告信息数组
  };
  
  console.log('\n📋 示例1: 完整电池数据');
  console.log('主题:', 'fleet/PE-001/battery');
  console.log('数据:', JSON.stringify(fullBatteryData, null, 2));
  
  client.publish('fleet/PE-001/battery', JSON.stringify(fullBatteryData));
  
  // 等待1秒后发送下一个示例
  setTimeout(() => {
    // 示例2: 最小必需数据（只有SOC）
    const minimalBatteryData = {
      soc: 45
    };
    
    console.log('\n📋 示例2: 最小电池数据');
    console.log('主题:', 'fleet/PE-002/battery');
    console.log('数据:', JSON.stringify(minimalBatteryData, null, 2));
    
    client.publish('fleet/PE-002/battery', JSON.stringify(minimalBatteryData));
    
    setTimeout(() => {
      // 示例3: 带警告的电池数据
      const alertBatteryData = {
        soc: 15,
        voltage: 11.8,
        temperature: 45,
        health: 78,
        cycleCount: 890,
        estimatedRangeKm: 50,
        chargingStatus: "idle",
        alerts: ["Low battery warning", "High temperature", "Battery degradation"]
      };
      
      console.log('\n📋 示例3: 带警告的电池数据');
      console.log('主题:', 'fleet/PE-003/battery');
      console.log('数据:', JSON.stringify(alertBatteryData, null, 2));
      
      client.publish('fleet/PE-003/battery', JSON.stringify(alertBatteryData));
      
      setTimeout(() => {
        // 示例4: 不同充电状态
        const chargingStates = [
          { deviceId: 'PE-004', status: 'charging', soc: 60 },
          { deviceId: 'PE-005', status: 'fully_charged', soc: 100 },
          { deviceId: 'PE-006', status: 'discharging', soc: 75 },
          { deviceId: 'PE-007', status: 'error', soc: 0 }
        ];
        
        console.log('\n📋 示例4: 不同充电状态');
        
        chargingStates.forEach((state, index) => {
          setTimeout(() => {
            const data = {
              soc: state.soc,
              chargingStatus: state.status
            };
            
            console.log(`主题: fleet/${state.deviceId}/battery`);
            console.log(`数据: ${JSON.stringify(data)}`);
            
            client.publish(`fleet/${state.deviceId}/battery`, JSON.stringify(data));
          }, index * 500);
        });
        
        // 5秒后关闭连接
        setTimeout(() => {
          console.log('\n✅ 所有示例数据发送完成');
          console.log('📊 请查看系统Dashboard验证数据接收');
          client.end();
        }, 3000);
        
      }, 1000);
    }, 1000);
  }, 1000);
});

client.on('error', (error) => {
  console.error('❌ MQTT连接错误:', error);
});

client.on('close', () => {
  console.log('🔌 MQTT连接已关闭');
});
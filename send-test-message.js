const mqtt = require('mqtt');

const client = mqtt.connect('wss://ff1164418ad24eb180ad099aec7bc5bc.s1.eu.hivemq.cloud:8884/mqtt', {
  username: 'yaozong',
  password: 'Hh3341136',
  clean: true,
  connectTimeout: 4000,
  clientId: 'test_client_' + Math.random().toString(16).substr(2, 8)
});

client.on('connect', () => {
  console.log('Connected to HiveMQ');
  
  const now = Date.now();
  const message = {
    stationId: 'PN-003',
    timestamp: now,
    voltage: 49.5,
    current: 15.0,
    temperature: 28.0,
    chargingStatus: 'CHARGING',
    powerOutput: 742.5,
    connectorStatus: 'CONNECTED',
    sessionDuration: 2700
  };
  
  const topic = 'fleet/chargenode/PN-003';
  
  client.publish(topic, JSON.stringify(message), (err) => {
    if (err) {
      console.error('发送失败:', err);
    } else {
      console.log('✅ 测试消息已发送到:', topic);
      console.log('📦 消息内容:', message);
      console.log('⏰ 发送时间:', new Date().toLocaleString());
    }
    client.end();
  });
});

client.on('error', (err) => {
  console.error('MQTT连接错误:', err);
});
#!/usr/bin/env node

// 测试时间戳自动更新功能

const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883', {
  username: 'admin',
  password: 'public'
});

client.on('connect', function () {
  console.log('🔗 连接本地MQTT成功');
  
  // 发送一个带有旧时间戳的消息（10分钟前）
  const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10分钟前
  
  const message = {
    stationId: "PN-003",
    ts: oldTimestamp, // 使用旧时间戳
    status: "charging",
    voltage: 400.5,
    current: 125.3,
    power: 51.2,
    energy: 15.7,
    remainingTime: 45,
    temperature: 50.2,
    connectorType: "Type2",
    maxPower: 60,
    location: "Slot A01"
  };

  const topic = `fleet/chargenode/${message.stationId}`;
  
  console.log('📤 发送带有旧时间戳的消息:', topic);
  console.log('⏰ 旧时间戳:', oldTimestamp, '(', new Date(oldTimestamp).toLocaleString(), ')');
  console.log('🕐 当前时间:', Date.now(), '(', new Date().toLocaleString(), ')');
  console.log('⏱️ 时间差:', Math.floor((Date.now() - oldTimestamp) / 1000), '秒');
  console.log('📋 消息:', JSON.stringify(message, null, 2));
  
  client.publish(topic, JSON.stringify(message), function(err) {
    if (err) {
      console.error('❌ 发送失败:', err);
    } else {
      console.log('✅ 消息发送成功!');
      console.log('💡 后台应该自动将时间戳更新为当前时间');
    }
    client.end();
  });
});

client.on('error', function (err) {
  console.error('❌ MQTT连接错误:', err);
});
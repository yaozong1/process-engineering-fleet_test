#!/usr/bin/env node

// 发送充电桩MQTT消息到云端 - 使用当前时间戳

const mqtt = require('mqtt');

const client = mqtt.connect('wss://ff1164418ad24eb180ad099aec7bc5bc.s1.eu.hivemq.cloud:8884/mqtt', {
  username: 'yaozong',
  password: 'Hh3341136'
});

client.on('connect', function () {
  console.log('🔗 云端MQTT连接成功');
  
  // 要发送的充电桩数据 - 使用当前时间戳
  const message = {
    stationId: "PN-003",
    ts: Date.now(), // 使用当前时间戳
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
  
  console.log('📤 发送消息到云端MQTT:', topic);
  console.log('📋 消息内容:', JSON.stringify(message, null, 2));
  console.log('⏰ 当前时间戳:', message.ts, '对应时间:', new Date(message.ts).toLocaleString('zh-CN'));
  
  client.publish(topic, JSON.stringify(message), function(err) {
    if (err) {
      console.error('❌ 发送失败:', err);
    } else {
      console.log('✅ 消息发送成功!');
      console.log('💡 现在PN-003应该显示为charging状态，不再offline');
    }
    client.end();
  });
});

client.on('error', function (err) {
  console.error('❌ 云端MQTT连接错误:', err);
});
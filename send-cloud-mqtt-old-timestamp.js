#!/usr/bin/env node

// 发送充电桩MQTT消息到云端 - 测试时间戳自动更新

const mqtt = require('mqtt');

const client = mqtt.connect('wss://ff1164418ad24eb180ad099aec7bc5bc.s1.eu.hivemq.cloud:8884/mqtt', {
  username: 'yaozong',
  password: 'Hh3341136'
});

client.on('connect', function () {
  console.log('🔗 云端MQTT连接成功');
  
  // 要发送的充电桩数据 - 使用10分钟前的旧时间戳来测试自动更新
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
  
  console.log('📤 发送消息到云端MQTT:', topic);
  console.log('📋 消息内容:', JSON.stringify(message, null, 2));
  console.log('⏰ 旧时间戳:', message.ts, '对应时间:', new Date(message.ts).toLocaleString('zh-CN'));
  console.log('🕐 当前时间:', Date.now(), '对应时间:', new Date().toLocaleString('zh-CN'));
  console.log('⏱️ 时间差:', Math.floor((Date.now() - message.ts) / 1000), '秒 (应该自动更新)');
  
  client.publish(topic, JSON.stringify(message), function(err) {
    if (err) {
      console.error('❌ 发送失败:', err);
    } else {
      console.log('✅ 消息发送成功!');
      console.log('💡 后台MQTT服务应该自动将时间戳更新为当前时间，避免显示offline');
    }
    client.end();
  });
});

client.on('error', function (err) {
  console.error('❌ 云端MQTT连接错误:', err);
});
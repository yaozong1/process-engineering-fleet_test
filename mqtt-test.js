// 简化的MQTT测试，直接在浏览器中运行
console.log(`
=== MQTT 测试指南 ===

1. 访问 http://localhost:3001
2. 打开浏览器开发者工具 (F12)
3. 查看Console标签页的日志
4. 在MQTT.fx中发送消息到: fleet/PE-001/battery

期望的消息格式:
{
  "soc": 85,
  "voltage": 12.6,
  "temperature": 25,
  "health": 85,
  "cycleCount": 234,
  "estimatedRangeKm": 245,
  "chargingStatus": "idle",
  "alerts": []
}

如果MQTT连接正常，你应该在Console中看到:
- [BatteryDashboard] 收到MQTT消息: {topic: "fleet/PE-001/battery", deviceId: "PE-001", messageType: "battery"}
- [BatteryDashboard] 转发到Redis成功 (或失败信息)

=== 检查清单 ===
□ 服务器运行在 http://localhost:3001
□ Battery Monitor页面能正常加载
□ Console显示 "MQTT: connected"
□ Console显示 "订阅成功!"
□ 发送MQTT消息后Console有响应
`);
#!/usr/bin/env node

// 测试修复充电桩数据轮询的脚本

console.log('🧪 测试设备列表API...');

async function testDeviceList() {
  try {
    const response = await fetch('http://localhost:3016/api/telemetry?list=1');
    const data = await response.json();
    
    console.log('📋 设备列表API响应:');
    console.log('  设备数量:', data.count);
    console.log('  设备列表:', data.devices);
    
    // 检查是否包含充电桩设备
    const hasChargenode = data.devices.some(device => device.includes('chargenode') || device.startsWith('PN-'));
    
    if (hasChargenode) {
      console.log('❌ 错误: 设备列表仍包含充电桩设备');
    } else {
      console.log('✅ 正确: 设备列表已排除充电桩设备');
    }
    
    console.log('\n🎯 预期结果: 当您切换到 battery 或 GPS 页面时，应该不再出现充电桩API调用');
    console.log('   例如: GET /api/telemetry?device=chargenode:PN-001&latest=1');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testDeviceList();
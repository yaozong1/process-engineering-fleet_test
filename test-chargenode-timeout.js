/**
 * 测试充电桩超时离线检测机制
 */

async function testChargeNodeTimeoutDetection() {
  console.log('🕐 测试充电桩超时离线检测机制...\n');
  
  try {
    // 1. 发送一条正常的充电桩数据
    const normalData = {
      stationId: "PN-TIMEOUT-TEST",
      ts: Date.now(),
      status: "charging",
      voltage: 400.5,
      current: 125.3,
      power: 50.2,
      temperature: 35.2
    };
    
    console.log('📤 发送正常充电桩数据...');
    const storeResponse = await fetch('http://localhost:3016/api/mqtt-service/chargenode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalData)
    });
    
    const storeResult = await storeResponse.json();
    console.log('存储结果:', storeResult.success ? '✅ 成功' : '❌ 失败');
    
    // 2. 立即查询，应该显示正常状态
    console.log('\n📥 立即查询充电桩状态...');
    const immediateResponse = await fetch('http://localhost:3016/api/chargenode?stationId=PN-TIMEOUT-TEST');
    const immediateResult = await immediateResponse.json();
    
    if (immediateResult.success && immediateResult.data.latest) {
      const station = immediateResult.data.latest;
      console.log(`状态: ${station.status} ${station.isTimeout ? '(超时)' : '(正常)'}`);
      console.log(`时间戳: ${station.ts} (${new Date(station.ts).toLocaleString()})`);
    }
    
    // 3. 发送一条旧时间戳的数据（模拟超时）
    const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6分钟前
    const oldData = {
      stationId: "PN-TIMEOUT-TEST",
      ts: oldTimestamp,
      status: "charging",
      voltage: 400.5,
      current: 125.3,
      power: 50.2,
      temperature: 35.2
    };
    
    console.log('\n📤 发送旧时间戳数据（模拟超时）...');
    const oldStoreResponse = await fetch('http://localhost:3016/api/mqtt-service/chargenode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(oldData)
    });
    
    const oldStoreResult = await oldStoreResponse.json();
    console.log('存储结果:', oldStoreResult.success ? '✅ 成功' : '❌ 失败');
    
    // 4. 查询应该显示为离线
    console.log('\n📥 查询超时后的状态...');
    const timeoutResponse = await fetch('http://localhost:3016/api/chargenode?stationId=PN-TIMEOUT-TEST');
    const timeoutResult = await timeoutResponse.json();
    
    if (timeoutResult.success && timeoutResult.data.latest) {
      const station = timeoutResult.data.latest;
      console.log(`状态: ${station.status} ${station.isTimeout ? '(超时)' : '(正常)'}`);
      console.log(`时间戳: ${station.ts} (${new Date(station.ts).toLocaleString()})`);
      console.log(`原始状态: ${oldData.status} -> 检测后状态: ${station.status}`);
      
      if (station.status === 'offline' && station.isTimeout) {
        console.log('\n✅ 超时检测机制工作正常！');
      } else {
        console.log('\n❌ 超时检测机制可能有问题');
      }
    }
    
    // 5. 测试全部充电桩列表的超时检测
    console.log('\n📋 测试全部充电桩列表的超时检测...');
    const allResponse = await fetch('http://localhost:3016/api/chargenode');
    const allResult = await allResponse.json();
    
    if (allResult.success && allResult.data) {
      const timeoutStations = allResult.data.filter(s => s.isTimeout);
      console.log(`找到 ${timeoutStations.length} 个超时充电桩:`);
      timeoutStations.forEach(station => {
        console.log(`  - ${station.stationId}: ${station.status} (${new Date(station.ts).toLocaleString()})`);
      });
    }
    
    console.log('\n🎉 超时检测测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
console.log('🚀 启动充电桩超时检测测试...\n');
testChargeNodeTimeoutDetection().then(() => {
  console.log('\n📋 测试说明:');
  console.log('- 超时阈值: 5分钟 (300秒)');
  console.log('- 检测机制: 基于最后数据时间戳');
  console.log('- 自动处理: 超时设备自动标记为 offline');
  console.log('- 前端提示: isTimeout 字段标记超时状态');
});
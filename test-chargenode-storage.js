/**
 * 测试充电桩存储结构的简化
 * 从复杂的多键存储改为单一telemetry键模式
 */

const { exec } = require('child_process');

// 测试充电桩数据
const testData = {
  stationId: "PN-001",
  ts: Date.now(),
  status: "charging",
  voltage: 400.5,
  current: 125.3,
  power: 50.2,
  energy: 15.7,
  temperature: 35.2,
  remainingTime: 45,
  connectorType: "Type2",
  maxPower: 60,
  location: "停车位A01",
  faultCode: null,
  faultMessage: null
};

async function testChargeNodeStorage() {
  console.log('🧪 测试充电桩存储结构...\n');
  
  try {
    // 1. 存储测试数据
    console.log('📤 发送充电桩数据到API...');
    const storeResponse = await fetch('http://localhost:3016/api/mqtt-service/chargenode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const storeResult = await storeResponse.json();
    console.log('存储结果:', storeResult);
    
    if (!storeResult.success) {
      throw new Error('存储失败: ' + storeResult.error);
    }
    
    // 2. 等待1秒让数据写入
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. 检索数据
    console.log('\n📥 从API检索充电桩数据...');
    const retrieveResponse = await fetch('http://localhost:3016/api/chargenode');
    const retrieveResult = await retrieveResponse.json();
    
    console.log('检索结果:', JSON.stringify(retrieveResult, null, 2));
    
    if (retrieveResult.success && retrieveResult.data) {
      const station = retrieveResult.data.find(s => s.stationId === 'PN-001');
      if (station) {
        console.log('\n✅ 成功找到充电桩 PN-001:');
        console.log(`  状态: ${station.status}`);
        console.log(`  功率: ${station.power}kW`);
        console.log(`  电压: ${station.voltage}V`);
        console.log(`  电流: ${station.current}A`);
        console.log(`  温度: ${station.temperature}°C`);
        console.log(`  位置: ${station.location}`);
      } else {
        console.log('⚠️ 未找到充电桩 PN-001');
      }
    }
    
    // 4. 测试特定充电桩查询
    console.log('\n🔍 测试特定充电桩查询...');
    const specificResponse = await fetch('http://localhost:3016/api/chargenode?stationId=PN-001&limit=10');
    const specificResult = await specificResponse.json();
    
    if (specificResult.success && specificResult.data) {
      console.log('特定充电桩数据:');
      console.log(`  最新数据: ${JSON.stringify(specificResult.data.latest, null, 2)}`);
      console.log(`  历史记录数量: ${specificResult.data.count}`);
    }
    
    console.log('\n🎉 充电桩存储结构测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
console.log('🚀 启动充电桩存储测试...\n');
testChargeNodeStorage().then(() => {
  console.log('\n📋 测试说明:');
  console.log('- 新的存储结构使用 telemetry:chargenode:{stationId} 键');
  console.log('- 数据存储在Redis List中，与battery/GPS数据保持一致');
  console.log('- 简化了从3个Redis键到1个Redis键的复杂度');
  console.log('- 保持了历史数据追踪能力');
});
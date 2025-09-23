/**
 * 实时监控充电桩状态和MQTT消息
 */

async function monitorChargeNodeStatus() {
  console.log('🔍 实时监控充电桩状态...\n');
  
  let previousData = new Map();
  
  const checkStatus = async () => {
    try {
      const response = await fetch('http://localhost:3016/api/chargenode');
      const result = await response.json();
      
      if (result.success && result.data) {
        console.clear();
        console.log('📊 充电桩实时状态监控');
        console.log('=' * 50);
        console.log(`更新时间: ${new Date().toLocaleString()}\n`);
        
        result.data.forEach(station => {
          const previous = previousData.get(station.stationId);
          const statusChanged = previous && previous.status !== station.status;
          const timeChanged = previous && previous.ts !== station.ts;
          
          console.log(`🔌 ${station.stationId}:`);
          console.log(`   状态: ${station.status} ${station.isTimeout ? '(超时)' : '(正常)'} ${statusChanged ? '🔄' : ''}`);
          console.log(`   时间: ${new Date(station.ts).toLocaleString()} ${timeChanged ? '🆕' : ''}`);
          console.log(`   功率: ${station.power || 0}kW`);
          console.log(`   电压: ${station.voltage || 0}V`);
          console.log(`   位置: ${station.location || 'N/A'}`);
          console.log('');
          
          previousData.set(station.stationId, {
            status: station.status,
            ts: station.ts
          });
        });
        
        console.log('🔄 正在监控... (按 Ctrl+C 停止)');
        console.log('📝 发送MQTT消息到 fleet/chargenode/{stationId} 来测试');
      }
    } catch (error) {
      console.error('❌ 监控失败:', error.message);
    }
  };
  
  // 初始检查
  await checkStatus();
  
  // 每2秒检查一次
  const interval = setInterval(checkStatus, 2000);
  
  // 处理退出
  process.on('SIGINT', () => {
    console.log('\n\n👋 停止监控');
    clearInterval(interval);
    process.exit(0);
  });
}

console.log('🚀 启动充电桩状态监控...');
monitorChargeNodeStatus();
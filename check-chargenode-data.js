const redis = require('redis');

async function checkChargenode() {
  const client = redis.createClient();
  await client.connect();
  
  console.log('🔍 检查 PN-002 的数据...');
  
  const data = await client.lRange('telemetry:chargenode:PN-002', 0, 0);
  
  if (data.length > 0) {
    const parsed = JSON.parse(data[0]);
    console.log('📋 最新数据:', JSON.stringify(parsed, null, 2));
    console.log('⏰ 时间戳:', parsed.ts);
    console.log('📅 对应时间:', new Date(parsed.ts).toLocaleString('zh-CN'));
    console.log('🕐 当前时间:', new Date().toLocaleString('zh-CN'));
    
    const timeDiff = Math.floor((Date.now() - parsed.ts) / 1000);
    console.log('⏱️ 时间差:', timeDiff, '秒');
    
    if (timeDiff > 300) {
      console.log('❌ 超过5分钟，会被标记为超时');
    } else {
      console.log('✅ 在5分钟内，状态正常');
    }
  } else {
    console.log('❌ 没有找到数据');
  }
  
  await client.quit();
}

checkChargenode().catch(console.error);
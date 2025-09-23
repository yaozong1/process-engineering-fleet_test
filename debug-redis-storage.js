/**
 * 调试充电桩Redis存储问题
 */

const { getRedis } = require('./src/lib/redis')

async function debugRedisStorage() {
  console.log('🔍 调试Redis存储...')
  
  try {
    const redis = getRedis()
    
    // 检查现有的充电桩数据
    const keys = await redis.keys('telemetry:chargenode:*')
    console.log('Redis中的充电桩键:', keys)
    
    if (keys.length > 0) {
      for (const key of keys) {
        console.log(`\n📋 检查键: ${key}`)
        const data = await redis.lrange(key, 0, 5)
        console.log('数据类型:', typeof data[0])
        console.log('数据内容:', data[0])
        
        // 尝试解析
        try {
          const parsed = JSON.parse(data[0])
          console.log('解析成功:', parsed)
        } catch (e) {
          console.log('解析失败:', e.message)
          console.log('原始数据:', data[0])
        }
      }
    }
    
    // 手动存储一个正确格式的数据来测试
    const testData = {
      stationId: "PN-TEST",
      ts: Date.now(),
      status: "charging",
      voltage: 400.5,
      current: 125.3,
      power: 50.2
    }
    
    console.log('\n📝 手动存储测试数据...')
    const testKey = 'telemetry:chargenode:PN-TEST'
    await redis.lpush(testKey, JSON.stringify(testData))
    
    // 立即读取回来
    const retrieved = await redis.lrange(testKey, 0, 0)
    console.log('存储后读取的数据类型:', typeof retrieved[0])
    console.log('存储后读取的数据:', retrieved[0])
    
    try {
      const parsed = JSON.parse(retrieved[0])
      console.log('✅ 手动测试解析成功:', parsed)
    } catch (e) {
      console.log('❌ 手动测试解析失败:', e.message)
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error)
  }
}

debugRedisStorage();
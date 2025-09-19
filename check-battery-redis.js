/**
 * 检查Redis中的battery数据
 */

// 使用Upstash REST API检查Redis数据
async function checkBatteryData() {
  const redisUrl = 'https://fine-ram-32289.upstash.io'
  const token = 'AX4hAAIncDFlYjJiZjNmZWM3NGI0MzkzYjVjMzA5NDRiZDMxMGZhNHAxMzIyODk'
  
  // 检查所有以telemetry:开头的键
  console.log('检查所有battery相关的键...')
  try {
    const keysResponse = await fetch(`${redisUrl}/keys/telemetry:*`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const keysData = await keysResponse.json()
    console.log('Battery键列表:', keysData)
    
    if (keysData.result && keysData.result.length > 0) {
      // 检查PE-001的数据详情
      console.log('\n检查PE-001电池数据详情...')
      const pe001Response = await fetch(`${redisUrl}/lrange/telemetry:PE-001/0/5`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const pe001Data = await pe001Response.json()
      console.log('PE-001最新5条数据:', pe001Data)
      
      // 检查数据总数
      const countResponse = await fetch(`${redisUrl}/llen/telemetry:PE-001`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const countData = await countResponse.json()
      console.log('PE-001数据总数:', countData)
    }
  } catch (error) {
    console.error('检查battery键失败:', error.message)
  }
  
  // 检查最新的电池数据格式
  console.log('\n检查最新电池数据格式...')
  try {
    const latestResponse = await fetch(`${redisUrl}/lindex/telemetry:PE-001/0`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const latestData = await latestResponse.json()
    console.log('最新数据格式:', latestData)
    
    if (latestData.result) {
      try {
        const parsed = JSON.parse(latestData.result)
        console.log('解析后的数据:', parsed)
      } catch (e) {
        console.log('数据不是JSON格式:', latestData.result)
      }
    }
  } catch (error) {
    console.error('检查最新数据失败:', error.message)
  }
}

checkBatteryData()
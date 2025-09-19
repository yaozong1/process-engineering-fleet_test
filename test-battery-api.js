/**
 * 对比前端和后端的battery数据
 */

// 测试API调用
async function compareBatteryData() {
  const baseUrl = 'http://localhost:3000'
  
  console.log('=== 对比Battery前端和后端数据 ===\n')
  
  // 1. 测试设备列表API
  console.log('1. 测试设备列表API...')
  try {
    const listResponse = await fetch(`${baseUrl}/api/telemetry?list=1`)
    const listData = await listResponse.json()
    console.log('设备列表API响应:', listData)
    
    if (listData.devices && listData.devices.length > 0) {
      const deviceId = listData.devices[0] // 使用第一个设备
      console.log(`\n2. 测试单个设备 ${deviceId} 的数据...`)
      
      // 2. 测试不同limit的数据获取
      const limits = [1, 5, 10]
      for (const limit of limits) {
        try {
          const deviceResponse = await fetch(`${baseUrl}/api/telemetry?device=${deviceId}&limit=${limit}`)
          const deviceData = await deviceResponse.json()
          console.log(`\nAPI响应 (limit=${limit}):`)
          console.log(`- 设备: ${deviceData.device}`)
          console.log(`- 数据条数: ${deviceData.count}`)
          console.log(`- 最新数据时间戳: ${deviceData.data[0]?.ts} (${new Date(deviceData.data[0]?.ts).toLocaleString()})`)
          console.log(`- 最新SOC: ${deviceData.data[0]?.soc}%`)
          console.log(`- 最新电压: ${deviceData.data[0]?.voltage}V`)
          console.log(`- 最新温度: ${deviceData.data[0]?.temperature}°C`)
          
          if (limit === 5 && deviceData.data.length > 1) {
            console.log('\n最近5条数据的时间序列:')
            deviceData.data.forEach((d, i) => {
              console.log(`  ${i+1}. ${new Date(d.ts).toLocaleString()} - SOC: ${d.soc}%`)
            })
          }
        } catch (error) {
          console.error(`获取设备 ${deviceId} 数据失败 (limit=${limit}):`, error.message)
        }
      }
    }
  } catch (error) {
    console.error('获取设备列表失败:', error.message)
  }
  
  // 3. 检查数据是否按时间排序
  console.log('\n3. 检查数据时间序列是否正确...')
  try {
    const testResponse = await fetch(`${baseUrl}/api/telemetry?device=PE-001&limit=10`)
    const testData = await testResponse.json()
    
    if (testData.data && testData.data.length > 1) {
      const timestamps = testData.data.map(d => d.ts)
      const isDescending = timestamps.every((ts, i) => i === 0 || timestamps[i-1] >= ts)
      const isAscending = timestamps.every((ts, i) => i === 0 || timestamps[i-1] <= ts)
      
      console.log('时间戳序列:', timestamps.map(ts => new Date(ts).toLocaleTimeString()))
      console.log('是否降序(新→旧):', isDescending)
      console.log('是否升序(旧→新):', isAscending)
      
      if (!isDescending && !isAscending) {
        console.warn('⚠️ 时间序列混乱！这可能导致前端图表显示问题')
      } else if (isDescending) {
        console.log('✅ 数据按时间降序排列(正确)')
      } else {
        console.log('✅ 数据按时间升序排列')
      }
    }
  } catch (error) {
    console.error('检查时间序列失败:', error.message)
  }
  
  console.log('\n=== 对比完成 ===')
}

compareBatteryData()
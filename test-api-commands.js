/**
 * 使用curl检查API数据
 */

// 使用PowerShell的Invoke-WebRequest
const testAPI = `
# 测试设备列表
Invoke-RestMethod -Uri "http://localhost:3000/api/telemetry?list=1" | ConvertTo-Json -Depth 10

Write-Host "================================"

# 测试单个设备数据
Invoke-RestMethod -Uri "http://localhost:3000/api/telemetry?device=PE-001&limit=5" | ConvertTo-Json -Depth 10
`

console.log('请在PowerShell中运行以下命令来测试API:')
console.log(testAPI)
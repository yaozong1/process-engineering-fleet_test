// Node.js 脚本：生成阿里云 MQTT 三元组
// 用法：node aliyun-mqtt-sign.js
const crypto = require('crypto')

// === 需替换为你自己的三元组 ===
const productKey = '你的ProductKey'
const deviceName = '你的DeviceName'
const deviceSecret = '你的DeviceSecret'
const ts = Date.now().toString()
const clientIdCore = `${productKey}.${deviceName}`
const signContent = `clientId${clientIdCore}deviceName${deviceName}productKey${productKey}timestamp${ts}`
const password = crypto.createHmac('sha256', deviceSecret).update(signContent).digest('hex')
const clientId = `${clientIdCore}|securemode=2,signmethod=hmacsha256,timestamp=${ts}|`
const username = `${deviceName}&${productKey}`
console.log('clientId:', clientId)
console.log('username:', username)
console.log('password:', password)
console.log('signContent:', signContent)

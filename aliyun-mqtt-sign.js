// Node.js �ű������ɰ����� MQTT ��Ԫ��
// �÷���node aliyun-mqtt-sign.js
const crypto = require('crypto')

// === ���滻Ϊ���Լ�����Ԫ�� ===
const productKey = '���ProductKey'
const deviceName = '���DeviceName'
const deviceSecret = '���DeviceSecret'
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

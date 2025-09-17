/**
 * 密码哈希验证演示脚本
 * 展示 bcrypt 如何工作
 */

const bcrypt = require('bcryptjs');

async function demonstratePasswordHashing() {
  console.log('=== 密码哈希演示 ===\n');
  
  const originalPassword = 'admin123';
  console.log('1. 原始密码:', originalPassword);
  
  // 生成哈希（就像创建用户时一样）
  const hashedPassword = await bcrypt.hash(originalPassword, 12);
  console.log('2. 哈希后的密码:', hashedPassword);
  
  // 验证密码（就像登录时一样）
  const isValid = await bcrypt.compare(originalPassword, hashedPassword);
  console.log('3. 密码验证结果:', isValid);
  
  // 测试错误密码
  const wrongPassword = 'wrongpassword';
  const isWrong = await bcrypt.compare(wrongPassword, hashedPassword);
  console.log('4. 错误密码验证:', isWrong);
  
  console.log('\n=== 解释 ===');
  console.log('? 数据库中存储的是哈希值，不是明文密码');
  console.log('? 登录时使用 bcrypt.compare() 验证密码');
  console.log('? 即使数据库泄露，攻击者也无法获得真实密码');
  console.log('? 每次哈希生成的结果都不同（因为有随机盐值）');
  
  // 演示每次哈希结果不同
  console.log('\n=== 盐值演示 ===');
  const hash1 = await bcrypt.hash(originalPassword, 12);
  const hash2 = await bcrypt.hash(originalPassword, 12);
  console.log('同一密码的不同哈希值:');
  console.log('哈希1:', hash1);
  console.log('哈希2:', hash2);
  console.log('两个哈希相同吗?', hash1 === hash2);
  console.log('但都能验证原密码:', 
    await bcrypt.compare(originalPassword, hash1), 
    await bcrypt.compare(originalPassword, hash2)
  );
}

demonstratePasswordHashing().catch(console.error);
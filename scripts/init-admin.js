/**
 * 初始化管理员账户脚本
 * 运行这个脚本来创建默认的管理员账户
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const bcrypt = require('bcryptjs');

// Redis客户端配置
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.error('Redis配置缺失，请检查环境变量 UPSTASH_REDIS_REST_URL 和 UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

async function createDefaultAdmin() {
  try {
    // 默认管理员信息
    const adminData = {
      username: 'admin',
      password: 'admin123', // 建议首次登录后立即修改
      email: 'admin@pe-fleet.com',
      role: 'admin'
    };

    console.log('开始创建默认管理员账户...');

    // 检查管理员是否已存在
    const checkResponse = await fetch(`${redisUrl}/get/user:${adminData.username}`, {
      headers: {
        'Authorization': `Bearer ${redisToken}`,
      },
    });

    if (checkResponse.ok) {
      const existingUser = await checkResponse.json();
      if (existingUser.result) {
        console.log('管理员账户已存在，跳过创建');
        console.log('默认管理员登录信息:');
        console.log('  用户名: admin');
        console.log('  密码: admin123');
        console.log('  建议首次登录后立即修改密码！');
        return;
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // 创建用户对象
    const newUser = {
      username: adminData.username,
      password: hashedPassword,
      email: adminData.email,
      role: adminData.role,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    // 保存到Redis
    const saveResponse = await fetch(`${redisUrl}/set/user:${adminData.username}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    });

    if (!saveResponse.ok) {
      throw new Error(`保存用户失败: ${saveResponse.status}`);
    }

    console.log('? 默认管理员账户创建成功！');
    console.log('');
    console.log('默认管理员登录信息:');
    console.log('  用户名: admin');
    console.log('  密码: admin123');
    console.log('  邮箱: admin@pe-fleet.com');
    console.log('  角色: admin');
    console.log('');
    console.log('??  重要提醒：');
    console.log('1. 请立即登录系统并修改默认密码');
    console.log('2. 妥善保管管理员账户信息');
    console.log('3. 只有管理员才能创建新用户');

  } catch (error) {
    console.error('创建管理员账户失败:', error);
    process.exit(1);
  }
}

// 运行脚本
createDefaultAdmin();
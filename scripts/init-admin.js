/**
 * ��ʼ������Ա�˻��ű�
 * ��������ű�������Ĭ�ϵĹ���Ա�˻�
 */

// ���ػ�������
require('dotenv').config({ path: '.env.local' });

const bcrypt = require('bcryptjs');

// Redis�ͻ�������
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.error('Redis����ȱʧ�����黷������ UPSTASH_REDIS_REST_URL �� UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

async function createDefaultAdmin() {
  try {
    // Ĭ�Ϲ���Ա��Ϣ
    const adminData = {
      username: 'admin',
      password: 'admin123', // �����״ε�¼�������޸�
      email: 'admin@pe-fleet.com',
      role: 'admin'
    };

    console.log('��ʼ����Ĭ�Ϲ���Ա�˻�...');

    // ������Ա�Ƿ��Ѵ���
    const checkResponse = await fetch(`${redisUrl}/get/user:${adminData.username}`, {
      headers: {
        'Authorization': `Bearer ${redisToken}`,
      },
    });

    if (checkResponse.ok) {
      const existingUser = await checkResponse.json();
      if (existingUser.result) {
        console.log('����Ա�˻��Ѵ��ڣ���������');
        console.log('Ĭ�Ϲ���Ա��¼��Ϣ:');
        console.log('  �û���: admin');
        console.log('  ����: admin123');
        console.log('  �����״ε�¼�������޸����룡');
        return;
      }
    }

    // ��������
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // �����û�����
    const newUser = {
      username: adminData.username,
      password: hashedPassword,
      email: adminData.email,
      role: adminData.role,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    // ���浽Redis
    const saveResponse = await fetch(`${redisUrl}/set/user:${adminData.username}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    });

    if (!saveResponse.ok) {
      throw new Error(`�����û�ʧ��: ${saveResponse.status}`);
    }

    console.log('? Ĭ�Ϲ���Ա�˻������ɹ���');
    console.log('');
    console.log('Ĭ�Ϲ���Ա��¼��Ϣ:');
    console.log('  �û���: admin');
    console.log('  ����: admin123');
    console.log('  ����: admin@pe-fleet.com');
    console.log('  ��ɫ: admin');
    console.log('');
    console.log('??  ��Ҫ���ѣ�');
    console.log('1. ��������¼ϵͳ���޸�Ĭ������');
    console.log('2. ���Ʊ��ܹ���Ա�˻���Ϣ');
    console.log('3. ֻ�й���Ա���ܴ������û�');

  } catch (error) {
    console.error('��������Ա�˻�ʧ��:', error);
    process.exit(1);
  }
}

// ���нű�
createDefaultAdmin();
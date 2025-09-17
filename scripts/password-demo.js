/**
 * �����ϣ��֤��ʾ�ű�
 * չʾ bcrypt ��ι���
 */

const bcrypt = require('bcryptjs');

async function demonstratePasswordHashing() {
  console.log('=== �����ϣ��ʾ ===\n');
  
  const originalPassword = 'admin123';
  console.log('1. ԭʼ����:', originalPassword);
  
  // ���ɹ�ϣ�����񴴽��û�ʱһ����
  const hashedPassword = await bcrypt.hash(originalPassword, 12);
  console.log('2. ��ϣ�������:', hashedPassword);
  
  // ��֤���루�����¼ʱһ����
  const isValid = await bcrypt.compare(originalPassword, hashedPassword);
  console.log('3. ������֤���:', isValid);
  
  // ���Դ�������
  const wrongPassword = 'wrongpassword';
  const isWrong = await bcrypt.compare(wrongPassword, hashedPassword);
  console.log('4. ����������֤:', isWrong);
  
  console.log('\n=== ���� ===');
  console.log('? ���ݿ��д洢���ǹ�ϣֵ��������������');
  console.log('? ��¼ʱʹ�� bcrypt.compare() ��֤����');
  console.log('? ��ʹ���ݿ�й¶��������Ҳ�޷������ʵ����');
  console.log('? ÿ�ι�ϣ���ɵĽ������ͬ����Ϊ�������ֵ��');
  
  // ��ʾÿ�ι�ϣ�����ͬ
  console.log('\n=== ��ֵ��ʾ ===');
  const hash1 = await bcrypt.hash(originalPassword, 12);
  const hash2 = await bcrypt.hash(originalPassword, 12);
  console.log('ͬһ����Ĳ�ͬ��ϣֵ:');
  console.log('��ϣ1:', hash1);
  console.log('��ϣ2:', hash2);
  console.log('������ϣ��ͬ��?', hash1 === hash2);
  console.log('��������֤ԭ����:', 
    await bcrypt.compare(originalPassword, hash1), 
    await bcrypt.compare(originalPassword, hash2)
  );
}

demonstratePasswordHashing().catch(console.error);
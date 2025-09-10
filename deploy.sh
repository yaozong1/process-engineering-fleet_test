#!/bin/bash

# Process Engineering Fleet Manager - 阿里云ECS自动部署脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    print_error "请使用root权限运行此脚本"
    exit 1
fi

print_status "开始部署 Process Engineering Fleet Manager..."

# 1. 更新系统
print_status "更新系统包..."
apt update && apt upgrade -y

# 2. 安装Node.js
print_status "安装Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    print_warning "Node.js已安装，跳过..."
fi

# 3. 安装Bun
print_status "安装Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
else
    print_warning "Bun已安装，跳过..."
fi

# 4. 安装PM2
print_status "安装PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install pm2 -g
else
    print_warning "PM2已安装，跳过..."
fi

# 5. 安装Nginx
print_status "安装Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install nginx -y
else
    print_warning "Nginx已安装，跳过..."
fi

# 6. 创建应用目录
print_status "创建应用目录..."
APP_DIR="/var/www/process-engineering-fleet"
mkdir -p $APP_DIR
mkdir -p /var/log/pm2

# 7. 复制应用文件（假设脚本在项目根目录运行）
print_status "复制应用文件..."
cp -r . $APP_DIR/
cd $APP_DIR

# 8. 安装依赖
print_status "安装项目依赖..."
bun install

# 9. 构建应用
print_status "构建生产版本..."
bun run build

# 10. 配置PM2
print_status "配置PM2..."
if pm2 list | grep -q "fleet-manager"; then
    print_warning "应用已在运行，重启中..."
    pm2 restart fleet-manager
else
    pm2 start ecosystem.config.js
fi

pm2 save
pm2 startup systemd -u root --hp /root

# 11. 配置Nginx
print_status "配置Nginx..."
cat > /etc/nginx/sites-available/fleet-manager << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 增加超时时间
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态文件缓存
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用Nginx配置
ln -sf /etc/nginx/sites-available/fleet-manager /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
nginx -t

# 重启Nginx
systemctl restart nginx
systemctl enable nginx

# 12. 配置防火墙（如果使用ufw）
if command -v ufw &> /dev/null; then
    print_status "配置防火墙..."
    ufw allow 22
    ufw allow 80
    ufw allow 443
    ufw --force enable
fi

# 13. 创建监控脚本
print_status "创建监控脚本..."
cat > /usr/local/bin/fleet-manager-monitor.sh << 'EOF'
#!/bin/bash
# Fleet Manager 健康检查脚本

# 检查PM2进程
if ! pm2 list | grep -q "fleet-manager"; then
    echo "$(date): Fleet Manager进程未运行，尝试重启..." >> /var/log/fleet-manager-monitor.log
    pm2 start /var/www/process-engineering-fleet/ecosystem.config.js
fi

# 检查端口3000
if ! netstat -tlnp | grep -q ":3000"; then
    echo "$(date): 端口3000未开放，检查应用状态..." >> /var/log/fleet-manager-monitor.log
fi

# 检查Nginx状态
if ! systemctl is-active --quiet nginx; then
    echo "$(date): Nginx未运行，尝试重启..." >> /var/log/fleet-manager-monitor.log
    systemctl restart nginx
fi
EOF

chmod +x /usr/local/bin/fleet-manager-monitor.sh

# 添加cron任务
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/fleet-manager-monitor.sh") | crontab -

# 14. 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me)

print_status "=================================================="
print_status "🎉 部署完成！"
print_status "=================================================="
print_status "应用访问地址: http://$SERVER_IP"
print_status "演示账号: admin@processengineering.com"
print_status "演示密码: admin123"
print_status "=================================================="
print_status "运维命令:"
print_status "查看应用状态: pm2 status"
print_status "查看应用日志: pm2 logs fleet-manager"
print_status "重启应用: pm2 restart fleet-manager"
print_status "查看Nginx状态: systemctl status nginx"
print_status "=================================================="

# 15. 最终检查
print_status "进行最终健康检查..."
sleep 5

if pm2 list | grep -q "fleet-manager"; then
    print_status "✅ PM2进程运行正常"
else
    print_error "❌ PM2进程异常"
fi

if systemctl is-active --quiet nginx; then
    print_status "✅ Nginx运行正常"
else
    print_error "❌ Nginx异常"
fi

if netstat -tlnp | grep -q ":3000"; then
    print_status "✅ 应用端口3000正常"
else
    print_error "❌ 应用端口3000异常"
fi

if netstat -tlnp | grep -q ":80"; then
    print_status "✅ Web端口80正常"
else
    print_error "❌ Web端口80异常"
fi

print_status "部署脚本执行完成！"
print_status "如果遇到问题，请检查日志："
print_status "  - PM2日志: pm2 logs"
print_status "  - Nginx日志: tail -f /var/log/nginx/error.log"
print_status "  - 系统日志: journalctl -f"

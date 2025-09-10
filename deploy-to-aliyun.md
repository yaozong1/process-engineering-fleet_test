# 阿里云ECS部署指南 - Process Engineering Fleet Manager

## 🚀 方案一：ECS服务器部署

### 1. 服务器准备
- **配置推荐**: 2核4G, Ubuntu 20.04 LTS
- **开放端口**: 22(SSH), 80(HTTP), 443(HTTPS), 3000
- **域名**: 可选，建议绑定域名

### 2. 环境安装
```bash
# SSH连接服务器
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y

# 安装Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 安装Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 安装PM2和Nginx
npm install pm2 -g
apt install nginx -y
```

### 3. 上传项目代码
```bash
# 方法1: 使用scp上传
scp -r ./process-engineering-fleet root@your-server-ip:/var/www/

# 方法2: 使用Git
git clone https://github.com/your-username/process-engineering-fleet.git /var/www/process-engineering-fleet
```

### 4. 安装依赖并构建
```bash
cd /var/www/process-engineering-fleet
bun install
bun run build
```

### 5. 配置PM2启动脚本
```bash
# 创建PM2配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fleet-manager',
    script: 'bun',
    args: 'run start',
    cwd: '/var/www/process-engineering-fleet',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. 配置Nginx反向代理
```bash
# 创建Nginx配置
cat > /etc/nginx/sites-available/fleet-manager << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名或IP

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
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/fleet-manager /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 7. 配置SSL证书（可选）
```bash
# 安装Certbot
apt install certbot python3-certbot-nginx -y

# 获取SSL证书
certbot --nginx -d your-domain.com

# 自动续期
crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🌐 方案二：阿里云OSS静态部署

### 1. 构建静态文件
```bash
# 本地构建
cd process-engineering-fleet
bun run build
bun run export  # 如果使用Next.js静态导出
```

### 2. 上传到OSS
- 进入阿里云OSS控制台
- 创建Bucket，设置为公共读
- 上传build文件夹内容
- 配置静态网站托管

## 🐳 方案三：Docker容器部署

### 1. 创建Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 2. 构建和运行
```bash
docker build -t fleet-manager .
docker run -d -p 3000:3000 --name fleet-manager fleet-manager
```

## 🔧 常用运维命令

```bash
# 查看应用状态
pm2 status
pm2 logs fleet-manager

# 重启应用
pm2 restart fleet-manager

# 查看Nginx状态
systemctl status nginx
nginx -t

# 查看端口占用
netstat -tlnp | grep :3000
netstat -tlnp | grep :80
```

## 🛡️ 安全配置

### 1. 防火墙设置
```bash
# 配置iptables或使用阿里云安全组
# 只开放必要端口：80, 443, 22
```

### 2. 定期备份
```bash
# 创建备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /backup/fleet-manager_$DATE.tar.gz /var/www/process-engineering-fleet
```

## 📞 故障排除

### 常见问题：
1. **端口被占用**: `kill -9 $(lsof -t -i:3000)`
2. **权限问题**: `chown -R www-data:www-data /var/www/process-engineering-fleet`
3. **内存不足**: 增加服务器配置或优化应用

### 日志查看：
- PM2日志: `pm2 logs`
- Nginx日志: `tail -f /var/log/nginx/error.log`
- 系统日志: `journalctl -f`

## 🎯 访问应用

部署完成后：
- HTTP: `http://your-server-ip`
- HTTPS: `https://your-domain.com`
- 使用演示账号登录: admin@processengineering.com / admin123

# Process Engineering Fleet Manager - 阿里云部署指南

## 🚀 快速部署选项

### 方案一：一键自动部署（推荐）
```bash
# 1. 下载部署脚本
wget https://raw.githubusercontent.com/your-repo/process-engineering-fleet/main/deploy.sh

# 2. 给脚本执行权限
chmod +x deploy.sh

# 3. 运行部署脚本（需要root权限）
sudo ./deploy.sh
```

### 方案二：手动部署到ECS
```bash
# 1. 上传代码到服务器
scp -r ./process-engineering-fleet root@your-server-ip:/var/www/

# 2. SSH登录服务器
ssh root@your-server-ip

# 3. 进入项目目录
cd /var/www/process-engineering-fleet

# 4. 安装环境和依赖
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
npm install pm2 -g
apt install nginx -y

# 5. 安装项目依赖并构建
bun install
bun run build

# 6. 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 7. 配置Nginx
ln -s /etc/nginx/sites-available/fleet-manager /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
systemctl restart nginx
```

### 方案三：Docker部署
```bash
# 1. 安装Docker
curl -fsSL https://get.docker.com | sh
apt install docker-compose -y

# 2. 构建并运行
docker-compose up -d

# 3. 查看状态
docker-compose ps
docker-compose logs -f
```

## 📋 服务器要求

### 最低配置
- **CPU**: 1核
- **内存**: 2GB
- **存储**: 20GB SSD
- **带宽**: 1Mbps

### 推荐配置
- **CPU**: 2核
- **内存**: 4GB
- **存储**: 40GB SSD
- **带宽**: 5Mbps

### 系统要求
- Ubuntu 20.04 LTS 或更高版本
- CentOS 7 或更高版本
- 开放端口：22(SSH), 80(HTTP), 443(HTTPS)

## 🛡️ 安全组配置

在阿里云ECS控制台配置安全组规则：

| 方向 | 协议 | 端口 | 源地址 | 说明 |
|------|------|------|--------|------|
| 入方向 | TCP | 22 | 0.0.0.0/0 | SSH访问 |
| 入方向 | TCP | 80 | 0.0.0.0/0 | HTTP访问 |
| 入方向 | TCP | 443 | 0.0.0.0/0 | HTTPS访问 |

## 🌐 域名配置（可选）

### 1. 在阿里云购买域名
- 进入阿里云域名控制台
- 购买域名（如：your-fleet.com）

### 2. 配置DNS解析
- 添加A记录：your-fleet.com -> 服务器IP
- 添加CNAME记录：www.your-fleet.com -> your-fleet.com

### 3. 配置SSL证书
```bash
# 使用Let's Encrypt免费证书
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-fleet.com -d www.your-fleet.com

# 自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## 🔧 常用运维命令

### PM2进程管理
```bash
pm2 status                    # 查看进程状态
pm2 logs fleet-manager        # 查看应用日志
pm2 restart fleet-manager     # 重启应用
pm2 stop fleet-manager        # 停止应用
pm2 start fleet-manager       # 启动应用
pm2 monit                     # 实时监控
```

### Nginx管理
```bash
systemctl status nginx        # 查看Nginx状态
systemctl restart nginx       # 重启Nginx
systemctl reload nginx        # 重载配置
nginx -t                      # 测试配置文件
tail -f /var/log/nginx/access.log  # 查看访问日志
tail -f /var/log/nginx/error.log   # 查看错误日志
```

### 系统监控
```bash
htop                          # 查看系统资源
df -h                         # 查看磁盘使用
free -h                       # 查看内存使用
netstat -tlnp                 # 查看端口占用
journalctl -f                 # 查看系统日志
```

## 📊 性能优化

### 1. 启用Gzip压缩
Nginx配置已包含Gzip压缩设置。

### 2. 配置缓存
```bash
# 在Nginx配置中添加静态文件缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 数据库优化（如果需要）
```bash
# 如果使用MySQL
mysql_secure_installation
```

## 🔍 故障排除

### 应用无法访问
1. 检查PM2进程：`pm2 status`
2. 检查端口占用：`netstat -tlnp | grep :3000`
3. 检查防火墙：`ufw status`
4. 检查Nginx状态：`systemctl status nginx`

### 常见错误解决
```bash
# 端口被占用
kill -9 $(lsof -t -i:3000)

# 权限问题
chown -R www-data:www-data /var/www/process-engineering-fleet

# 内存不足
# 增加swap或升级服务器配置
```

## 📞 技术支持

如果遇到部署问题：

1. 查看详细部署文档：[deploy-to-aliyun.md](./deploy-to-aliyun.md)
2. 检查系统日志：`journalctl -f`
3. 查看应用日志：`pm2 logs`

## 🎯 部署后验证

部署完成后，访问以下URL验证：

- **主页**: http://your-server-ip
- **登录**: 使用 admin@processengineering.com / admin123
- **健康检查**: http://your-server-ip/health（如果配置了）

## 💰 成本估算

### 阿里云ECS费用参考
- **轻量级**: 2核2G - 约¥60/月
- **标准型**: 2核4G - 约¥120/月
- **高性能**: 4核8G - 约¥300/月

### 其他费用
- **域名**: ¥50-100/年
- **SSL证书**: 免费（Let's Encrypt）
- **流量费**: 按实际使用量

## 📈 监控和备份

### 设置监控告警
```bash
# 创建监控脚本
/usr/local/bin/fleet-manager-monitor.sh

# 添加到cron
crontab -e
*/5 * * * * /usr/local/bin/fleet-manager-monitor.sh
```

### 数据备份
```bash
# 创建备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /backup/fleet-manager_$DATE.tar.gz /var/www/process-engineering-fleet
```

---

**🎉 部署完成后，您的Process Engineering Fleet Manager就可以正式投入使用了！**

# Process Engineering Fleet Manager

一个专业的车队管理系统，集成了GPS实时追踪和电池监控功能。

## 🚀 主要功能

- 🔐 **专业登录系统** - Process Engineering品牌认证
- 📍 **实时GPS追踪** - OpenStreetMap集成，支持5辆车实时定位
- 🔋 **电池监控探测** - 完整的电池健康监控系统
- 📊 **车队管理仪表板** - 数据分析和可视化
- 📱 **响应式设计** - 支持桌面、平板、手机

## 🛠️ 技术栈

- **前端**: Next.js 15, TypeScript, Tailwind CSS
- **地图**: Leaflet + OpenStreetMap
- **图表**: Recharts
- **UI组件**: shadcn/ui
- **部署**: Docker, Netlify, 阿里云ECS

## 🔄 Git工作流程

### 开发者增量提交工作流程

每次代码修改后，使用以下流程：

```bash
# 1. 修改代码后，创建增量提交
./git-commit-helper.sh "描述您的更改"

# 2. 查看提交历史
git log --oneline -5

# 3. 当您准备好时，推送到远程仓库
git push origin main
```

### 重要说明

- ✅ **保持Git历史连续性** - 不会重新初始化仓库
- ✅ **增量提交** - 每次只提交实际更改
- ✅ **用户控制推送** - 由您决定何时推送到GitHub
- ✅ **清晰的提交信息** - 每次提交都有明确的描述

## 📦 部署选项

### 快速部署
```bash
# Netlify手动部署
拖拽 out/ 文件夹到 https://app.netlify.com/drop

# 阿里云ECS部署
./deploy.sh

# Docker部署
docker-compose up -d
```

## 🎯 演示账号

- **邮箱**: admin@processengineering.com
- **密码**: admin123

## 📚 文档

- [阿里云部署指南](./deploy-to-aliyun.md)
- [中文部署文档](./README-DEPLOY-CN.md)

## 🔗 相关链接

- **GitHub仓库**: https://github.com/yaozong1/process-engineering-fleet
- **技术支持**: 查看issues或联系开发团队

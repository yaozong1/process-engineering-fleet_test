# 🪟 Windows环境部署指南 - Process Engineering Fleet Manager

## 📋 **系统要求**

- **操作系统**: Windows 10/11 (64位)
- **内存**: 最少4GB RAM (推荐8GB+)
- **存储**: 最少2GB可用空间
- **网络**: 互联网连接（用于下载依赖）

## 🚀 **快速开始 (5分钟设置)**

### **第一步：下载项目代码**

#### 选项1: 通过GitHub下载 (推荐)
```cmd
# 打开命令提示符 (按 Win+R，输入 cmd)
cd Desktop
git clone https://github.com/yaozong1/process-engineering-fleet.git
cd process-engineering-fleet
```

#### 选项2: 下载ZIP文件
1. 访问: https://github.com/yaozong1/process-engineering-fleet
2. 点击绿色的 "Code" 按钮
3. 选择 "Download ZIP"
4. 解压到桌面，文件夹重命名为 `process-engineering-fleet`

### **第二步：安装必要软件**

#### A. 安装Node.js
1. 访问: https://nodejs.org/zh-cn
2. 下载 **LTS版本** (推荐18.x或20.x)
3. 运行安装程序，选择默认设置
4. 验证安装：
```cmd
node --version
npm --version
```

#### B. 安装Bun (可选，推荐)
```cmd
# 打开PowerShell (按 Win+X，选择"Windows PowerShell")
irm bun.sh/install.ps1 | iex
```

如果Bun安装失败，可以只用npm，项目同样可以运行。

### **第三步：安装项目依赖**

```cmd
# 进入项目目录
cd Desktop\process-engineering-fleet

# 使用Bun安装依赖 (推荐)
bun install

# 或使用npm安装依赖
npm install
```

### **第四步：启动开发服务器**

```cmd
# 使用Bun启动 (推荐)
bun run dev

# 或使用npm启动
npm run dev
```

### **第五步：预览项目**

🎉 **项目启动成功！**

打开浏览器，访问：
- **本地预览**: http://localhost:3000
- **演示账号**: admin@processengineering.com
- **演示密码**: admin123

## 📱 **功能预览**

### 登录页面
- Process Engineering专业品牌设计
- 响应式布局，支持桌面和移动端

### 主仪表板
- 📊 车队管理数据可视化
- 📍 5辆车的实时GPS追踪
- 🔋 电池监控和健康状态
- 📈 燃料消耗和维护统计

### 核心功能
1. **GPS实时追踪** - 点击"GPS Tracking"标签
2. **电池监控** - 点击"Battery Monitor"标签
3. **车队概览** - 默认"Overview"页面

## 🛠️ **开发命令**

```cmd
# 开发模式 (实时预览)
bun run dev          # 或 npm run dev

# 构建生产版本
bun run build        # 或 npm run build

# 启动生产服务器
bun run start        # 或 npm run start

# 代码检查
bun run lint         # 或 npm run lint

# 代码格式化
bun run format       # 或 npm run format
```

## 🔧 **常见问题解决**

### 问题1: 端口占用
```cmd
# 错误: Error: listen EADDRINUSE :::3000
# 解决: 使用不同端口
npx next dev -p 3001
```

### 问题2: 权限问题
```cmd
# 以管理员身份运行命令提示符
# 右键点击"命令提示符" → "以管理员身份运行"
```

### 问题3: Bun安装失败
```cmd
# 直接使用npm，功能完全相同
npm install
npm run dev
```

### 问题4: Git命令不可用
1. 安装Git: https://git-scm.com/download/win
2. 或直接下载ZIP文件

### 问题5: 地图不显示
- 检查网络连接
- 确保没有被防火墙阻止
- 刷新页面或重启开发服务器

## 🎯 **项目结构说明**

```
process-engineering-fleet/
├── src/
│   ├── app/                    # Next.js应用路由
│   │   ├── page.tsx           # 主页面（登录+仪表板）
│   │   ├── layout.tsx         # 布局组件
│   │   └── globals.css        # 全局样式
│   ├── components/            # React组件
│   │   ├── login-page.tsx     # 登录页面
│   │   ├── dashboard-*.tsx    # 仪表板组件
│   │   ├── gps-tracking-dashboard.tsx  # GPS追踪
│   │   ├── battery-monitor-dashboard.tsx # 电池监控
│   │   └── ui/                # UI组件库
│   └── lib/                   # 工具函数
├── public/                    # 静态资源
├── package.json              # 项目配置
├── next.config.js            # Next.js配置
├── tailwind.config.ts        # Tailwind CSS配置
└── README.md                 # 项目说明
```

## 🚀 **高级功能**

### 自定义配置
编辑 `next.config.js` 修改项目配置

### 样式定制
编辑 `src/app/globals.css` 和 `tailwind.config.ts`

### 组件修改
在 `src/components/` 目录下修改具体功能

### API集成
在 `src/app/api/` 目录下添加后端接口

## 💡 **开发提示**

1. **热重载**: 修改代码后自动刷新浏览器
2. **TypeScript**: 项目支持完整的TypeScript类型检查
3. **响应式**: 设计适配桌面、平板、手机
4. **组件库**: 使用shadcn/ui高质量组件
5. **地图库**: Leaflet + OpenStreetMap免费开源

## 📞 **技术支持**

如遇到问题：
1. 检查Node.js版本是否正确 (18.x+)
2. 确保网络连接正常
3. 查看控制台错误信息
4. 重新安装依赖: `rm -rf node_modules && npm install`

## 🎉 **开始使用**

项目运行成功后，您可以：
- 🔐 登录系统体验完整功能
- 📍 查看GPS实时追踪地图
- 🔋 监控车队电池状态
- 📊 分析车队运营数据
- 📱 在不同设备上测试响应式设计

**祝您使用愉快！** 🚀

#!/bin/bash

# Process Engineering Fleet Manager - Git上传脚本
# 使用方法: ./upload-to-git.sh [github|gitlab|gitee] [username] [repo-name]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查参数
PLATFORM=${1:-github}
USERNAME=${2}
REPO_NAME=${3:-process-engineering-fleet}

if [ -z "$USERNAME" ]; then
    print_error "请提供用户名"
    echo "使用方法: ./upload-to-git.sh [github|gitlab|gitee] [username] [repo-name]"
    echo "示例: ./upload-to-git.sh github myusername process-engineering-fleet"
    exit 1
fi

# 设置Git仓库URL
case $PLATFORM in
    "github")
        GIT_URL="https://github.com/${USERNAME}/${REPO_NAME}.git"
        SSH_URL="git@github.com:${USERNAME}/${REPO_NAME}.git"
        WEBSITE="https://github.com/new"
        ;;
    "gitlab")
        GIT_URL="https://gitlab.com/${USERNAME}/${REPO_NAME}.git"
        SSH_URL="git@gitlab.com:${USERNAME}/${REPO_NAME}.git"
        WEBSITE="https://gitlab.com/projects/new"
        ;;
    "gitee")
        GIT_URL="https://gitee.com/${USERNAME}/${REPO_NAME}.git"
        SSH_URL="git@gitee.com:${USERNAME}/${REPO_NAME}.git"
        WEBSITE="https://gitee.com/projects/new"
        ;;
    *)
        print_error "不支持的平台: $PLATFORM"
        print_info "支持的平台: github, gitlab, gitee"
        exit 1
        ;;
esac

print_status "开始上传 Process Engineering Fleet Manager 到 $PLATFORM..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    print_error "请在项目根目录运行此脚本"
    exit 1
fi

# 1. 检查Git是否已安装
print_info "检查Git安装状态..."
if ! command -v git &> /dev/null; then
    print_error "Git未安装，请先安装Git"
    exit 1
fi

# 2. 检查Git配置
print_info "检查Git配置..."
if [ -z "$(git config --global user.name)" ] || [ -z "$(git config --global user.email)" ]; then
    print_warning "Git用户信息未配置"
    echo "请运行以下命令配置Git："
    echo "git config --global user.name \"Your Name\""
    echo "git config --global user.email \"your.email@example.com\""
    exit 1
fi

# 3. 初始化Git仓库（如果需要）
if [ ! -d ".git" ]; then
    print_info "初始化Git仓库..."
    git init
    print_status "Git仓库初始化完成"
else
    print_warning "Git仓库已存在"
fi

# 4. 添加.gitignore（如果不存在）
if [ ! -f ".gitignore" ]; then
    print_info "创建.gitignore文件..."
    cat > .gitignore << 'EOF'
# dependencies
/node_modules
/.pnp
.pnp.*

# testing
/coverage

# next.js
/.next/
/out/

# production
/build
/dist

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# IDE
.vscode
.idea

# Deployment
*.log
ssl/
EOF
fi

# 5. 添加所有文件
print_info "添加项目文件..."
git add .

# 6. 创建提交
print_info "创建Git提交..."
COMMIT_MESSAGE="🎉 Process Engineering Fleet Manager

✨ Features:
- 🔐 Professional login page with authentication
- 📍 Real-time GPS tracking with OpenStreetMap integration
- 🔋 Battery monitoring and probing system
- 📊 Fleet management dashboard with analytics
- 📱 Responsive design for all devices
- 🚀 Complete deployment scripts for Aliyun ECS
- 🐳 Docker containerization support

🛠️ Tech Stack:
- Next.js 15 with TypeScript
- Tailwind CSS + shadcn/ui
- Leaflet for mapping
- Recharts for analytics
- PM2 for process management
- Nginx for reverse proxy

📦 Deployment Ready:
- One-click deployment script
- Docker support
- Production-ready configuration
- Monitoring and backup scripts

Demo: admin@processengineering.com / admin123"

if git diff --staged --quiet; then
    print_warning "没有需要提交的更改"
else
    git commit -m "$COMMIT_MESSAGE"
    print_status "提交创建完成"
fi

# 7. 设置远程仓库
print_info "设置远程仓库..."
if git remote get-url origin &> /dev/null; then
    print_warning "远程仓库已存在，更新URL..."
    git remote set-url origin $GIT_URL
else
    git remote add origin $GIT_URL
fi

# 8. 设置主分支
git branch -M main

# 9. 推送到远程仓库
print_info "推送代码到 $PLATFORM..."
echo ""
print_warning "⚠️  重要提醒："
echo "1. 请确保您已在 $PLATFORM 创建了名为 '$REPO_NAME' 的仓库"
echo "2. 仓库创建地址: $WEBSITE"
echo "3. 如果是第一次推送，可能需要输入用户名和密码/token"
echo ""

read -p "是否继续推送? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if git push -u origin main; then
        print_status "✅ 代码上传成功！"
        echo ""
        echo "🎉 您的代码已成功上传到 $PLATFORM！"
        echo ""
        echo "📋 仓库信息:"
        echo "   平台: $PLATFORM"
        echo "   用户: $USERNAME"
        echo "   仓库: $REPO_NAME"
        echo "   URL: $GIT_URL"
        echo ""
        echo "🔗 访问链接:"
        case $PLATFORM in
            "github")
                echo "   仓库: https://github.com/${USERNAME}/${REPO_NAME}"
                echo "   Pages: https://${USERNAME}.github.io/${REPO_NAME} (如果启用)"
                ;;
            "gitlab")
                echo "   仓库: https://gitlab.com/${USERNAME}/${REPO_NAME}"
                ;;
            "gitee")
                echo "   仓库: https://gitee.com/${USERNAME}/${REPO_NAME}"
                ;;
        esac
        echo ""
        echo "📚 后续操作:"
        echo "   1. 在 $PLATFORM 上查看您的代码"
        echo "   2. 设置 GitHub Pages 或其他部署方式"
        echo "   3. 邀请团队成员协作"
        echo "   4. 设置 CI/CD 自动部署"
        echo ""
        echo "🚀 部署提醒:"
        echo "   - 可以使用 deploy.sh 脚本部署到阿里云"
        echo "   - 支持 Docker 容器化部署"
        echo "   - 生产环境已优化配置"
    else
        print_error "推送失败！"
        echo ""
        echo "🔧 可能的解决方案:"
        echo "1. 检查仓库是否已在 $PLATFORM 创建"
        echo "2. 检查用户名是否正确"
        echo "3. 检查网络连接"
        echo "4. 如果是私有仓库，确保有推送权限"
        echo ""
        echo "💡 如果是认证问题，可以尝试:"
        echo "   - 使用个人访问令牌 (Personal Access Token)"
        echo "   - 配置SSH密钥认证"
        exit 1
    fi
else
    print_warning "用户取消操作"
    echo "您可以稍后手动推送:"
    echo "git push -u origin main"
fi

echo ""
print_status "脚本执行完成！"

#!/bin/bash

# Process Engineering Fleet Manager - Git增量提交助手
# 用途：每次代码修改后创建增量提交，不自动推送

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[NOTICE]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[GIT]${NC} $1"
}

# 检查是否在Git仓库中
if [ ! -d ".git" ]; then
    echo "❌ 错误：当前目录不是Git仓库"
    exit 1
fi

print_status "检查代码更改..."

# 检查是否有更改
if git diff --quiet && git diff --cached --quiet; then
    print_warning "没有检测到代码更改，无需提交"
    exit 0
fi

# 显示更改摘要
print_info "检测到以下更改："
echo "修改的文件："
git status --porcelain

echo ""
print_info "更改详情："
git diff --stat

echo ""

# 获取提交信息
if [ -n "$1" ]; then
    COMMIT_MESSAGE="$1"
else
    echo "请输入提交信息（描述这次的更改）："
    read -r COMMIT_MESSAGE

    if [ -z "$COMMIT_MESSAGE" ]; then
        print_warning "提交信息不能为空，使用默认信息"
        COMMIT_MESSAGE="Update: $(date '+%Y-%m-%d %H:%M:%S')"
    fi
fi

# 添加所有更改
print_info "添加更改到暂存区..."
git add .

# 创建提交
print_info "创建提交..."
git commit -m "$COMMIT_MESSAGE"

# 显示提交信息
COMMIT_HASH=$(git rev-parse --short HEAD)
print_status "✅ 提交成功！"
echo "提交哈希: $COMMIT_HASH"
echo "提交信息: $COMMIT_MESSAGE"

echo ""
print_info "最近的提交历史："
git log --oneline -5

echo ""
print_warning "注意：代码已在本地提交，但尚未推送到远程仓库"
echo "如需推送到GitHub，请运行: ${BLUE}git push origin main${NC}"

echo ""
print_status "Git状态："
git status

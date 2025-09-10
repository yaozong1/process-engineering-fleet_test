@echo off
title Process Engineering Fleet Manager - Development Server

echo ========================================
echo Process Engineering Fleet Manager
echo 开发服务器启动中...
echo ========================================
echo.

REM 检查Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先运行 install-windows.bat
    pause
    exit /b 1
)

REM 检查依赖是否已安装
if not exist "node_modules" (
    echo ❌ 依赖未安装，请先运行 install-windows.bat
    pause
    exit /b 1
)

echo 🚀 启动开发服务器...
echo.
echo 📱 预览地址: http://localhost:3000
echo 🔐 演示账号: admin@processengineering.com
echo 🔑 演示密码: admin123
echo.
echo ⚠️  按 Ctrl+C 停止服务器
echo ========================================
echo.

REM 等待2秒后自动打开浏览器
timeout /t 2 /nobreak > nul
start http://localhost:3000

REM 优先使用Bun，失败则使用npm
bun --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 使用npm启动...
    npm run dev
) else (
    echo 使用Bun启动...
    bun run dev
)

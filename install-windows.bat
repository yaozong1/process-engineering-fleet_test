@echo off
echo ========================================
echo Process Engineering Fleet Manager
echo Windows 安装脚本
echo ========================================
echo.

REM 检查Node.js是否安装
echo [1/4] 检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装
    echo 请先安装Node.js: https://nodejs.org/zh-cn
    echo 下载LTS版本后重新运行此脚本
    pause
    exit /b 1
) else (
    echo ✅ Node.js 已安装
    node --version
)

echo.
echo [2/4] 检查Bun...
bun --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Bun 未安装，将使用npm
    set USE_BUN=false
) else (
    echo ✅ Bun 已安装
    bun --version
    set USE_BUN=true
)

echo.
echo [3/4] 安装项目依赖...
if "%USE_BUN%"=="true" (
    echo 使用Bun安装依赖...
    bun install
) else (
    echo 使用npm安装依赖...
    npm install
)

if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

echo.
echo [4/4] 创建启动脚本...

REM 创建启动脚本
if "%USE_BUN%"=="true" (
    echo @echo off > start-dev.bat
    echo echo 启动Process Engineering Fleet Manager... >> start-dev.bat
    echo echo 浏览器将打开 http://localhost:3000 >> start-dev.bat
    echo echo 演示账号: admin@processengineering.com >> start-dev.bat
    echo echo 演示密码: admin123 >> start-dev.bat
    echo echo. >> start-dev.bat
    echo echo 按Ctrl+C停止服务器 >> start-dev.bat
    echo echo. >> start-dev.bat
    echo start http://localhost:3000 >> start-dev.bat
    echo bun run dev >> start-dev.bat
) else (
    echo @echo off > start-dev.bat
    echo echo 启动Process Engineering Fleet Manager... >> start-dev.bat
    echo echo 浏览器将打开 http://localhost:3000 >> start-dev.bat
    echo echo 演示账号: admin@processengineering.com >> start-dev.bat
    echo echo 演示密码: admin123 >> start-dev.bat
    echo echo. >> start-dev.bat
    echo echo 按Ctrl+C停止服务器 >> start-dev.bat
    echo echo. >> start-dev.bat
    echo start http://localhost:3000 >> start-dev.bat
    echo npm run dev >> start-dev.bat
)

echo.
echo ========================================
echo ✅ 安装完成！
echo ========================================
echo.
echo 🚀 启动方式：
echo 1. 双击 start-dev.bat 文件
echo 2. 或在命令行运行: start-dev.bat
echo.
echo 📱 预览地址：
echo http://localhost:3000
echo.
echo 🔐 演示账号：
echo 邮箱: admin@processengineering.com
echo 密码: admin123
echo.
echo 📚 完整文档: WINDOWS-SETUP-GUIDE.md
echo ========================================

pause

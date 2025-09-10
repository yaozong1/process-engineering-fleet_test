# Process Engineering Fleet Manager - Windows PowerShell 安装脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Process Engineering Fleet Manager" -ForegroundColor Yellow
Write-Host "Windows PowerShell 安装脚本" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查执行策略
$executionPolicy = Get-ExecutionPolicy
if ($executionPolicy -eq "Restricted") {
    Write-Host "⚠️  PowerShell执行策略受限" -ForegroundColor Yellow
    Write-Host "正在设置执行策略..." -ForegroundColor Yellow
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
}

# 步骤1: 检查Node.js
Write-Host "[1/5] 检查Node.js..." -ForegroundColor Blue
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 已安装: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js 未安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "请按照以下步骤安装Node.js:" -ForegroundColor Yellow
    Write-Host "1. 访问: https://nodejs.org/zh-cn" -ForegroundColor White
    Write-Host "2. 下载并安装LTS版本" -ForegroundColor White
    Write-Host "3. 重新启动命令行并运行此脚本" -ForegroundColor White
    Write-Host ""
    Read-Host "按Enter键退出"
    exit 1
}

# 步骤2: 检查包管理器
Write-Host ""
Write-Host "[2/5] 检查包管理器..." -ForegroundColor Blue
try {
    $bunVersion = bun --version
    Write-Host "✅ Bun 已安装: $bunVersion" -ForegroundColor Green
    $useBun = $true
} catch {
    Write-Host "⚠️  Bun 未安装，将使用npm" -ForegroundColor Yellow
    Write-Host "要安装Bun以获得更快的体验吗? (y/n): " -NoNewline -ForegroundColor Yellow
    $installBun = Read-Host

    if ($installBun -eq "y" -or $installBun -eq "Y") {
        Write-Host "正在安装Bun..." -ForegroundColor Blue
        try {
            irm bun.sh/install.ps1 | iex
            $bunVersion = bun --version
            Write-Host "✅ Bun 安装成功: $bunVersion" -ForegroundColor Green
            $useBun = $true
        } catch {
            Write-Host "⚠️  Bun 安装失败，将使用npm" -ForegroundColor Yellow
            $useBun = $false
        }
    } else {
        $useBun = $false
    }
}

# 步骤3: 安装依赖
Write-Host ""
Write-Host "[3/5] 安装项目依赖..." -ForegroundColor Blue
try {
    if ($useBun) {
        Write-Host "使用Bun安装依赖..." -ForegroundColor Yellow
        bun install
    } else {
        Write-Host "使用npm安装依赖..." -ForegroundColor Yellow
        npm install
    }
    Write-Host "✅ 依赖安装成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 依赖安装失败" -ForegroundColor Red
    Write-Host "错误信息: $_" -ForegroundColor Red
    Read-Host "按Enter键退出"
    exit 1
}

# 步骤4: 创建启动脚本
Write-Host ""
Write-Host "[4/5] 创建启动脚本..." -ForegroundColor Blue

$startScript = @"
@echo off
title Process Engineering Fleet Manager
echo 启动Process Engineering Fleet Manager...
echo.
echo 📱 预览地址: http://localhost:3000
echo 🔐 演示账号: admin@processengineering.com
echo 🔑 演示密码: admin123
echo.
echo ⚠️  按 Ctrl+C 停止服务器
echo.
timeout /t 2 /nobreak > nul
start http://localhost:3000
"@

if ($useBun) {
    $startScript += "bun run dev"
} else {
    $startScript += "npm run dev"
}

$startScript | Out-File -FilePath "start-dev.bat" -Encoding ASCII
Write-Host "✅ 启动脚本创建成功" -ForegroundColor Green

# 步骤5: 创建桌面快捷方式
Write-Host ""
Write-Host "[5/5] 创建桌面快捷方式..." -ForegroundColor Blue
try {
    $currentPath = Get-Location
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = "$desktopPath\Process Engineering Fleet Manager.lnk"

    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = "$currentPath\start-dev.bat"
    $Shortcut.WorkingDirectory = $currentPath
    $Shortcut.Description = "Process Engineering Fleet Manager"
    $Shortcut.Save()

    Write-Host "✅ 桌面快捷方式创建成功" -ForegroundColor Green
} catch {
    Write-Host "⚠️  桌面快捷方式创建失败，但不影响使用" -ForegroundColor Yellow
}

# 完成
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 安装完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 启动方式：" -ForegroundColor Yellow
Write-Host "1. 双击桌面上的快捷方式" -ForegroundColor White
Write-Host "2. 双击项目文件夹中的 start-dev.bat" -ForegroundColor White
Write-Host "3. 在PowerShell中运行: .\start-dev.bat" -ForegroundColor White
Write-Host ""
Write-Host "📱 预览地址：" -ForegroundColor Yellow
Write-Host "http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "🔐 演示账号：" -ForegroundColor Yellow
Write-Host "邮箱: admin@processengineering.com" -ForegroundColor White
Write-Host "密码: admin123" -ForegroundColor White
Write-Host ""
Write-Host "📚 完整文档: WINDOWS-SETUP-GUIDE.md" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

Read-Host "按Enter键退出"

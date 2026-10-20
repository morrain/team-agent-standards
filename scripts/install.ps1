<#
.SYNOPSIS
    团队新成员一键安装 team-agent-standards
.DESCRIPTION
    在当前代码根目录克隆或更新 .agents 规范仓库
.PARAMETER RepoUrl
    团队远程 Git 仓库地址
#>
param(
    [string]$RepoUrl = "git@git.internal.company.com:platform/team-agent-standards.git"
)

$currentDir = (Get-Location).Path
$targetAgentDir = Join-Path $currentDir ".agents"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  team-agent-standards 团队一键安装工具" -ForegroundColor Cyan
Write-Host "  工作区根目录: $currentDir" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

if (Test-Path $targetAgentDir) {
    Write-Host "[!] 检测到 .agents 目录已存在，正在拉取最新版本..." -ForegroundColor Yellow
    Push-Location $targetAgentDir
    try {
        git pull
        Write-Host "[✓] 规范库已更新至最新状态！" -ForegroundColor Green
    } catch {
        Write-Error "更新失败，请检查网络或 Git 配置"
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[*] 正在克隆团队规范库至 .agents..." -ForegroundColor Cyan
    try {
        git clone $RepoUrl $targetAgentDir
        Write-Host "[✓] 规范库克隆成功！" -ForegroundColor Green
    } catch {
        Write-Error "克隆失败，请确认是否具有仓库权限: $RepoUrl"
        exit 1
    }
}

Write-Host ""
Write-Host "安装完成！接下来可以在任意子项目中运行接入脚本：" -ForegroundColor White
Write-Host "  cd my-subproject" -ForegroundColor Cyan
Write-Host "  ..\.agents\scripts\init-subproject.ps1" -ForegroundColor Cyan
Write-Host ""

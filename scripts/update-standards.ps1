<#
.SYNOPSIS
    一键同步更新 team-agent-standards 规范库
#>
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  正在更新团队 Agent 规范库..." -ForegroundColor Cyan
Write-Host "  仓库目录: $repoRoot" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

Push-Location $repoRoot
try {
    git pull
    Write-Host "[✓] 规范库拉取最新完成！" -ForegroundColor Green
    
    # 触发健康自检
    $healthScript = Join-Path $scriptDir "check-health.ps1"
    if (Test-Path $healthScript) {
        & $healthScript
    }
} catch {
    Write-Error "更新失败，请检查网络或 Git 状态: $_"
} finally {
    Pop-Location
}

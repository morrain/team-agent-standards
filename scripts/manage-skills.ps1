<#
.SYNOPSIS
    团队第三方开源技能管理辅助工具
.DESCRIPTION
    封装 Skills CLI，用于查看、按需添加、更新开源 Skill 及审查变更
.EXAMPLE
    .\scripts\manage-skills.ps1 list
    .\scripts\manage-skills.ps1 add vercel-labs/agent-skills@react-best-practices
    .\scripts\manage-skills.ps1 update
    .\scripts\manage-skills.ps1 audit
#>
param(
    [Parameter(Position=0)]
    [ValidateSet("list", "add", "update", "audit", "find")]
    [string]$Action = "list",

    [Parameter(Position=1)]
    [string]$TargetPackage
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$skillsDir = Join-Path $repoRoot "skills"

Push-Location $repoRoot

try {
    switch ($Action) {
        "list" {
            Write-Host "=== 当前 team-agent-standards 已安装技能列表 ===" -ForegroundColor Cyan
            $skills = Get-ChildItem -Path $skillsDir -Directory
            foreach ($s in $skills) {
                $skillMd = Join-Path $s.FullName "SKILL.md"
                if (Test-Path $skillMd) {
                    $desc = (Get-Content $skillMd | Select-String "description:" | Select-Object -First 1).Line
                    Write-Host "• $($s.Name)" -ForegroundColor Green
                    if ($desc) {
                        Write-Host "    $desc" -ForegroundColor Gray
                    }
                }
            }
        }
        "find" {
            if (-not $TargetPackage) {
                Write-Host "用法: .\manage-skills.ps1 find <关键词>" -ForegroundColor Yellow
                return
            }
            npx.cmd skills find $TargetPackage
        }
        "add" {
            if (-not $TargetPackage) {
                Write-Host "用法: .\manage-skills.ps1 add <包名或GitHub地址>" -ForegroundColor Yellow
                return
            }
            Write-Host "正在安装第三方技能: $TargetPackage..." -ForegroundColor Cyan
            npx.cmd skills add $TargetPackage -y --copy
            Write-Host "[✓] 安装完成！请执行 git status 查看新增内容并提交" -ForegroundColor Green
        }
        "update" {
            Write-Host "正在拉取所有第三方技能的上游更新..." -ForegroundColor Cyan
            npx.cmd skills update -y
            Write-Host "[✓] 更新完成！建议执行 .\scripts\manage-skills.ps1 audit 审查变更" -ForegroundColor Green
        }
        "audit" {
            Write-Host "=== 检查工作区代码变动与安全审计 (git diff) ===" -ForegroundColor Cyan
            git status -s
            Write-Host "---------------------------------------------" -ForegroundColor Gray
            git diff --stat
        }
    }
} finally {
    Pop-Location
}

<#
.SYNOPSIS
    一键为业务子项目接入团队 Agent 规范 (team-agent-standards)
.DESCRIPTION
    在目标子仓库中创建 .agents/skills.json（继承上层通用技能）
    并创建/更新 AGENTS.md（引入通用代码红线与 Git 提交规范）
.PARAMETER ProjectPath
    子项目目录路径，默认为当前目录
.EXAMPLE
    .\scripts\init-subproject.ps1
    ..\.agents\scripts\init-subproject.ps1 -ProjectPath "C:\codes\my-project"
#>
param(
    [string]$ProjectPath = (Get-Location).Path
)

$targetDir = (Resolve-Path $ProjectPath).Path

if (-not (Test-Path $targetDir -PathType Container)) {
    Write-Error "错误：目标路径不存在或不是一个目录: $targetDir"
    exit 1
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  正在为子项目配置 team-agent-standards 规范" -ForegroundColor Cyan
Write-Host "  目标路径: $targetDir" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. 创建子仓库 .agents 目录
$agentDir = Join-Path $targetDir ".agents"
if (-not (Test-Path $agentDir)) {
    New-Item -ItemType Directory -Path $agentDir -Force | Out-Null
    Write-Host "[+] 创建子项目配置目录: $agentDir" -ForegroundColor Green
}

# 2. 生成 .agents/skills.json
$skillsJsonPath = Join-Path $agentDir "skills.json"
$skillsJsonContent = @'
{
  "$schema": "https://antigravity.google/schemas/skills-config.json",
  "inherits": [
    {
      "path": "../.agents/skills.json"
    }
  ]
}
'@

Set-Content -Path $skillsJsonPath -Value $skillsJsonContent -Encoding UTF8
Write-Host "[+] 写入通用技能继承配置: $skillsJsonPath" -ForegroundColor Green

# 3. 生成或检查 AGENTS.md
$agentsMdPath = Join-Path $targetDir "AGENTS.md"
$ruleIncludes = @"
# Project Guidelines

@[通用编码红线](../.agents/rules/common.md)
@[Git提交规范](../.agents/rules/git.md)

## 本项目专属规则
<!-- 在此处添加本仓库特有的业务规则、框架约定或环境变量要求 -->

"@

if (-not (Test-Path $agentsMdPath)) {
    Set-Content -Path $agentsMdPath -Value $ruleIncludes -Encoding UTF8
    Write-Host "[+] 创建规则配置文件: $agentsMdPath" -ForegroundColor Green
} else {
    $existing = Get-Content -Path $agentsMdPath -Raw -Encoding UTF8
    if ($existing -notmatch "\.\./\.agents/rules/common\.md") {
        $updated = $ruleIncludes + "`n" + $existing
        Set-Content -Path $agentsMdPath -Value $updated -Encoding UTF8
        Write-Host "[*] 已将通用规范引用注入至现有 AGENTS.md" -ForegroundColor Yellow
    } else {
        Write-Host "[✓] 现有 AGENTS.md 已包含通用规范引用，无需修改" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  ✓ 子项目规范接入完成！" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "后续步骤：" -ForegroundColor White
Write-Host "  1. 执行以下命令将接入配置提交至子仓库 Git：" -ForegroundColor Yellow
Write-Host "     git add .agents/skills.json AGENTS.md" -ForegroundColor Cyan
Write-Host "     git commit -m `"chore: enable team-agent-standards`"" -ForegroundColor Cyan
Write-Host "  2. 在聊天窗口即可使用 /grill-me, /to-spec, /tdd 等全部团队技能！" -ForegroundColor Gray
Write-Host ""

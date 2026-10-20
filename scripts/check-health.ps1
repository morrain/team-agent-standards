# team-agent-standards health check
param()

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  team-agent-standards Health Check" -ForegroundColor Cyan
Write-Host "  Root: $repoRoot" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$passCount = 0
$failCount = 0

function Assert-Check {
    param([bool]$Condition, [string]$Message)
    if ($Condition) {
        Write-Host "  [PASS] $Message" -ForegroundColor Green
        $script:passCount++
    } else {
        Write-Host "  [FAIL] $Message" -ForegroundColor Red
        $script:failCount++
    }
}

# 1. Check skills.json
$skillsJson = Join-Path $repoRoot "skills.json"
Assert-Check (Test-Path $skillsJson) "skills.json exists"
if (Test-Path $skillsJson) {
    try {
        $json = Get-Content $skillsJson -Raw | ConvertFrom-Json
        Assert-Check ($null -ne $json.entries) "skills.json contains valid entries"
    } catch {
        Assert-Check $false "skills.json is valid JSON"
    }
}

# 2. Check rules
$rulesDir = Join-Path $repoRoot "rules"
$commonRule = Join-Path $rulesDir "common.md"
$gitRule = Join-Path $rulesDir "git.md"
Assert-Check (Test-Path $commonRule) "rules/common.md exists"
Assert-Check (Test-Path $gitRule) "rules/git.md exists"

# 3. Check skills
$skillsDir = Join-Path $repoRoot "skills"
$skillDirs = Get-ChildItem -Path $skillsDir -Directory
Assert-Check ($skillDirs.Count -gt 0) "Skills discovered (Count: $($skillDirs.Count))"

foreach ($sd in $skillDirs) {
    $skillMd = Join-Path $sd.FullName "SKILL.md"
    if (Test-Path $skillMd) {
        $text = Get-Content $skillMd -Raw -Encoding UTF8
        $hasName = $text -match "name:\s*[\w\-]+"
        $hasDesc = $text -match "description:\s*[\S\s]+"
        Assert-Check ($hasName -and $hasDesc) "Skill [$($sd.Name)] has valid YAML Frontmatter"
    } else {
        Assert-Check $false "Skill [$($sd.Name)] missing SKILL.md"
    }
}

# 4. Check lockfile
$lockFile = Join-Path $repoRoot ".skill-lock.json"
Assert-Check (Test-Path $lockFile) ".skill-lock.json exists"

Write-Host "=================================================" -ForegroundColor Cyan
if ($failCount -eq 0) {
    Write-Host "  All Checks Passed! (PASS: $passCount, FAIL: 0)" -ForegroundColor Green
    Write-Host "  Repository is healthy and ready for production." -ForegroundColor Green
} else {
    Write-Host "  Check Failed! (PASS: $passCount, FAIL: $failCount)" -ForegroundColor Red
}
Write-Host "=================================================" -ForegroundColor Cyan
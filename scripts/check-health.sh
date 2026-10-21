#!/usr/bin/env bash
# team-agent-standards 规范健康自检工具

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "================================================="
echo "  team-agent-standards 规范健康自检"
echo "  检查根目录: $REPO_ROOT"
echo "================================================="

PASS_COUNT=0
FAIL_COUNT=0

assert_check() {
    local condition=$1
    local message=$2
    if [ "$condition" -eq 0 ]; then
        echo "  [✓ PASS] $message"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo "  [✗ FAIL] $message"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

# 1. 检查 skills 核心通用技能目录
if [ -d "$REPO_ROOT/skills" ]; then
    assert_check 0 "skills 通用技能目录存在"
else
    assert_check 1 "skills 通用技能目录缺失"
fi

# 2. 检查规则
for rule_file in "agent.md" "common.md" "testing.md" "git.md"; do
    if [ -f "$REPO_ROOT/rules/$rule_file" ]; then
        assert_check 0 "rules/$rule_file 存在"
    else
        assert_check 1 "rules/$rule_file 缺失"
    fi
done

# 3. 检查自研规范模板（处于 templates 隔离目录，避免污染运行时）
if [ -f "$REPO_ROOT/templates/skill-template/SKILL.md" ]; then
    assert_check 0 "templates/skill-template/SKILL.md 模板存在且已正确隔离"
else
    assert_check 1 "templates/skill-template/SKILL.md 模板缺失"
fi

# 4. 检查运行时技能
SKILLS_DIR="$REPO_ROOT/skills"
for dir in "$SKILLS_DIR"/*/; do
    if [ -d "$dir" ]; then
        name=$(basename "$dir")
        if [ -f "$dir/SKILL.md" ]; then
            if grep -q "name:" "$dir/SKILL.md" && grep -q "description:" "$dir/SKILL.md"; then
                assert_check 0 "技能 [$name] Frontmatter 校验通过"
            else
                assert_check 1 "技能 [$name] 缺少 name 或 description"
            fi
        else
            assert_check 1 "技能 [$name] 缺失 SKILL.md"
        fi
    fi
done

# 5. 检查全仓库文档与规则中是否残留硬编码本地绝对路径 (No Hardcoded Absolute Paths)
ABS_PATH_FOUND=0
for scan_file in "$REPO_ROOT/README.md" "$REPO_ROOT"/rules/*.md "$REPO_ROOT"/docs/*.md; do
    if [ -f "$scan_file" ]; then
        # 扫描真实 Markdown 链接中是否使用了 file:/// 或驱动器盘符绝对路径（排除教学反例示范）
        if grep -n -E '\]\((file:///|[a-zA-Z]:/)' "$scan_file" | grep -v "developer" | grep -v "username" >/dev/null 2>&1; then
            echo "  [✗ FAIL] 文件 $(basename "$scan_file") 中检测到硬编码绝对路径链接"
            ABS_PATH_FOUND=1
        fi
    fi
done

if [ "$ABS_PATH_FOUND" -eq 0 ]; then
    assert_check 0 "全仓库文档与规则中无残留硬编码本地绝对路径"
else
    assert_check 1 "检测到残留硬编码绝对路径链接，请修复为相对路径"
fi


echo "================================================="
if [ "$FAIL_COUNT" -eq 0 ]; then
    echo "  自检全部通过！(PASS: $PASS_COUNT, FAIL: 0)"
    echo "  本仓库处于健康完备状态，可直接投入生产使用。"
else
    echo "  自检发现异常！(PASS: $PASS_COUNT, FAIL: $FAIL_COUNT)"
fi
echo "================================================="

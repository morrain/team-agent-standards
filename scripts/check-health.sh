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

# 1. 检查 skills.json
if [ -f "$REPO_ROOT/skills.json" ]; then
    assert_check 0 "skills.json 配置文件存在"
else
    assert_check 1 "skills.json 缺失"
fi

# 2. 检查规则
if [ -f "$REPO_ROOT/rules/common.md" ]; then
    assert_check 0 "rules/common.md 存在"
else
    assert_check 1 "rules/common.md 缺失"
fi

if [ -f "$REPO_ROOT/rules/git.md" ]; then
    assert_check 0 "rules/git.md 存在"
else
    assert_check 1 "rules/git.md 缺失"
fi

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

echo "================================================="
if [ "$FAIL_COUNT" -eq 0 ]; then
    echo "  自检全部通过！(PASS: $PASS_COUNT, FAIL: 0)"
    echo "  本仓库处于健康完备状态，可直接投入生产使用。"
else
    echo "  自检发现异常！(PASS: $PASS_COUNT, FAIL: $FAIL_COUNT)"
fi
echo "================================================="

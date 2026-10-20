#!/usr/bin/env bash
# 一键创建自研技能脚手架工具 (Scaffold for new custom skill)
# 用法: bash ./scripts/new-skill.sh <skill-name>

set -e

SKILL_NAME="$1"

if [ -z "$SKILL_NAME" ]; then
    echo "================================================="
    echo "  错误：未指定技能名称"
    echo "  用法: bash ./scripts/new-skill.sh <skill-name>"
    echo "  示例: bash ./scripts/new-skill.sh api-mock-generator"
    echo "================================================="
    exit 1
fi

# 校验技能命名规范：小写字母、数字及连字符
if ! [[ "$SKILL_NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    echo "错误：技能名称必须遵循小写连字符命名规范（如 my-awesome-skill）"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATE_DIR="$REPO_ROOT/templates/skill-template"
TARGET_DIR="$REPO_ROOT/skills/$SKILL_NAME"

if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "错误：模板目录不存在: $TEMPLATE_DIR"
    exit 1
fi

if [ -d "$TARGET_DIR" ]; then
    echo "错误：技能目录已存在，请勿重复创建: $TARGET_DIR"
    exit 1
fi

echo "================================================="
echo "  正在基于标准模板创建新技能: $SKILL_NAME"
echo "  目标目录: $TARGET_DIR"
echo "================================================="

# 复制模板
cp -r "$TEMPLATE_DIR" "$TARGET_DIR"

# 替换占位符
SKILL_MD="$TARGET_DIR/SKILL.md"
GUIDE_MD="$TARGET_DIR/references/guide.md"

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/{{SKILL_NAME}}/$SKILL_NAME/g" "$SKILL_MD"
    sed -i '' "s/{{SKILL_TITLE}}/$SKILL_NAME/g" "$SKILL_MD"
    sed -i '' "s/{{SKILL_TITLE}}/$SKILL_NAME/g" "$GUIDE_MD"
else
    sed -i "s/{{SKILL_NAME}}/$SKILL_NAME/g" "$SKILL_MD"
    sed -i "s/{{SKILL_TITLE}}/$SKILL_NAME/g" "$SKILL_MD"
    sed -i "s/{{SKILL_TITLE}}/$SKILL_NAME/g" "$GUIDE_MD"
fi

echo ""
echo "================================================="
echo "  ✓ 技能脚手架创建成功！"
echo "================================================="
echo "接下来你可以："
echo "  1. 编辑技能主说明：skills/$SKILL_NAME/SKILL.md"
echo "     - 完善 description（决定 Agent 何时激活本技能）"
echo "     - 编写标准执行流程 SOP"
echo "  2. 运行健康检查验证格式："
echo "     bash ./scripts/check-health.sh"
echo "  3. 验证无误后提交 Git PR 即可发布！"
echo ""

#!/usr/bin/env bash
# 团队第三方开源技能管理辅助工具
# 用法: ./manage-skills.sh [list|find|add|update|audit] [package]

set -e

ACTION="${1:-list}"
PACKAGE="$2"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$REPO_ROOT/skills"

cd "$REPO_ROOT"

case "$ACTION" in
    "list")
        echo "=== 当前 team-agent-standards 已安装技能列表 ==="
        for dir in "$SKILLS_DIR"/*/; do
            if [ -d "$dir" ] && [ -f "$dir/SKILL.md" ]; then
                name=$(basename "$dir")
                echo "• $name"
            fi
        done
        ;;
    "find")
        if [ -z "$PACKAGE" ]; then
            echo "用法: ./manage-skills.sh find <关键词>"
            exit 1
        fi
        npx skills find "$PACKAGE"
        ;;
    "add")
        if [ -z "$PACKAGE" ]; then
            echo "用法: ./manage-skills.sh add <包名或GitHub地址>"
            exit 1
        fi
        echo "正在安装第三方技能: $PACKAGE..."
        npx skills add "$PACKAGE" -y --copy
        echo "[✓] 安装完成！请检查新增内容并提交至 Git"
        ;;
    "update")
        echo "正在拉取所有第三方技能的上游更新..."
        npx skills update -y
        echo "[✓] 更新完成！建议使用 ./manage-skills.sh audit 审查变更"
        ;;
    "audit")
        echo "=== 检查工作区代码变动与安全审计 (git diff) ==="
        git status -s
        echo "---------------------------------------------"
        git diff --stat
        ;;
    *)
        echo "未知操作: $ACTION (支持: list, find, add, update, audit)"
        exit 1
        ;;
esac

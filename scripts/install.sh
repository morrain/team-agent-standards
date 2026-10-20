#!/usr/bin/env bash
# 团队新成员一键安装 team-agent-standards
# 用法: curl -fsSL <url>/install.sh | bash

set -e

REPO_URL="${REPO_URL:-git@git.internal.company.com:platform/team-agent-standards.git}"
CURRENT_DIR="$(pwd)"
TARGET_AGENT_DIR="$CURRENT_DIR/.agents"

echo "================================================="
echo "  team-agent-standards 团队一键安装工具"
echo "  工作区根目录: $CURRENT_DIR"
echo "================================================="

if [ -d "$TARGET_AGENT_DIR" ]; then
    echo "[!] 检测到 .agents 目录已存在，正在拉取最新版本..."
    cd "$TARGET_AGENT_DIR"
    git pull
    echo "[✓] 规范库已更新至最新状态！"
else
    echo "[*] 正在克隆团队规范库至 .agents..."
    git clone "$REPO_URL" "$TARGET_AGENT_DIR"
    echo "[✓] 规范库克隆成功！"
fi

echo ""
echo "安装完成！接下来可以在任意子项目中运行接入脚本："
echo "  cd my-subproject"
echo "  ../.agents/scripts/init-subproject.sh"
echo ""

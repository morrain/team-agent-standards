#!/usr/bin/env bash
# 一键同步更新 team-agent-standards 规范库

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "================================================="
echo "  正在更新团队 Agent 规范库..."
echo "  仓库目录: $REPO_ROOT"
echo "================================================="

cd "$REPO_ROOT"
git pull
echo "[✓] 规范库拉取最新完成！"

if [ -f "$SCRIPT_DIR/check-health.sh" ]; then
    bash "$SCRIPT_DIR/check-health.sh"
fi

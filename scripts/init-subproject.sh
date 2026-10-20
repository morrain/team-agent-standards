#!/usr/bin/env bash
# 一键为业务子项目接入团队 Agent 规范 (team-agent-standards)
# 用法: ../.agents/scripts/init-subproject.sh [目标目录]

set -e

TARGET_DIR="${1:-$(pwd)}"
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

echo "================================================="
echo "  正在为子项目配置 team-agent-standards 规范"
echo "  目标路径: $TARGET_DIR"
echo "================================================="

# 1. 创建子仓库 .agents 目录
AGENT_DIR="$TARGET_DIR/.agents"
if [ ! -d "$AGENT_DIR" ]; then
    mkdir -p "$AGENT_DIR"
    echo "[+] 创建子项目配置目录: $AGENT_DIR"
fi

# 2. 生成 .agents/skills.json
SKILLS_JSON="$AGENT_DIR/skills.json"
cat << 'EOF' > "$SKILLS_JSON"
{
  "$schema": "https://antigravity.google/schemas/skills-config.json",
  "inherits": [
    {
      "path": "../.agents/skills.json"
    }
  ]
}
EOF
echo "[+] 写入通用技能继承配置: $SKILLS_JSON"

# 3. 生成或检查 AGENTS.md
AGENTS_MD="$TARGET_DIR/AGENTS.md"
if [ ! -f "$AGENTS_MD" ]; then
    cat << 'EOF' > "$AGENTS_MD"
# Project Guidelines

@[通用编码红线](../.agents/rules/common.md)
@[Git提交规范](../.agents/rules/git.md)

## 本项目专属规则
<!-- 在此处添加本仓库特有的业务规则、框架约定或环境变量要求 -->
EOF
    echo "[+] 创建规则配置文件: $AGENTS_MD"
else
    if ! grep -q "\.\./\.agents/rules/common\.md" "$AGENTS_MD"; then
        TMP_FILE=$(mktemp)
        cat << 'EOF' > "$TMP_FILE"
# Project Guidelines

@[通用编码红线](../.agents/rules/common.md)
@[Git提交规范](../.agents/rules/git.md)

EOF
        cat "$AGENTS_MD" >> "$TMP_FILE"
        mv "$TMP_FILE" "$AGENTS_MD"
        echo "[*] 已将通用规范引用注入至现有 AGENTS.md"
    else
        echo "[✓] 现有 AGENTS.md 已包含通用规范引用，无需修改"
    fi
fi

echo ""
echo "================================================="
echo "  ✓ 子项目规范接入完成！"
echo "================================================="
echo "后续步骤："
echo "  1. 提交接入配置到子仓库："
echo "     git add .agents/skills.json AGENTS.md"
echo "     git commit -m 'chore: enable team-agent-standards'"
echo "  2. 在聊天窗口即可使用 /grill-me, /to-spec, /tdd 等全部团队技能！"
echo ""

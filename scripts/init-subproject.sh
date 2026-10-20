#!/usr/bin/env bash
# 一键为业务子项目接入团队 Agent 规范 (team-agent-standards)
# 用法: ../.agents/scripts/init-subproject.sh [目标目录]
# 支持已有 skills.json 无损合并与已有 AGENTS.md / GEMINI.md 安全注入

set -e

TARGET_DIR="${1:-$(pwd)}"
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

echo "================================================="
echo "  正在为子项目配置 team-agent-standards 规范"
echo "  目标路径: $TARGET_DIR"
echo "================================================="

# 1. 确保子仓库 .agents 目录存在
AGENT_DIR="$TARGET_DIR/.agents"
if [ ! -d "$AGENT_DIR" ]; then
    mkdir -p "$AGENT_DIR"
    echo "[+] 创建子项目配置目录: $AGENT_DIR"
fi

# 2. 处理 .agents/skills.json（支持无损合并）
SKILLS_JSON="$AGENT_DIR/skills.json"
INHERIT_PATH="../.agents/skills.json"

if [ ! -f "$SKILLS_JSON" ]; then
    cat << EOF > "$SKILLS_JSON"
{
  "inherits": [
    {
      "path": "$INHERIT_PATH"
    }
  ]
}
EOF
    echo "[+] 新建通用技能继承配置: $SKILLS_JSON"
else
    # 检查是否已包含继承路径
    if grep -q "\.\./\.agents/skills\.json" "$SKILLS_JSON" 2>/dev/null; then
        echo "[✓] 现有 .agents/skills.json 已包含通用规范继承，跳过修改"
    else
        # 使用 node 安全合并 JSON，保留原有的 entries、exclude 等配置
        if command -v node >/dev/null 2>&1; then
            node -e "
                const fs = require('fs');
                const file = process.argv[1];
                let json = {};
                try {
                    let raw = fs.readFileSync(file, 'utf8');
                    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
                    json = JSON.parse(raw);
                } catch(e) {
                    console.error('JSON解析异常，重置格式:', e.message);
                    json = {};
                }
                if (!Array.isArray(json.inherits)) {
                    json.inherits = [];
                }
                const exists = json.inherits.some(item => item && item.path === '$INHERIT_PATH');
                if (!exists) {
                    json.inherits.unshift({ path: '$INHERIT_PATH' });
                }
                fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
            " "$SKILLS_JSON"
            echo "[*] 已成功将通用继承路径合并进现有 skills.json（保留子项目原有配置）"
        else
            # 若无 node，使用文本插入兜底
            TMP_JSON=$(mktemp)
            awk '
                BEGIN { inserted = 0 }
                /^[[:space:]]*"inherits"[[:space:]]*:[[:space:]]*\[/ {
                    print $0;
                    print "    { \"path\": \"'$INHERIT_PATH'\" },";
                    inserted = 1;
                    next;
                }
                /^[[:space:]]*\{/ && !inserted {
                    print $0;
                    print "  \"inherits\": [ { \"path\": \"'$INHERIT_PATH'\" } ],";
                    inserted = 1;
                    next;
                }
                { print }
            ' "$SKILLS_JSON" > "$TMP_JSON"
            mv "$TMP_JSON" "$SKILLS_JSON"
            echo "[*] 已注入继承路径进现有 skills.json"
        fi
    fi
fi

# 3. 处理规则文件（支持大小写 AGENTS.md / GEMINI.md 智能识别与无损追加）
EXISTING_RULE_FILE=""
for candidate in "AGENTS.md" "Agents.md" "agents.md" "GEMINI.md" "gemini.md"; do
    if [ -f "$TARGET_DIR/$candidate" ]; then
        EXISTING_RULE_FILE="$TARGET_DIR/$candidate"
        break
    fi
done

if [ -z "$EXISTING_RULE_FILE" ]; then
    # 不存在任何规则文件，创建标准 AGENTS.md
    NEW_AGENTS_MD="$TARGET_DIR/AGENTS.md"
    cat << 'EOF' > "$NEW_AGENTS_MD"
# Project Guidelines

@[通用编码红线](../.agents/rules/common.md)
@[Git提交规范](../.agents/rules/git.md)

## 本项目专属规则
<!-- 在此处添加本仓库特有的业务规则、框架约定或环境变量要求 -->
EOF
    echo "[+] 新建规则配置文件: $NEW_AGENTS_MD"
else
    # 已存在规则文件，检查是否已引用
    if grep -q "\.\./\.agents/rules/common\.md" "$EXISTING_RULE_FILE"; then
        echo "[✓] 现有规则文件 $(basename "$EXISTING_RULE_FILE") 已包含通用规范引用，无需修改"
    else
        # 针对已有文件，仅注入引用指令，绝不重复生成标题
        TMP_RULE=$(mktemp)
        if head -n 1 "$EXISTING_RULE_FILE" | grep -q "^# "; then
            # 第一行是一级标题：保留原标题，将引用插入在标题正下方
            head -n 1 "$EXISTING_RULE_FILE" > "$TMP_RULE"
            echo "" >> "$TMP_RULE"
            echo "@[通用编码红线](../.agents/rules/common.md)" >> "$TMP_RULE"
            echo "@[Git提交规范](../.agents/rules/git.md)" >> "$TMP_RULE"
            echo "" >> "$TMP_RULE"
            tail -n +2 "$EXISTING_RULE_FILE" >> "$TMP_RULE"
        else
            # 第一行不是标题：直接在文件顶部插入引用
            echo "@[通用编码红线](../.agents/rules/common.md)" > "$TMP_RULE"
            echo "@[Git提交规范](../.agents/rules/git.md)" >> "$TMP_RULE"
            echo "" >> "$TMP_RULE"
            cat "$EXISTING_RULE_FILE" >> "$TMP_RULE"
        fi
        mv "$TMP_RULE" "$EXISTING_RULE_FILE"
        echo "[*] 已将通用规范引用无损注入至现有 $(basename "$EXISTING_RULE_FILE")（保留项目原有规则与标题）"
    fi
fi

echo ""
echo "================================================="
echo "  ✓ 子项目规范接入完成！"
echo "================================================="
echo "后续步骤："
echo "  1. 提交接入配置到子仓库 Git："
echo "     git add .agents/skills.json $([ -n "$EXISTING_RULE_FILE" ] && basename "$EXISTING_RULE_FILE" || echo "AGENTS.md")"
echo "     git commit -m 'chore: enable team-agent-standards'"
echo "  2. 即可在当前子项目中无缝使用团队全部通用技能与规则！"
echo ""

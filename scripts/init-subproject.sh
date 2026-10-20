#!/usr/bin/env bash
# 一键为业务子项目接入团队 Agent 规范 (team-agent-standards)
# 用法: ../.agents/scripts/init-subproject.sh [目标目录]
# 支持已有 skills.json 无损合并与已有 AGENTS.md / GEMINI.md 安全注入

set -e

TARGET_DIR="${1:-$(pwd)}"
if [ ! -d "$TARGET_DIR" ]; then
    mkdir -p "$TARGET_DIR"
fi
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
TEAM_SKILLS_PATH="../.agents/skills"

if [ ! -f "$SKILLS_JSON" ]; then
    cat << EOF > "$SKILLS_JSON"
{
  "entries": [
    {
      "path": "$TEAM_SKILLS_PATH"
    }
  ]
}
EOF
    echo "[+] 新建通用技能配置: $SKILLS_JSON"
else
    # 检查是否已包含通用技能路径，且不存在旧版无效 inherits
    HAS_NEW_ENTRY=$(grep -q "\.\./\.agents/skills\"" "$SKILLS_JSON" 2>/dev/null && echo "1" || echo "0")
    HAS_OLD_INHERIT=$(grep -q "\.\./\.agents/skills\.json" "$SKILLS_JSON" 2>/dev/null && echo "1" || echo "0")

    if [ "$HAS_NEW_ENTRY" = "1" ] && [ "$HAS_OLD_INHERIT" = "0" ]; then
        echo "[✓] 现有 .agents/skills.json 已包含通用规范配置，跳过修改"
    else
        # 使用 node 安全合并 JSON，保留原有的 entries、exclude 等配置，并平滑迁移旧版 inherits
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
                if (!Array.isArray(json.entries)) {
                    json.entries = [];
                }
                const exists = json.entries.some(item => item && item.path === '$TEAM_SKILLS_PATH');
                if (!exists) {
                    json.entries.unshift({ path: '$TEAM_SKILLS_PATH' });
                }
                // 平滑清理历史遗留的无效 inherits (../.agents/skills.json)
                if (Array.isArray(json.inherits)) {
                    json.inherits = json.inherits.filter(item => !(item && item.path === '../.agents/skills.json'));
                    if (json.inherits.length === 0) {
                        delete json.inherits;
                    }
                }
                fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
            " "$SKILLS_JSON"
            echo "[*] 已成功将通用技能路径合并进现有 skills.json（保留子项目原有配置）"
        else
            # 若无 node，使用文本插入兜底
            TMP_JSON=$(mktemp)
            awk '
                BEGIN { inserted = 0 }
                /^[[:space:]]*"entries"[[:space:]]*:[[:space:]]*\[/ {
                    print $0;
                    print "    { \"path\": \"'$TEAM_SKILLS_PATH'\" },";
                    inserted = 1;
                    next;
                }
                /^[[:space:]]*\{/ && !inserted {
                    print $0;
                    print "  \"entries\": [ { \"path\": \"'$TEAM_SKILLS_PATH'\" } ],";
                    inserted = 1;
                    next;
                }
                { print }
            ' "$SKILLS_JSON" > "$TMP_JSON"
            mv "$TMP_JSON" "$SKILLS_JSON"
            echo "[*] 已注入通用技能路径进现有 skills.json"
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

@[Agent行为准则](../.agents/rules/agent.md)
@[通用编码红线](../.agents/rules/common.md)
@[自动化测试规范](../.agents/rules/testing.md)
@[Git提交规范](../.agents/rules/git.md)

## 本项目专属规则
<!-- 在此处添加本仓库特有的业务规则、框架约定或环境变量要求 -->
EOF
    echo "[+] 新建规则配置文件: $NEW_AGENTS_MD"
else
    # 已存在规则文件，检查缺失的通用规范并无损增量注入
    RULES_MAP=(
        "agent.md:@[Agent行为准则](../.agents/rules/agent.md)"
        "common.md:@[通用编码红线](../.agents/rules/common.md)"
        "testing.md:@[自动化测试规范](../.agents/rules/testing.md)"
        "git.md:@[Git提交规范](../.agents/rules/git.md)"
    )

    MISSING_RULES=()
    for item in "${RULES_MAP[@]}"; do
        file_key="${item%%:*}"
        rule_tag="${item#*:}"
        if ! grep -q "\.\./\.agents/rules/$file_key" "$EXISTING_RULE_FILE"; then
            MISSING_RULES+=("$rule_tag")
        fi
    done

    if [ "${#MISSING_RULES[@]}" -eq 0 ]; then
        echo "[✓] 现有规则文件 $(basename "$EXISTING_RULE_FILE") 已包含全部通用规范引用，无需修改"
    else
        TMP_RULE=$(mktemp)
        if head -n 1 "$EXISTING_RULE_FILE" | grep -q "^# "; then
            # 第一行是一级标题：保留原标题，将缺失规则插入在标题正下方
            head -n 1 "$EXISTING_RULE_FILE" > "$TMP_RULE"
            echo "" >> "$TMP_RULE"
            for rule in "${MISSING_RULES[@]}"; do
                echo "$rule" >> "$TMP_RULE"
            done
            echo "" >> "$TMP_RULE"
            tail -n +2 "$EXISTING_RULE_FILE" >> "$TMP_RULE"
        else
            # 第一行不是标题：直接在文件顶部插入规则
            for rule in "${MISSING_RULES[@]}"; do
                echo "$rule" >> "$TMP_RULE"
            done
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

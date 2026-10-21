#!/usr/bin/env bash
# 一键为业务项目接入团队 Agent 规范 (team-agent-standards)
# 用法: ../.agents/scripts/init-project.sh [目标目录]
# 支持已有 skills.json 无损合并与已有 AGENTS.md / GEMINI.md 安全注入

set -e

TARGET_DIR="${1:-$(pwd)}"
if [ ! -d "$TARGET_DIR" ]; then
    mkdir -p "$TARGET_DIR"
fi
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

echo "================================================="
echo "  正在为业务项目配置 team-agent-standards 规范"
echo "  目标路径: $TARGET_DIR"
echo "================================================="

# 1. 确保业务项目 .agents 目录存在
AGENT_DIR="$TARGET_DIR/.agents"
if [ ! -d "$AGENT_DIR" ]; then
    mkdir -p "$AGENT_DIR"
    echo "[+] 创建业务项目配置目录: $AGENT_DIR"
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
            echo "[*] 已成功将通用技能路径合并进现有 skills.json（保留业务项目原有配置）"
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

# 4. 智能静默配置 Issue Tracker 与 Domain 架构骨架 (Matt Pocock Skills Zero-Config)

DOCS_AGENTS_DIR="$TARGET_DIR/docs/agents"
if [ ! -d "$DOCS_AGENTS_DIR" ]; then
    mkdir -p "$DOCS_AGENTS_DIR"
fi

ISSUE_TRACKER_FILE="$DOCS_AGENTS_DIR/issue-tracker.md"
if [ ! -f "$ISSUE_TRACKER_FILE" ]; then
    GIT_REMOTE_URL=$(git -C "$TARGET_DIR" remote get-url origin 2>/dev/null || true)
    if echo "$GIT_REMOTE_URL" | grep -qi "github.com"; then
        cat << 'EOF' > "$ISSUE_TRACKER_FILE"
# Issue Tracker

Issues live in GitHub Issues for this repo.

## Operations

- Fetch an issue: `gh issue view <number> --json title,body,comments`
- Create an issue: `gh issue create --title "<title>" --body "<body>" --label "<labels>"`
- Close an issue: `gh issue close <number>`
- List ready issues: `gh issue list --label "ready-for-agent"`
EOF
        echo "[+] 智能识别 GitHub 仓库，静默预置 Issue Tracker 配置: docs/agents/issue-tracker.md"
    elif echo "$GIT_REMOTE_URL" | grep -qi "gitlab"; then
        cat << 'EOF' > "$ISSUE_TRACKER_FILE"
# Issue Tracker

Issues live in GitLab Issues for this repo.

## Operations

- Fetch an issue: `glab issue view <id>`
- Create an issue: `glab issue create --title "<title>" --description "<body>" --label "<labels>"`
- Close an issue: `glab issue close <id>`
- List ready issues: `glab issue list --label "ready-for-agent"`
EOF
        echo "[+] 智能识别 GitLab 仓库，静默预置 Issue Tracker 配置: docs/agents/issue-tracker.md"
    else
        cat << 'EOF' > "$ISSUE_TRACKER_FILE"
# Issue Tracker

Issues live locally in this repo as markdown files under `.scratch/<feature-slug>/issues/` or `docs/tickets/`.

## Operations

- Create a ticket: write `.scratch/<feature-slug>/issues/<NN>-<slug>.md` using the ticket template.
- Read a ticket: read `.scratch/<feature-slug>/issues/<NN>-<slug>.md`.
- Update/Close a ticket: update the status line in the ticket file to `Status: closed` or `Status: completed`.
EOF
        echo "[+] 预置本地 Markdown 模式 Issue Tracker 配置: docs/agents/issue-tracker.md"
    fi
else
    echo "[✓] 现有 docs/agents/issue-tracker.md 已存在，跳过覆盖"
fi

TRIAGE_LABELS_FILE="$DOCS_AGENTS_DIR/triage-labels.md"
if [ ! -f "$TRIAGE_LABELS_FILE" ]; then
    cat << 'EOF' > "$TRIAGE_LABELS_FILE"
# Triage Labels

- `ready-for-agent`: ready for an agent to pick up and implement
- `in-progress`: currently being worked on
- `blocked`: blocked by other tickets or questions
- `wontfix`: will not implement
EOF
    echo "[+] 静默预置标签配置: docs/agents/triage-labels.md"
fi

DOMAIN_DOCS_FILE="$DOCS_AGENTS_DIR/domain.md"
if [ ! -f "$DOMAIN_DOCS_FILE" ]; then
    cat << 'EOF' > "$DOMAIN_DOCS_FILE"
# Domain Documentation

- Vocabulary lives in `GLOSSARY.md` at repo root.
- Architectural decisions live in `docs/adr/`.
EOF
    echo "[+] 静默预置领域文档定位: docs/agents/domain.md"
fi

# 确保 GLOSSARY.md 与 docs/adr/ 骨架存在
if [ ! -f "$TARGET_DIR/GLOSSARY.md" ]; then
    cat << 'EOF' > "$TARGET_DIR/GLOSSARY.md"
# Project Glossary

Canonical domain vocabulary and terminology for this repository.
EOF
    echo "[+] 初始化项目业务词汇表骨架: GLOSSARY.md"
fi

if [ ! -d "$TARGET_DIR/docs/adr" ]; then
    mkdir -p "$TARGET_DIR/docs/adr"
    echo "[+] 初始化架构决策记录目录: docs/adr/"
fi

echo ""
echo "================================================="
echo "  ✓ 业务项目规范接入完成！"
echo "================================================="
echo "后续步骤："
echo "  1. 提交接入配置到业务仓库 Git："
echo "     git add .agents/ docs/agents/ GLOSSARY.md $([ -n "$EXISTING_RULE_FILE" ] && basename "$EXISTING_RULE_FILE" || echo "AGENTS.md")"
echo "     git commit -m 'chore: enable team-agent-standards'"
echo "  2. 即可在当前业务项目中无缝使用团队全部 13 个通用技能与 4 大规则！"
echo ""


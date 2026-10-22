#!/usr/bin/env bash
# 团队第三方开源技能管理辅助工具
# 用法: ./scripts/manage-skills.sh [list|find|add|remove|update|audit|help] [package/skill] [options...]

set -e

ACTION="${1:-list}"
PACKAGE="$2"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$REPO_ROOT/skills"

cd "$REPO_ROOT"

# 网络与代理智能适配（解决国内直接访问 GitHub 容易遇到 Connection was reset 的问题）
if [ -z "$http_proxy" ] && [ -z "$HTTP_PROXY" ] && [ -z "$(git config --get http.proxy 2>/dev/null)" ]; then
    if command -v reg.exe &>/dev/null; then
        PROXY_ENABLE=$(reg.exe query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" //v ProxyEnable 2>/dev/null | grep -i "ProxyEnable" | grep -i "0x1")
        if [ -n "$PROXY_ENABLE" ]; then
            WIN_PROXY=$(reg.exe query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" //v ProxyServer 2>/dev/null | grep -i "ProxyServer" | awk '{print $NF}' | tr -d '\r\n')
            if [ -n "$WIN_PROXY" ]; then
                [[ "$WIN_PROXY" != http* ]] && WIN_PROXY="http://$WIN_PROXY"
                echo "[代理适配] 检测到系统网络代理 ($WIN_PROXY)，已自动启用以保证 GitHub 访问正常..."
                export http_proxy="$WIN_PROXY"
                export https_proxy="$WIN_PROXY"
                export HTTP_PROXY="$WIN_PROXY"
                export HTTPS_PROXY="$WIN_PROXY"
            fi
        fi
    fi
fi

# 自动归一化：若 skills CLI 安装到了 .agents/skills/，自动移至项目标准的 skills/ 目录
sync_installed_skills() {
    if [ -d "$REPO_ROOT/.agents/skills" ]; then
        for item in "$REPO_ROOT/.agents/skills"/*; do
            if [ -d "$item" ]; then
                pname=$(basename "$item")
                echo "[+] 同步规范目录: .agents/skills/$pname -> skills/$pname"
                rm -rf "$SKILLS_DIR/$pname"
                # 在 Windows 环境下，直接 mv 刚写入的目录容易因文件句柄未释放触发 Permission Denied，优先采用复制后清理策略
                cp -rf "$item" "$SKILLS_DIR/$pname" 2>/dev/null || mv "$item" "$SKILLS_DIR/$pname"
                rm -rf "$item"
            fi
        done
        rm -rf "$REPO_ROOT/.agents"
    fi
}

case "$ACTION" in
    "list"|"ls")
        echo "=== 当前 team-agent-standards 已安装技能列表 ==="
        count=0
        for dir in "$SKILLS_DIR"/*/; do
            if [ -d "$dir" ] && [ -f "$dir/SKILL.md" ]; then
                name=$(basename "$dir")
                echo "• $name"
                count=$((count + 1))
            fi
        done
        echo "总计: $count 个核心技能"
        ;;
    "find")
        if [ -z "$PACKAGE" ]; then
            echo "用法: ./scripts/manage-skills.sh find <关键词>"
            exit 1
        fi
        npx skills find "$PACKAGE"
        ;;
    "add")
        if [ -z "$PACKAGE" ]; then
            echo "用法: ./scripts/manage-skills.sh add <仓库包名或GitHub地址> [选项...]"
            echo ""
            echo "示例 1 (指定仓库并安装单个技能):"
            echo "  ./scripts/manage-skills.sh add mattpocock/skills --skill wayfinder"
            echo "示例 2 (直接提供技能名，自动适配默认开源套件):"
            echo "  ./scripts/manage-skills.sh add wayfinder"
            echo "示例 3 (全量安装某个技能包):"
            echo "  ./scripts/manage-skills.sh add vercel-labs/agent-skills"
            exit 1
        fi

        # 智能判定：如果传入的 PACKAGE 不含 '/' 且不是 URL，说明用户只传了单个技能名称
        EXTRA_ARGS=()
        if [[ "$PACKAGE" != *"/"* && "$PACKAGE" != http* && "$PACKAGE" != git* ]]; then
            SKILL_NAME="$PACKAGE"
            echo "================================================="
            echo "  [!] 检测到仅输入了技能名: '$SKILL_NAME' (缺少 owner/repo)"
            echo "  开源技能管理工具需指定所属代码仓库。"
            echo "================================================="
            if [ -t 0 ]; then
                read -p "是否尝试从通用开源库 mattpocock/skills 安装该技能 (--skill $SKILL_NAME)? [Y/n] " -r REPLY
                if [[ -z "$REPLY" || "$REPLY" =~ ^[Yy]$ ]]; then
                    PACKAGE="mattpocock/skills"
                    EXTRA_ARGS=("--skill" "$SKILL_NAME" "${@:3}")
                else
                    echo "已取消。如需从其他仓库安装，请指定仓库名: ./scripts/manage-skills.sh add <owner/repo> --skill $SKILL_NAME"
                    exit 1
                fi
            else
                echo "  自动匹配默认开源库: mattpocock/skills --skill $SKILL_NAME"
                PACKAGE="mattpocock/skills"
                EXTRA_ARGS=("--skill" "$SKILL_NAME" "${@:3}")
            fi
        else
            # 正常传入了 owner/repo 或 URL，透传后续所有剩余参数
            EXTRA_ARGS=("${@:3}")
        fi

        echo "正在安装第三方技能: $PACKAGE ${EXTRA_ARGS[*]}..."
        npx skills add "$PACKAGE" "${EXTRA_ARGS[@]}" -y --copy

        sync_installed_skills

        echo "[✓] 安装完成！"
        echo "后续提示："
        echo "  1. 运行 bash ./scripts/check-health.sh 进行格式与依赖自检"
        echo "  2. 建议在 skills-lock.json 中锁定版本 Commit"
        ;;
    "remove"|"rm")
        if [ -z "$PACKAGE" ]; then
            echo "用法: ./scripts/manage-skills.sh remove <技能名称>"
            exit 1
        fi
        TARGET_SKILL="$SKILLS_DIR/$PACKAGE"
        if [ -d "$TARGET_SKILL" ]; then
            rm -rf "$TARGET_SKILL"
            echo "[✓] 已成功移除技能: $PACKAGE"
        else
            echo "[✗] 技能不存在: $PACKAGE (查找路径: $TARGET_SKILL)"
            exit 1
        fi
        ;;
    "update")
        echo "正在拉取所有第三方技能的上游更新..."
        npx skills update -y
        sync_installed_skills
        echo "[✓] 更新完成！建议使用 ./scripts/manage-skills.sh audit 审查变更"
        ;;
    "audit")
        echo "=== 检查工作区代码变动与安全审计 (git status / diff) ==="
        git status -s
        echo "--------------------------------------------------------"
        git diff --stat
        ;;
    "help"|"-h"|"--help")
        echo "================================================="
        echo "  team-agent-standards 第三方开源技能管理工具"
        echo "================================================="
        echo "用法: ./scripts/manage-skills.sh <子命令> [参数...]"
        echo ""
        echo "子命令列表:"
        echo "  list                      列出当前已安装的所有技能"
        echo "  find <关键词>              在开源技能生态中搜索可用技能"
        echo "  add <仓库名> [选项]        从开源仓库安装技能"
        echo "    示例 1 (精准安装单个技能):"
        echo "      ./scripts/manage-skills.sh add mattpocock/skills --skill wayfinder"
        echo "    示例 2 (简写单个技能名，自动识别并引导):"
        echo "      ./scripts/manage-skills.sh add wayfinder"
        echo "    示例 3 (全量安装某个技能包):"
        echo "      ./scripts/manage-skills.sh add vercel-labs/agent-skills"
        echo "  remove <技能名>            移除指定已安装的技能"
        echo "  update                    拉取所有已安装技能的上游更新"
        echo "  audit                     查看当前技能库的文件变动 (git status / diff)"
        echo "================================================="
        ;;
    *)
        echo "未知操作: $ACTION (输入 ./scripts/manage-skills.sh help 查看帮助)"
        exit 1
        ;;
esac

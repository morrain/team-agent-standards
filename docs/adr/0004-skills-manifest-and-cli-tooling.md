# ADR-0004: 第三方技能清单 Schema、批量精准安装与仓库质量门禁

- **Status**: Accepted
- **Date**: 2026-11-25

## Context

上游仓库（如 `mattpocock/skills`）包含大量超出团队所需的技能，直接全量安装会引入噪声，而依赖人工交互勾选则容易漏选且无法保证全团队一致性。同时，原 `scripts/*.sh` 存在跨平台失败与健康检查无法阻断 CI 的问题。

## Decision

1. **第三方技能清单 Schema（`skills-manifest.json`）**：
   - 清单支持显式技能列表（`"skills": [...]`）与可选整包（`"all": true`）两种声明方式，每条记录声明 `source`、`scope`（`global` | `project`）与 `description`。
   - 对 `mattpocock/skills` 采用显式声明原项目精选的 18 个技能（`scope: "global"`），不启用 `all`。
   - 安装时通过 `npx skills@latest add <source> --skill <s1> --skill <s2> ... -y`（`global` 追加 `-g`，可选透传 `-a <agent>`）单次批量精准安装；增量更新时仅对本地尚未安装的差集执行安装（传 `--update-skills` 时强制全量刷新）。
2. **统一 CLI 与仓库维护命令**：
   - 业务项目一行接入 / 增量更新：`npx github:<owner>/team-agent-standards`（默认执行 `init`，支持 `--update-skills`、`--skip-external`、`--entry <file>`、`--agent <name>`、`--dry-run`）。
   - 仓库维护命令：`npm run check`（严格健康自检，失败返回非零退出码）、`npm test`（基于 Node.js 内置 `node --test` 的零依赖单元测试）、`npm run new-skill -- <name>`（自研私有技能脚手架）。
3. **清理旧脚本与接入 CI 门禁**：
   - 移除原 `scripts/*.sh`（4 个 Bash 脚本）与旧版 `skills-lock.json`。
   - 新增 `.github/workflows/ci.yml`，在 Push 与 Pull Request 时自动执行 `npm run check` 与 `npm test`。
4. **GitHub 标识占位**：
   - `package.json` 包名设为 `team-agent-standards`，文档与示例中先使用 `<owner>/team-agent-standards` 占位符，待托管至目标 GitHub 仓库后替换。

## Consequences

### Positive
- 既避免安装上游仓库中的无关技能，又消除人工交互勾选带来的漏选与不一致，且单次批量传 `--skill` 大幅提升安装速度。
- 仓库自身拥有零依赖的单元测试与 CI 质量门禁，彻底杜绝文档数量漂移、坏 Frontmatter 与绝对路径泄漏。

### Negative / Trade-offs
- 上游仓库新增团队需要的新技能时，需由规范维护者在 `skills-manifest.json` 中显式追加技能名。

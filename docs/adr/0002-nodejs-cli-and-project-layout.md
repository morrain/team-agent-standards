# ADR-0002: 采用零依赖 Node.js CLI 分发与目标项目托管布局

- **Status**: Accepted
- **Date**: 2026-11-25

## Context

在 [ADR-0001](./0001-local-distribution-and-manifest-model.md) 确定改为“本地复制 + 第三方清单声明式安装”架构后，需要明确：
1. 跨平台的一行启动分发载体（解决纯 Bash 脚本在 Windows PowerShell 环境下不可用的问题）；
2. 规则文件在目标业务项目中的落盘形态与增量更新所有权边界；
3. 第三方技能的底层安装引擎；
4. 目标业务项目中 `.agents/` 资产的版本控制策略与旧版 `../.agents` 项目迁移方式。

## Decision

1. **零外部依赖 Node.js ESM CLI**：
   - 本仓库配置 `package.json` 与 `bin` 入口，支持在任意业务项目根目录通过 `npx github:<owner>/team-agent-standards`（或后续 npm 包名）一行命令执行初始化与增量更新。
   - 全面替代原 `scripts/*.sh` Bash 工具链，实现 Windows / macOS / Linux 一致体验与可单元测试性。
2. **规则托管子目录 + 入口引用**：
   - 团队静态规则复制到目标项目的 `.agents/rules/` 目录（团队托管目录，增量更新时可安全覆盖同步）。
   - 项目根目录规则入口文件（新建 `AGENTS.md`，或兼容检测已有 `AGENTS.md` / `agent.md` / `GEMINI.md` / `CLAUDE.md`）仅增量注入指向 `.agents/rules/*.md` 的引用，完整保留业务项目专属规则。
3. **第三方技能统一调用 `npx skills add`**：
   - 本仓库不再内联第三方技能源码，维护声明式清单定义 `source`、`skill`、`scope`（`global` / `project`）。
   - 初始化工具按作用域调用 `npx skills add`（`global` 传 `-g`，`project` 安装至当前项目），并支持可选 `--agent` 透传。
4. **项目级资产默认随业务仓库 Git 入库**：
   - 目标项目的 `.agents/rules/`、拷贝的私有技能及 `project` 级第三方技能默认纳入业务项目 Git 管理；`global` 级第三方技能留在开发者本机全局目录。
5. **平滑迁移旧项目与清理外部源码**：
   - 增量更新时自动检测并替换旧版 `../.agents/rules/...` 引用及 `.agents/skills.json` 中的 `../.agents/skills` 条目，保留业务自有条目。
   - 本仓库清空原有 18 个外部上游技能源码，全部迁入第三方技能清单，私有技能独立维护。

## Consequences

### Positive
- 彻底解决 Windows PowerShell 兼容性问题，与 `npx skills` 共享同一 Node.js 运行时，无需额外环境依赖。
- 业务项目 `AGENTS.md` 保持精炼，团队规则升级与业务定制彻底解耦。
- 老业务项目可零痛感从旧版 `../.agents` 模式迁移至新架构。

### Negative / Trade-offs
- 目标开发机需安装 Node.js（支持 `npx`），但这也是调用 `npx skills` 的既有前提。
- 需要为 CLI 补充完整的单元测试与健康检查门禁，确保跨平台文件合并与旧版迁移零破坏。

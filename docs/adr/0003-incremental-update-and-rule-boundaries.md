# ADR-0003: 增量更新机制、资产边界与规则优先级仲裁

- **Status**: Accepted
- **Date**: 2026-11-25

## Context

在确立零依赖 Node.js CLI 与本地化分发架构（[ADR-0002](./0002-nodejs-cli-and-project-layout.md)）后，需要明确老项目增量更新的精确边界、私有技能与第三方技能的职责解耦，以及静态规则与外部技能指令冲突时的仲裁原则。

## Decision

1. **私有技能托管与资产追踪**：
   - 本仓库 `skills/` 目录专用于存放团队自研私有技能（配合 `templates/skill-template/` 脚手架）。
   - 初始化/增量更新时将私有技能拷贝至目标项目的 `.agents/skills/<name>/`，并在目标项目写入 `.agents/.standards-manifest.json` 记录团队托管的规则与私有技能列表。
   - 增量更新覆盖团队托管项，完整保留业务项目自建的本地私有技能；团队下线的旧私有技能仅提示，不静默删除。
2. **入口文件单目标命中与零侵入原则**：
   - 检测目标项目根目录入口文件时，按 `AGENTS.md` > `agent.md` > `GEMINI.md` > `CLAUDE.md` 优先级命中第一个并增量注入 `.agents/rules/*.md` 引用；支持 `--entry <filename>` 手动指定。
   - 本工具**不负责生成** `docs/agents/*`、`GLOSSARY.md`、`docs/adr/` 等第三方技能运行所需的项目配置，该类初始化行为完全交由第三方技能自身（如 `setup-matt-pocock-skills`）处理，避免因上游技能逻辑变更导致本工具失配。
3. **第三方技能增量跳过、代理探测与容错**：
   - 重复执行增量更新时，默认检测目标路径已安装的第三方技能并跳过，保证日常更新极速；提供 `--update-skills` 强制拉取更新，提供 `--skip-external` 纯离线仅同步规则与私有技能。
   - Node.js CLI 内置 Windows 系统代理自动探测并透传给子进程；单个外部技能安装失败不阻断其余流程，最终汇总失败项与重试提示。
4. **静态规则净化与最高优先级仲裁**：
   - 清理 `rules/common.md` 中的特定业务项目案例残留。
   - 在 `rules/agent.md` 中确立最高优先级仲裁条款：当任何外部技能步骤（如自动 `git commit` / `merge`）与本团队静态 Rules 冲突时，静态 Rules 具有绝对最高优先级。

## Consequences

### Positive
- 与第三方技能的内部配置逻辑彻底解耦，上游技能演进不会破坏本初始化工具。
- 日常增量更新速度快、弱网容错强，且 100% 保护业务项目的自有规则与本地私有技能。
- 无需修改第三方技能源码即可确保团队 Git 确认红线与安全红线不被绕过。

### Negative / Trade-offs
- 新接入业务项目若需使用依赖 `docs/agents/` 的外部技能，需由开发者按提示执行一次 `/setup-matt-pocock-skills`。

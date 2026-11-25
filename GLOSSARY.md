# Project Glossary

Canonical domain vocabulary for `team-agent-standards`.

## Core Asset Types

- **Rule（静态规则）**: 常驻于编码 Agent 上下文中的工程红线与行为纪律文档（如 `agent.md`、`common.md`、`testing.md`、`git.md`）。在项目初始化或增量更新时直接复制到目标业务项目中。
- **External Skill（第三方技能）**: 来源于外部开源仓库的按需工程技能。本仓库不内联其源码，仅在第三方技能清单中声明来源、技能名与安装作用域，由初始化工具在目标环境按清单安装。
- **Private Skill（私有技能）**: 团队自研、托管于本仓库中的专属技能。在项目初始化或增量更新时直接拷贝到目标业务项目的 `.agents` 目录中。

## Distribution & Lifecycle

- **Skills Manifest（第三方技能清单）**: 本仓库维护的声明式配置文件，用于定义团队依赖的第三方技能列表及其安装作用域（全局或项目级）。
- **Install Scope（安装作用域）**: 第三方技能的安装目标位置：
  - `global`：安装到当前开发机的全局 Agent 技能目录，跨项目复用；
  - `project`：安装到当前目标业务项目的本地技能目录。
- **Incremental Update（增量更新）**: 在已初始化过、或已存在 `.agents` 目录与规则入口文件的老业务项目中重复执行初始化命令时，无损更新团队托管资产并完整保留业务项目自有配置的能力。
- **Managed Directory（托管目录）**: 目标业务项目中由本工具全权同步覆盖的目录（如 `.agents/rules/`），团队规范升级时直接覆盖同步，业务自定义内容不应写入其中。
- **Entry File（规则入口文件）**: 目标业务项目根目录供编码 Agent 读取的主规范文件（如 `AGENTS.md`、`GEMINI.md`、`CLAUDE.md`），通过引用托管目录中的规则文件，并承载业务项目专属规则。
- **Legacy Migration（旧版迁移）**: 在增量更新老业务项目时，自动识别并清理旧版跨父目录引用（`../.agents/rules/...` 及 `.agents/skills.json` 中的 `../.agents/skills`）并平滑切换为本地路径的过程。

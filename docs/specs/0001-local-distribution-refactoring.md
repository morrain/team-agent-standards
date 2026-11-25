# Spec 0001: 本地化分发架构与跨平台 CLI 重构

- **Status**: closed
- **Labels**: `completed`
- **Date**: 2026-11-25
- **ADRs**: [ADR-0001](../adr/0001-local-distribution-and-manifest-model.md), [ADR-0002](../adr/0002-nodejs-cli-and-project-layout.md), [ADR-0003](../adr/0003-incremental-update-and-rule-boundaries.md), [ADR-0004](../adr/0004-skills-manifest-and-cli-tooling.md)

---

## Problem Statement

当前 `team-agent-standards` 采用“父级兄弟目录（`../.agents`）Vendor 内联共享”架构，存在四个阻塞性工程痛点：

1. **安全沙箱阻断**：现代编码 Agent 不再允许业务项目向上级公共目录寻址加载规则与技能，`../.agents` 共享方案已不可用，且对项目目录层级形成强耦合。
2. **外部技能内联负担过重**：仓库中直接内联了 18 个外部上游技能源码，导致锁文件 Schema 漂移、上游升级维护成本高、与团队自研的 Private Skill 混杂不清。
3. **脚本工具链跨平台断裂与门禁失效**：纯 Bash 脚本在 Windows 默认 PowerShell 环境下直接失败；现有健康检查校验过浅且失败时仍返回退出码 0，无法接入 CI 阻断。
4. **文档漂移与规则冲突**：技能数量在各文档间不一致（10 / 12 / 15 / 18），静态 Rules 中混入了个别业务项目残留示例，且部分 External Skill 的自动 Git 提交指令与团队静态 Rules 的 Git 变更强确认红线存在冲突。

---

## Solution

将 `team-agent-standards` 重构为**托管于 GitHub、零外部运行时依赖的 Node.js ESM CLI 规范分发套件**，彻底废弃 `../.agents` 上级目录共享模式，按三类资产实行清晰的分发与生命周期管理：

1. **Rule（静态规则）**：保留在本仓库作为单一真理来源（SSOT），初始化或 Incremental Update 时直接复制到目标业务项目的 Managed Directory（`.agents/rules/`），并在根目录 Entry File 中增量注入本地引用。
2. **External Skill（第三方技能）**：彻底移除本仓库中的外部源码，改为维护声明式 Skills Manifest，定义每个外部来源的精确技能列表（或整包）、Install Scope（`global` / `project`）与说明；初始化时由 CLI 按差集批量调用 `npx skills@latest add` 安装。
3. **Private Skill（私有技能）**：专存于本仓库私有技能目录，初始化或 Incremental Update 时直接拷贝至目标项目的 `.agents/skills/`，并通过托管追踪清单保护业务项目自建的本地私有技能不被覆盖。
4. **一行命令接入与老项目平滑迁移**：业务项目根目录运行一行命令（`npx github:<owner>/team-agent-standards`）即可完成全新初始化、重复增量更新以及旧版 `../.agents` 引用的自动清理与迁移。
5. **内建质量门禁**：为本仓库配备严格的零依赖健康检查（`check`）、原生单元测试（`node --test`）、私有技能脚手架（`new-skill`）以及 GitHub Actions CI 工作流。

---

## User Stories

### 新业务项目初始化
1. As a 业务项目开发者, I want 在任意业务项目根目录运行一行 `npx github:<owner>/team-agent-standards` 命令, so that 无需提前克隆父级目录或安装全局工具即可完成团队规范接入。
2. As a 业务项目开发者, I want 初始化命令自动将全部团队静态 Rule 复制到当前项目的 `.agents/rules/` 目录, so that 业务项目自包含规则资产且不受沙箱跨目录限制。
3. As a 业务项目开发者, I want 当项目根目录不存在 Entry File 时初始化命令自动创建 `AGENTS.md` 并注入全部 `.agents/rules/*.md` 引用及专属规则占位区, so that 编码 Agent 打开项目即可加载团队红线。
4. As a 业务项目开发者, I want 初始化命令将本仓库维护的全部 Private Skill 拷贝至当前项目的 `.agents/skills/` 目录, so that 团队自研技能随业务项目开箱即用并纳入业务仓库版本控制。
5. As a 业务项目开发者, I want 初始化命令读取 Skills Manifest 并按 Install Scope 自动调用 `npx skills@latest add` 安装 External Skill（`global` 安装至全局目录、`project` 安装至当前项目）, so that 我无需手工逐个查找和安装团队依赖的外部技能。
6. As a 业务项目开发者, I want 对 `mattpocock/skills` 这类包含大量无关技能的上游源，安装过程仅精准安装清单中显式指定的 18 个技能而非整包全部安装, so that 我的 Agent 上下文不被多余技能污染且全团队安装结果完全一致。
7. As a 业务项目开发者, I want 在 Windows PowerShell、Git Bash、macOS 和 Linux 终端下运行同一条初始化命令都能获得一致的行为, so that 不受操作系统和默认 Shell 差异困扰。
8. As a 处于受限网络环境的 Windows 开发者, I want 初始化工具自动探测 Windows 系统网络代理并透传给第三方技能安装子进程, so that 访问 GitHub 安装 External Skill 时不会频繁连接重置。
9. As a 业务项目开发者, I want 初始化命令不强制在我的业务项目中生成 `docs/agents/*`、`GLOSSARY.md` 或 `docs/adr/`, so that 轻量项目保持最小侵入，且第三方技能自身配置由 `setup-matt-pocock-skills` 独立负责。
10. As a 业务项目开发者, I want 可以通过 `--dry-run` 预览本次初始化或更新将创建、覆盖或安装的变更而不实际写入磁盘或执行安装, so that 我能在高敏感仓库中先审查变更再执行。

### 老项目兼容与增量更新
11. As a 已有业务项目维护者, I want 在已经存在 `AGENTS.md`、`agent.md`、`GEMINI.md` 或 `CLAUDE.md` 的老项目中运行初始化命令时，工具按优先级命中最高优先级的现有 Entry File 并仅增量注入缺失的规则引用, so that 项目原有的标题与专属业务规则 100% 完好保留。
12. As a 已有业务项目维护者, I want 当项目同时存在多个 Entry File 时能够通过 `--entry <filename>` 显式指定要更新的目标入口文件, so that 我可以精确控制特定 Agent 工具的入口配置。
13. As a 曾经使用旧版 `../.agents` 模式接入的老项目维护者, I want 再次运行初始化命令时工具自动将 Entry File 中的 `../.agents/rules/*.md` 替换为本地 `.agents/rules/*.md` 且不产生重复引用, so that 老项目可以零痛感完成 Legacy Migration。
14. As a 曾经使用旧版 `../.agents` 模式接入的老项目维护者, I want 工具自动清理 `.agents/skills.json` 中失效的 `../.agents/skills` 条目及历史 `inherits` 残留，同时完整保留业务项目自己的其他配置项, so that 旧配置文件不会报错也不会丢失私有条目。
15. As a 已有 `.agents/skills/` 私有技能的业务项目维护者, I want 增量更新时团队托管的 Private Skill 被安全覆盖升级，而业务项目自建的本地私有技能被 100% 保留, so that 团队升级绝不会误删业务资产。
16. As a 业务项目维护者, I want 工具在目标项目 `.agents/.standards-manifest.json` 中记录本次写入的托管规则与私有技能列表，若团队后续下线了某个旧规则或旧私有技能，增量更新时明确提示而非静默删除, so that 变更过程透明可控。
17. As a 频繁同步团队规范的开发者, I want 重复运行初始化命令时自动检测本地已安装的 External Skill 并跳过已存在项（仅安装缺失差集）, so that 日常增量更新在毫秒级完成且不卡顿。
18. As a 需要拉取上游技能最新版本的开发者, I want 通过 `--update-skills` 参数强制刷新清单中的全部 External Skill, so that 需要升级外部技能时有一键入口。
19. As a 处于离线或内网环境的开发者, I want 通过 `--skip-external` 参数跳过所有 External Skill 安装、仅本地同步团队 Rule 与 Private Skill, so that 断网情况下依然可以更新核心规范。
20. As a 使用特定编码 Agent 的开发者, I want 通过 `--agent <name>` 参数将目标 Agent 标识透传给第三方技能安装器, so that 外部技能能够安装到对应 Agent 识别的目录。
21. As a 业务项目开发者, I want 当某一个外部技能源安装因网络故障失败时，工具不中断其余 Rule 复制、Private Skill 拷贝与其他技能源的安装，并在末尾清晰汇总失败项与重试命令, so that 单点网络波动不会导致整个初始化半途而废。

### 规则治理与冲突仲裁
22. As a 使用外部工程技能的开发者, I want 团队静态 Rule 中明确声明“当任何外部 Skill 步骤与团队静态 Rules 冲突时，静态 Rules 具有绝对最高优先级”, so that 诸如外部技能要求自动 `git commit` 的步骤不会绕过团队的 Git 变动强确认红线。
23. As a 任意业务项目的开发者, I want 通用代码质量规则中不包含特定业务项目的专有术语或案例残留, so that 团队规范真正具备跨项目普适性。

### 规范仓库维护与质量门禁
24. As a 规范仓库维护者, I want 本仓库清空所有外部第三方技能源码，仅通过声明式 Skills Manifest 管理外部依赖，并保留专用的 Private Skill 目录与隔离模板, so that 仓库职责单一、易于演进。
25. As a 规范仓库维护者, I want 运行 `npm run new-skill -- <skill-name>` 从隔离模板一键生成符合命名规范的 Private Skill 骨架, so that 团队成员能以统一结构贡献自研技能。
26. As a 规范仓库维护者, I want 运行 `npm run check` 对规则完整性、Private Skill 顶部 YAML Frontmatter 合法性、Skills Manifest Schema、Markdown 相对路径红线与站内死链执行严格检查，并在发现任意错误时返回非零退出码, so that 质量问题在合入前被确定性拦截。
27. As a 规范仓库维护者, I want 运行 `npm test` 通过 Node.js 原生测试框架验证 CLI 的全部核心路径与老项目迁移场景, so that 重构与后续迭代拥有可靠的自动化回归保障。
28. As a 规范仓库维护者, I want 在 GitHub 仓库的 Push 与 Pull Request 上由 CI 自动执行 `npm run check` 与 `npm test`, so that 质量门禁不依赖人工自觉。
29. As a 团队新人或贡献者, I want 精简一致的 README 与专题文档准确反映新的一行命令接入方式、三类资产模型与技能清单，且不再出现技能数量与旧脚本描述漂移, so that 上手过程零困惑。

---

## Implementation Decisions

### 1. 仓库与运行时架构
- **零外部运行时依赖的 Node.js ESM CLI**：在仓库根目录建立标准 Node.js 包定义（包名 `team-agent-standards`，`type: "module"`，要求 Node.js >= 18，无生产 `dependencies`），通过 `bin` 字段暴露 CLI 入口，使任意业务项目可直接通过 `npx github:<owner>/team-agent-standards` 执行默认 `init` 流程。
- **废弃旧脚本与旧锁文件**：全面移除原有 4 个 Bash 脚本及旧版 `skills-lock.json`，避免双轨维护。
- **核心模块划分**：
  - **CLI 路由与参数解析模块**：解析子命令（默认 `init`，以及仓库内维护命令 `check`、`new-skill`）与选项（`--update-skills`、`--skip-external`、`--entry`、`--agent`、`--dry-run`、`--help`、`--version`），仅负责参数解析、日志输出与进程退出码映射。
  - **初始化与增量更新编排模块（Init Orchestrator）**：串联规则同步、入口文件合并与旧版迁移、私有技能拷贝与追踪清单写入、第三方技能差集计算与批量安装。
  - **规则与入口文件合并模块**：负责将本仓库规则全量复制到目标项目 `.agents/rules/`；按 `AGENTS.md` > `agent.md` > `GEMINI.md` > `CLAUDE.md` 优先级（或 `--entry` 指定值）定位入口文件；支持旧版 `../.agents/rules/<file>` 到 `.agents/rules/<file>` 的无损替换、缺失规则增量注入（保留一级标题与业务专属内容）以及幂等跳过。
  - **旧版配置迁移模块**：检测目标项目 `.agents/skills.json`，若存在失效的 `../.agents/skills` 条目或旧版 `../.agents/skills.json` 继承字段，安全解析 JSON 并精准移除失效项，保留业务项目其余全部配置；若清理后该文件为空配置则保留合法空结构或给出清理提示，不破坏既有私有条目。
  - **私有技能同步与托管追踪模块**：扫描本仓库私有技能目录，逐个覆盖拷贝至目标项目 `.agents/skills/<name>/`；读写目标项目 `.agents/.standards-manifest.json`（记录 `version`、`rules`、`privateSkills`、`updatedAt`），对比上次托管记录与本次清单，保留所有非团队托管的业务本地私有技能，并对团队已下线的旧托管项输出清晰提示而不静默删除。
  - **第三方技能安装模块**：解析 Skills Manifest；针对每条源记录，根据 `scope` 确定检测基目录（`global` 对应用户主目录下的 `.agents/skills`，`project` 对应目标项目的 `.agents/skills`）；默认过滤出本地尚未安装的技能差集（`--update-skills` 时不过滤）；使用单次批量 `npx skills@latest add <source> --skill <s1> --skill <s2> ... -y`（`global` 追加 `-g`，可选透传 `-a <agent>`）执行安装；内置 Windows 注册表代理探测并注入子进程环境变量；单条源失败捕获错误、继续后续步骤并最终汇总失败列表与重试命令。
  - **健康检查门禁模块（Health Check）**：严格解析顶部 `--- ... ---` YAML Frontmatter（校验 `name` 与目录名一致且非空、`description` 非空）；校验核心规则文件存在；校验 Skills Manifest JSON 结构与字段合法性（`version`、`entries[].source`、`entries[].scope` 为 `global` 或 `project`、`skills` 非空数组或 `all: true`）；扫描全仓库 Markdown（含 `README.md`、`rules/`、`docs/`、`skills/`、`templates/`）禁止残留硬编码本地绝对路径并校验站内相对文件链接可达；任意失败项均导致进程返回退出码 1。
  - **私有技能脚手架模块（New Skill）**：校验技能名符合小写连字符规范，校验不重名，从隔离模板复制并替换占位符生成新私有技能骨架。

### 2. Skills Manifest 契约设计
本仓库根目录维护单一声明式第三方技能清单（`skills-manifest.json`），支持**显式精选列表**与**可选整包**两种模式：

```json
{
  "version": 1,
  "entries": [
    {
      "source": "mattpocock/skills",
      "scope": "global",
      "skills": [
        "ask-matt",
        "code-review",
        "codebase-design",
        "diagnosing-bugs",
        "domain-modeling",
        "grill-me",
        "grill-with-docs",
        "grilling",
        "handoff",
        "implement",
        "implement-spec",
        "prototype",
        "research",
        "setup-matt-pocock-skills",
        "tdd",
        "to-spec",
        "to-tickets",
        "wayfinder"
      ],
      "description": "Matt Pocock 敏捷工程核心技能套件"
    }
  ]
}
```

- 校验规则：`entries` 中每项必须包含非空 `source`、`scope`（枚举 `global` | `project`），且 `skills`（非空字符串数组）与 `all: true` 二选一。

### 3. 规则净化与优先级仲裁
- 清理通用代码质量规则第 8 节中的具体业务项目示例残留，替换为通用表述。
- 在 Agent 行为准则中明确增加“静态 Rules 最高优先级仲裁”条款，声明当任何外部 Skill 步骤（如自动提交 Git）与团队静态 Rules 冲突时，静态 Rules 具有绝对最高优先级。

### 4. 文档与 CI 同步
- 重写 `README.md` 及 `docs/` 专题文档，统一为新的一行命令分发架构、三类资产说明、老项目增量更新说明与维护命令，使用 `<owner>/team-agent-standards` 占位符，消除跨文档重复复述与数量漂移，并修复原有文档相对路径错误。
- 新增 GitHub Actions CI 工作流，在 Push 与 Pull Request 时运行 `npm run check` 与 `npm test`。

---

## Testing Decisions

- **测试原则（严格遵守团队测试规范）**：采用黑盒行为契约测试，仅验证给定目录状态与 CLI 参数下的真实文件产出、退出码与外部命令调用参数；严禁 Mock 文件系统或模块内部私有辅助函数。
- **测试框架**：使用 Node.js 内置 `node --test` 与 `node:assert/strict`，保持仓库零外部依赖。
- **唯一顶层测试接缝**：
  - 将 `init`、`check`、`new-skill` 编排函数作为可调用入口，注入极简外部边界依赖：`runCommand(command, args, options)`（封装 `npx skills` 与 Windows `reg.exe` 代理查询）和 `homeDir`（定位全局技能目录）。
  - 所有测试均在 `fs.mkdtemp` 创建的真实隔离临时目录上执行，测试结束后确定性清理临时目录。
- **必测覆盖范围**：
  1. **全新项目初始化**：规则完整复制、新建 `AGENTS.md`、Private Skill 拷贝、`.standards-manifest.json` 落盘、External Skill 单次批量 `--skill` + `-g` + `-y` 调用参数校验。
  2. **老项目增量更新与旧版迁移**：已有 `AGENTS.md` / `GEMINI.md` / `CLAUDE.md` 的优先级命中与 `--entry` 覆盖、保留业务标题与自定义规则、旧版 `../.agents/rules/*.md` 替换且去重、`.agents/skills.json` 失效条目清理且保留私有配置、本地自建私有技能保护、团队下线托管项仅提示不静默删除、多次重复执行严格幂等。
  3. **第三方技能安装策略与容错**：本地已存在技能差集跳过、`--update-skills` 强制全量安装、`--skip-external` 离线跳过、`--agent` 参数透传、`--dry-run` 零副作用、单源安装失败容错并汇总失败项。
  4. **健康检查门禁与脚手架**：健康仓库通过（退出码 0）；缺失规则、坏 Frontmatter、目录名与 `name` 不一致、非法 Manifest Schema、硬编码绝对路径、Markdown 死链均准确报错并返回非零退出码；`new-skill` 合法创建与非法名称/重名拦截。
- **既有测试参考**：本仓库此前无自动化测试套件，本次建立的测试套件即为本项目的首个测试基准。

---

## Out of Scope

- 不在本工具中自动生成或维护 `docs/agents/issue-tracker.md`、`docs/agents/triage-labels.md`、`docs/agents/domain.md`、`GLOSSARY.md` 或 `docs/adr/`（由第三方技能 `setup-matt-pocock-skills` 独立负责）。
- 不在本仓库中内联、Fork 或魔改第三方上游技能源码。
- 不实现面向单一 IDE 的专有原生 Plugin 注册逻辑（如 `claude plugin install`、`codex plugin add`）；第三方技能安装统一走跨平台的 `npx skills@latest add`。
- 不在本次重构中自动发布 npm 公共/私有包（仅完成 `package.json` 就绪与 GitHub `npx github:<owner>/team-agent-standards` 直连运行能力）。
- 不在本次重构中新增新的团队业务 Private Skill（仅保留干净的私有技能目录结构与脚手架能力）。

---

## Further Notes

- 仓库当前 Git Remote 为内网地址，迁移至 GitHub 后仅需将文档与示例中的 `<owner>/team-agent-standards` 替换为实际 GitHub 路径即可直接供全团队通过 `npx github:...` 一行启动。
- 重构实施建议按垂直切片拆分为原子工单（可使用 `/to-tickets`），按 TDD 节奏逐步落地并保持每次变更可验证。

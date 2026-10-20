# team-agent-standards

> **团队统一的 AI Agent 辅助编程工程范式套件**  
> 为团队提供开箱即用、统一纪律的高级软件工程 SOP 技能、编码质量红线与一键接入脚手架。

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Universal%20Coding%20Agents-blue.svg)]()

---

## 🎯 项目愿景

在传统 AI 编程中，工程师往往面临 **“AI 盲目堆写代码、缺乏架构推演、风格五花八门、频繁引入隐式 Bug”** 的问题。

`team-agent-standards` 将现代敏捷软件工程全流程固化为标准化 Agent 资产：
- **静态规则（Rules）**：常驻运行的代码质量红线、防御性编程与 Conventional Commits 提交规范；
- **动态流程（Skills）**：经受业界实战检验的 Matt Pocock 10 大核心工程技能（SOP）；
- **自研脚手架（Templates）**：规范自研 skill 模板，配套一键脚手架；
- **极简继承（Inheritance）**：子仓库声明式继承，一人配置，全组免装即用。

---

## ⚡ 30 秒极速上手

### 步骤 1：首次安装（每台电脑仅需执行一次）
在 Git Bash 中进入你的项目父级目录（如 `~/codes` 或 `D:/codes`）：

```bash
cd codes
git clone <团队远程Git仓库地址>/team-agent-standards.git .agents
```

> [!NOTE]
> 仓库在本地克隆的目录名必须为 `.agents`。所有技能源码均已内联（Vendor 模式），**无需执行 npm install，无需安装额外依赖，离线可用**。

---

### 步骤 2：为你的业务子项目开启规范
进入具体业务项目目录，在 Git Bash 中运行一行接入脚本：

```bash
cd codes/my-subproject
../.agents/scripts/init-subproject.sh
```

#### 🛡️ 智能兼容与无损合并特性：
接入脚本对**全新子项目**与**已有成熟子项目**做了完善的防御性设计：
- **无损合并 `skills.json`**：若子项目已有本地私有技能配置（如 `"entries": [...]`），脚本仅合并通用技能路径进 `entries`，**100% 保留子项目原有配置**；
- **智能注入已有规则文件（如 AGENTS.md 等）**：自动识别项目根目录下不同命名习惯的既有规则文件；若已有规则文件，仅在原标题正下方插入团队规范引用，**保留项目原标题与原有业务规则，绝不产生重复标题**；
- **幂等安全**：多次重复执行自动检测并跳过，零副作用。

接入完成后，子项目的标准接入状态如下：

```json
// .agents/skills.json（纯净简洁，零外部网络依赖）
{
  "entries": [
    {
      "path": "../.agents/skills"
    }
  ]
}
```

```markdown
<!-- AGENTS.md 或现有规则文件 -->
# Project Guidelines

@[Agent行为准则](../.agents/rules/agent.md)
@[通用编码红线](../.agents/rules/common.md)
@[自动化测试规范](../.agents/rules/testing.md)
@[Git提交规范](../.agents/rules/git.md)

## 本项目专属规则
<!-- 此处完好保留子项目原有的所有框架约定、业务规则与环境说明 -->
```

---

### 步骤 3：提交配置至业务仓库
```bash
git add .agents/skills.json AGENTS.md
git commit -m "chore: enable team-agent-standards"
git push
```
**完成！** 团队其他成员拉取该分支后， `.agents`，将**自动生效，零额外配置**！

---

## 🛠️ 核心技能矩阵 (Skills Cheat Sheet)

在聊天窗口随时敲入以下指令唤醒对应 SOP：

| 阶段 | 快捷指令 | 核心职责 | 典型调用场景 |
| :--- | :--- | :--- | :--- |
| **需求对齐** | `/grill-me` | 穷追不舍的需求深度访谈 | 开启新特性开发前，让 Agent 深度挖掘边界条件与逻辑漏洞 |
| **架构决策** | `/grill-with-docs` | 对齐方案并同步沉淀 ADR | 复杂重构与方案选型，自动沉淀架构决策文档（ADR） |
| **规格说明** | `/to-spec` | 对话提炼为结构化规格说明书 | 讨论结束后，将技术方案固化为正式 Spec 文档 |
| **任务拆解** | `/to-tickets` | Spec 拆解为声明依赖的原子工单 | 复杂大任务切片，防止单次提示词过大导致 AI 幻觉与遗忘 |
| **测试驱动** | `/tdd` | 严格执行测试驱动开发（红-绿-重构） | 编写新功能或修复复杂 Bug，强迫先写失败测试用例 |
| **精准实现** | `/implement-spec` | 严格按 Spec/Tickets 编写实现代码 | 执行已有工单与规范，不做过度设计 |
| **科学排错** | `/diagnosing-bugs` | 假设-验证闭环排错流程 | 遇到棘手 Bug 或性能问题，杜绝盲目改动 |
| **深度设计** | `/codebase-design` | 基于《软件设计哲学》指导深度模块设计 | 设计公共 SDK、接口抽象或决定模块切缝位置时使用 |
| **双轴审查** | `/code-review` | Standards（规范轴）+ Spec（需求轴）并行审查 | 提 PR 前运行，自动比对团队 Rules 与需求两根轴 |
| **会话交接** | `/handoff` | 将当前长会话压缩为结构化交接文档 | 会话 Token 接近上限或需要换 Agent/换人接手时调用 |

---

## 💡 开发团队自研技能 (Custom Skills)

我们提供了专门的脚手架工具，模板隔离在 `templates/` 目录中，杜绝污染日常会话的上下文 Token：

```bash
# 一键创建自研技能骨架
bash ./scripts/new-skill.sh <your-skill-name>
```
脚本会自动在 `skills/<your-skill-name>/` 下生成符合通用 Agent 标准规范的骨架目录及 `SKILL.md`，完善后提交 PR 即可全团队共享！

---

## 📏 通用静态规则库 (Rules)

- **`rules/agent.md`（Agent 协作纪律与行为红线）**：
  - **严禁偷懒占位**：杜绝 `// TODO: implement later`、`pass` 等伪完成代码；
  - **最小爆炸半径**：严格控制代码变更范围，严禁借机全局格式化污染 `git blame`；
  - **真实运行验证**：必须真实执行构建与测试命令，拒绝口头幻觉通过；
  - **科学排错**：基于报错日志与根因假设做靶向修复，杜绝盲目随机试错。
- **`rules/common.md`（通用代码质量与安全红线）**：
  - **深度模块设计**：接口小巧、实现完备；单函数不超过 50 行，圈复杂度严格受限；
  - **严禁吞异常**：杜绝空的 `catch (e) {}`，强制结构化日志上报；
  - **杜绝魔法值**：常量集中定义，变量命名强制自解释；
  - **类型与并发安全**：TS 严禁无节制 `any`，避免异步悬空（Floating Promises）；
  - **安全最高红线**：严禁硬编码任何 API Key、Token 或数据库明文凭证，敏感日志脱敏。
- **`rules/testing.md`（自动化测试与质量守护规范）**：
  - **测试金字塔与 TDD**：核心业务与边界分支必须有测试覆盖，优先遵循红-绿-重构；
  - **独立性与副作用隔离**：单测严禁直连外部生产网络与真实数据库，环境状态确定性清理；
  - **合理 Mock 边界**：仅 Mock 系统边界依赖，严禁 Mock 被测模块内部私有实现，防脆弱测试；
  - **有效精确断言**：杜绝无断言假测试，针对业务核心契约与具体异常类型精准断言。
- **`rules/git.md`（Git 协同与提交规范）**：
  - **变动操作强制确认**：严禁擅自执行 `commit`, `push`, `reset`, `checkout`, `merge`, `stash` 等变动仓库的操作，必须向用户展示完整命令与变更详情，获得明确确认后方可执行；
  - **Conventional Commits**：强制遵循规范类型（`feat`, `fix`, `refactor`, `perf`, `test` 等）；
  - **破坏性变更显式声明**：采用 `feat!:` 或在 Footer 注明 `BREAKING CHANGE:`；
  - **原子性提交原则**：一个 Commit 只做一件事，保持历史清晰可追溯；
  - **统一分支标准与 PR 规范**：统一分支命名，PR 必须包含 Why、What 与验证凭证。

---

## 🧰 统一运维脚本套件 (`scripts/`)

全团队通过 Git Bash 统一调用 Bash 脚本执行运维：

| 脚本文件 | 核心功能 | 执行命令示例 |
| :--- | :--- | :--- |
| `init-subproject.sh` | 业务子项目一键接入脚手架 | `bash ../.agents/scripts/init-subproject.sh` |
| `new-skill.sh` | 团队自研技能一键脚手架 | `bash ./scripts/new-skill.sh <skill-name>` |
| `manage-skills.sh` | 维护第三方开源技能工具 (List/Add/Update/Audit) | `bash ./scripts/manage-skills.sh list` |
| `check-health.sh` | 规范完整性与 Frontmatter 格式自检脚本 | `bash ./scripts/check-health.sh` |

---

## 📚 详细文档导航

- 📖 [新人 5 分钟上手指南](docs/onboarding.md)
- 🚀 [团队 Agent 敏捷研发 SOP 实战手册](docs/workflow-guide.md)
- 📐 [静态规范与规则参考手册](docs/rules-reference.md)
- 🤝 [自研 Skill 贡献与发版指南](docs/contributing.md)

---

## 🔄 团队日常更新与同步

```bash
# 进入 .agents 目录直接拉取
cd codes/.agents
git pull
```
更新后，本地所有业务子项目立即同步获得团队最新研发能力！

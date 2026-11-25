# 新人 5 分钟上手指南 (Developer Onboarding)

欢迎使用 **`team-agent-standards`**！  
只需前置安装 **Node.js >= 18**，在任意业务项目根目录执行一行命令，即可将团队静态规则、第三方工程技能与自研私有技能无缝接入你的开发工作流。

---

## 🚀 快速接入业务项目

### 场景一：加入已接入团队规范的业务项目

如果业务仓库根目录已经包含 `.agents/rules/` 与 `AGENTS.md`（或 `GEMINI.md` / `CLAUDE.md`）：

1. 正常克隆并拉取业务项目；
2. 如本机尚未安装团队依赖的全局第三方技能，在业务项目根目录运行一次：
   ```bash
   npx github:<owner>/team-agent-standards
   ```
   工具会自动跳过已存在项，仅补齐本机缺失的 `global` 级第三方技能。

---

### 场景二：为新项目或老项目首次开启规范 / 增量更新

在业务项目根目录打开任意终端（Windows PowerShell、Git Bash、macOS/Linux Terminal 均可），执行：

```bash
npx github:<owner>/team-agent-standards
```

工具将自动完成以下操作：
1. **同步静态规则**：将最新 4 份团队规则复制到当前项目的 `.agents/rules/`；
2. **无损更新入口文件**：自动识别已有 `AGENTS.md` / `agent.md` / `GEMINI.md` / `CLAUDE.md`（按优先级命中首个，或通过 `--entry <file>` 指定），增量注入 `.agents/rules/*.md` 引用，**100% 保留项目原标题与既有业务规则**；若项目无任何入口文件则新建 `AGENTS.md`；
3. **自动迁移旧版 `../.agents`**：如老项目曾使用旧版跨父目录路径，自动将 `../.agents/rules/*.md` 迁移为 `.agents/rules/*.md`，并清理 `.agents/skills.json` 中的失效路径；
4. **拷贝团队私有技能**：将团队自研技能同步至 `.agents/skills/`，同时完整保留业务项目自建的本地私有技能；
5. **按清单安装第三方技能**：读取 [`skills-manifest.json`](../skills-manifest.json)，对本地缺失的 `global` / `project` 级第三方技能执行单次批量精准安装（Windows 下自动探测系统代理）。

完成后，将项目级变更提交到业务仓库：

```bash
git add .agents/ AGENTS.md
git commit -m "chore: enable team-agent-standards"
```

---

## 🎛️ 常用命令行参数

```bash
# 先预览变更，不写入磁盘、不安装外部技能
npx github:<owner>/team-agent-standards --dry-run

# 仅离线同步规则与私有技能（不联网安装外部技能）
npx github:<owner>/team-agent-standards --skip-external

# 强制刷新清单中的全部第三方技能到最新版本
npx github:<owner>/team-agent-standards --update-skills

# 指定目标项目目录、入口文件与目标 Agent
npx github:<owner>/team-agent-standards --target ./my-app --entry CLAUDE.md --agent claude-code
```

---

## 🎯 你的第一次规范化交互体验

1. **按需配置项目级 Issue Tracker**（若计划使用 `to-spec` / `to-tickets` / `implement-spec`）：
   > `/setup-matt-pocock-skills`
2. **需求边界深度访谈**：
   > “我想添加手机号验证码登录功能。 /grill-me”
3. **沉淀规格说明书**：
   > “根据刚才讨论整理工程规格说明书。 /to-spec”
4. **测试驱动开发与双轴审查**：
   > “按 TDD 模式实现该接口。 /tdd”  
   > “审查当前变更。 /code-review”

完整的全流程操作指南请查阅 [团队 Agent 敏捷研发 SOP 实战手册](workflow-guide.md)。

---

## ❓ 常见问题 (FAQ)

### Q1：团队更新了规则或私有技能，老项目如何同步？
在业务项目根目录重新执行一次 `npx github:<owner>/team-agent-standards` 即可。已安装的第三方技能默认跳过，规则与私有技能会毫秒级安全覆盖更新，业务自定义规则与本地私有技能不受影响。

### Q2：为什么不再把规则库克隆到父级 `../.agents` 目录？
现代编码 Agent 普遍启用了工作区沙箱安全限制，禁止项目内配置向上级目录寻址。改为复制到项目本地 `.agents/rules/` 后，项目在任意嵌套目录或 CI 环境中均可独立工作。详细背景见 [ADR-0001](adr/0001-local-distribution-and-manifest-model.md)。

### Q3：Windows 访问 GitHub 安装第三方技能经常超时怎么办？
CLI 内置了 Windows 系统代理自动探测：只要你在系统中开启了代理（或设置了 `HTTP_PROXY` / `HTTPS_PROXY`），工具会自动透传给 `npx skills` 子进程。如果仍因网络临时中断，规则与私有技能不受影响，末尾会给出精确的重试命令。

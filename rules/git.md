# Git 协同与提交规范 (Git Standards)

---

## 1. 提交信息规范 (Conventional Commits)

提交信息统一结构：`<type>(<scope>): <subject>`

- **强制限定 Type**：`feat`（新特性）、`fix`（修Bug）、`refactor`（重构）、`perf`（性能优化）、`test`（测试用例）、`docs`（文档注释）、`style`（格式调整）、`chore`（构建/依赖/工具）；
- **Scope 作用域（推荐）**：说明影响的模块或目录，如 `feat(auth): add jwt refresh endpoint`；
- **Subject 标题**：祈使语气、现在时态、首字母小写、末尾不加句号，控制在 50 字符以内；
- **Body 正文（可选）**：说明修改动机（Why）与解决思路（How），而非机械复述改动文件。

---

## 2. 破坏性变更声明 (Breaking Changes)

凡破坏既有接口或数据契约的改动必须显式声明：
1. **类型标记**：在 `type` 或 `scope` 后紧跟 `!`（例如 `feat(api)!: remove deprecated v1 user endpoints`）；
2. **Footer 说明**：提交正文末尾独立段落写入 `BREAKING CHANGE: <详细说明破坏点及迁移方案>`。

---

## 3. 提交粒度原则 (Atomic Commits)

- **原子性提交**：一个 Commit 只做一件逻辑完整的事，保持高可回滚性（Revert）与可排查性（Bisect）；
- **严禁混合提交**：禁止将无关的格式调整、代码重构与 Bug 修复糅杂在同一提交中；
- **提交健康准则**：确保每个提交节点均处于可编译通过、关键测试绿色的健康状态。

---

## 4. 分支管理与 PR 规范 (Branching & PR Standards)

- **分支命名**：新特性 `feat/<desc>`、修复 `fix/<desc>`、重构 `refactor/<desc>`、热修 `hotfix/<desc>`；
- **PR 三要素**：必须包含背景动机（Why）、核心改动（What）与本地验证凭据（Verification）。

---

## 5. 仓库变动性操作授权红线 (Explicit Confirmation for Mutating Operations)

> [!IMPORTANT]
> **严禁 Agent 擅自执行任何会导致本地仓库、工作区、暂存区或远程分支发生变动的 Git 操作。**

### 5.1 操作分类准则
1. **只读操作（允许自主执行）**：`git status`, `git log`, `git diff`, `git branch`, `git rev-parse`, `git show` 等仅用于感知状态的查询命令；
2. **变动性操作（必须获得用户显式确认）**：凡涉及仓库写入、历史修改、文件撤销或远程推送的命令（包括 `commit`, `add`, `push`, `checkout`, `switch`, `reset`, `restore`, `revert`, `clean`, `merge`, `rebase`, `stash`, `tag` 等），**严禁自主直接执行**，必须向用户汇报并取得许可。

### 5.2 确认提请标准
提请用户确认时，必须以清晰格式列出三项：
1. **拟执行的具体 Git 命令**；
2. **变更概要与 Commit Message**（type、scope、subject 及涉及文件）；
3. **目标分支与潜在影响**（如推送到哪个远程分支）。
获得用户明确肯定答复（如“确认”、“同意”）后方可执行。

---

## 6. Git 安全与纯净防线 (Git Security & Hygiene Hardlines)

- **严禁凭证入库**：绝对禁止将包含明文秘钥、Token 或未被 `.gitignore` 过滤的环境变量文件（`.env`）纳入版本库；
- **保护主分支**：严禁在共享受保护分支（如 `main`, `master`, `release`）执行强制推送（`git push -f`）；
- **衍生资产与大文件防泄漏审查 (Asset & Build Output Leak Prevention)**：
  - 提请 `git add` 暂存前必须核对清单，严禁将本地构建产物（`dist/`, `build/`, `target/`）、依赖目录（`node_modules/`, `.venv/`）、运行日志（`*.log`）或大体积临时/二进制文件（`.zip`, `.dump` 等）意外提交入库；
  - 若检测到未被忽略的本地生成物，必须提示开发者先在 `.gitignore` 中配置排除规则后再执行暂存。



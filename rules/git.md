# Git 协同与提交规范 (Git Standards)

> **分级约定**：`[MUST]` 为不可逾越的阻断级红线；`[SHOULD]` 为默认遵循的工程准则（偏离时须说明理由）。

---

## 1. 提交信息规范 (Conventional Commits)

`[MUST]` 提交信息统一采用 `<type>(<scope>): <subject>` 结构：

- **限定 Type**：`feat`（新特性）、`fix`（修 Bug）、`refactor`（重构）、`perf`（性能优化）、`test`（测试用例）、`docs`（文档注释）、`style`（格式调整）、`chore`（构建/依赖/工具）；
- **Scope（推荐）**：说明影响模块，如 `feat(auth): add jwt refresh endpoint`；
- **Subject**：`[SHOULD]` 支持中文或英文（全仓库保持风格一致）——英文采用小写祈使语气，中文直陈动词开头，末尾不加句号，控制在 50 字符以内；
- **Body（可选）**：说明修改动机（Why）与思路（How），而非机械复述文件名。

---

## 2. 破坏性变更声明 (Breaking Changes)

`[MUST]` 破坏既有接口、配置格式或数据契约的改动必须显式声明：
1. 在 `type` 或 `(scope)` 后紧跟 `!`（如 `feat(api)!: remove deprecated v1 endpoints`）；
2. 正文末尾独立段落写入 `BREAKING CHANGE: <破坏点及迁移方案>`。

---

## 3. 提交粒度与分支/PR 规范 (Atomic Commits & PR)

- `[SHOULD]` **原子性提交**：一个 Commit 只做一件逻辑完整的事，严禁将无关格式化、重构与 Bug 修复糅杂提交；确保每个提交节点可编译、测试通过；
- `[SHOULD]` **分支命名**：`feat/<desc>`、`fix/<desc>`、`refactor/<desc>`、`hotfix/<desc>`；
- `[SHOULD]` **PR 三要素**：必须包含背景动机（Why）、核心改动（What）与本地验证凭据（Verification）。

---

## 4. 仓库变动性操作授权红线 (Explicit Confirmation for Mutating Operations)

> [!IMPORTANT]
> `[MUST]` **严禁 Agent 擅自执行任何会导致本地仓库、工作区、暂存区或远程分支发生变动的 Git 操作。**

1. **只读操作（允许自主执行）**：`git status`, `git log`, `git diff`, `git branch`, `git rev-parse`, `git show`；
2. **变动性操作（必须获得用户显式确认）**：`add`, `commit`, `push`, `checkout`, `switch`, `reset`, `restore`, `revert`, `clean`, `merge`, `rebase`, `stash`, `tag` 等；
3. **确认提请三要素**：提请确认时必须列出 ① **拟执行的具体命令**、② **变更概要与 Commit Message**、③ **目标分支与潜在影响**，获得用户明确肯定答复后方可执行。

---

## 5. Git 安全、历史保护与冲突纪律 (Security, History & Conflict Hygiene)

- `[MUST]` **严禁凭证入库**：遵循 `common.md` §6 安全红线，严禁将明文秘钥、Token 或 `.env` 纳入版本库；
- `[MUST]` **共享历史不可改写**：严禁在受保护主分支（`main`, `master`, `release`）执行 `git push -f`，亦严禁对已推送至远程的共享分支执行 `rebase` 或 `commit --amend` 改写公共历史；
- `[MUST]` **合并冲突严谨处理**：解决合并冲突时严禁盲目使用 `--ours` / `--theirs` 整文件覆盖，必须逐块理解双方意图合并，并在解决后重新运行测试验证；
- `[MUST]` **衍生资产防泄漏**：提请 `git add` 前核对清单，严禁将构建产物（`dist/`, `build/`, `target/`）、依赖目录（`node_modules/`, `.venv/`）、日志或大体积临时文件提交入库；若发现未忽略生成物，先补齐 `.gitignore`。

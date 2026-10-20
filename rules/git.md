# Git 协同与提交规范 (Git Standards)

本文件定义团队所有代码仓库通用的 Git 提交（Conventional Commits）、分支管理与协同交付规范。所有 Agent 在执行代码提交或发起 PR 建议时必须无条件遵守。

---

## 1. 提交信息规范 (Conventional Commits)

每次提交信息必须遵循如下格式结构：

```text
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### 1.1 Type 类型定义（强制限定）
- **`feat`**：新增功能特性（Feature）
- **`fix`**：修复 Bug 或异常行为
- **`refactor`**：代码重构（既不修复 Bug 也不添加新功能的代码修改）
- **`perf`**：优化性能、减少内存占用或提升速度
- **`test`**：新增或修改测试用例（单元测试、集成测试、Mock 数据等）
- **`docs`**：仅文档、注释或说明类文件变更
- **`style`**：不影响代码运行逻辑的格式变动（空格、分号、Prettier 调整等）
- **`chore`**：构建流程、依赖管理、配置文件或辅助工具变动

### 1.2 Scope 作用域（推荐）
用于说明本次提交所影响的具体模块或目录。例如：
- `feat(auth): add jwt refresh token endpoint`
- `fix(agent): prevent infinite loop in task scheduler`
- `refactor(db): extract connection pool manager`

### 1.3 Subject 标题规则
- 使用祈使语气、现在时态（如使用 "add" 而非 "added" 或 "adds"）；
- 首字母小写，结尾不加句号（`.`）；
- 简明扼要，控制在 50 个字符以内。

### 1.4 Body 正文规则（可选）
- 说明本次修改的**动机（Why）**与**解决思路（How）**，而非简单重复改动了哪些文件。

---

## 2. 破坏性变更声明 (Breaking Changes)

当提交包含破坏既有接口、改变已有数据契约或不向下兼容的改动时，必须显式声明：
1. **类型标记**：在 `type` 或 `scope` 后紧跟 `!`（例如 `feat(api)!: remove deprecated v1 user endpoints`）；
2. **Footer 详细说明**：在提交正文末尾独立段落写入 `BREAKING CHANGE:`，并详细说明破坏点及迁移方案：
   ```text
   BREAKING CHANGE: The /v1/users endpoint has been completely removed.
   Clients must migrate to /v2/users using bearer token authorization.
   ```

---

## 3. 提交粒度原则 (Atomic Commits)

- **原子性提交**：一个 Commit 只做一件逻辑完整的事，保持可回滚（Revert）与排查（Bisect）的高效性；
- **禁止混合提交**：严禁把无关的“格式调整”、“重构代码”和“修复 Bug”糅杂在同一个提交中；
- **提交健康准则**：确保每个 Commit 节点提交后，代码均处于可编译通过、关键测试绿色的状态。

---

## 4. 分支命名与生命周期规范 (Branching Model)

- **新功能分支**：`feature/<issue-id>-<short-description>` 或 `feat/<short-description>`（如 `feat/user-avatar-upload`）
- **修复分支**：`bugfix/<issue-id>-<short-description>` 或 `fix/<short-description>`（如 `fix/login-token-expired`）
- **重构分支**：`refactor/<short-description>`
- **热修复分支**：`hotfix/<short-description>`

---

## 5. PR / MR 描述与合并守则

每个合并请求（Pull Request / Merge Request）必须包含三要素：
1. **背景与动机 (Why)**：关联的 Issue 单号或业务需求说明；
2. **变更要点 (What)**：改动的核心模块与设计决策；
3. **验证凭证 (Verification)**：本地测试运行结果、截图或接口调用响应示例。

---

## 6. 仓库变动性操作授权红线 (Explicit Confirmation for Mutating Operations)

> [!IMPORTANT]
> **严禁 Agent 擅自执行任何会导致本地仓库、工作区、暂存区或远程分支发生变动的 Git 操作。**

### 6.1 操作分类准则
1. **只读操作（允许自主执行）**：
   - 仅用于感知和分析项目上下文的查询类命令可自主执行，例如：`git status`, `git log`, `git diff`, `git branch`, `git rev-parse`, `git show`。
2. **变动性操作（必须获得用户显式确认）**：
   - 凡涉及仓库状态写入、历史修改、文件撤销或远程推送的命令，**严禁 Agent 自主直接执行**，必须向用户汇报并取得明确许可。
   - 典型受控操作包括但不限于：
     - **提交与暂存**：`git commit`, `git add`
     - **推送与发布**：`git push`
     - **分支切换与创建**：`git checkout`, `git switch`, `git branch -d/-D`
     - **撤销与重置**：`git reset`, `git restore`, `git revert`, `git clean`
     - **合并与变基**：`git merge`, `git rebase`
     - **工作区暂存**：`git stash`
     - **版本标签**：`git tag`

### 6.2 确认提请标准
提请用户确认时，Agent 必须以清晰易读的方式列出三项信息：
1. **拟执行的具体 Git 命令**；
2. **变更概要与 Commit Message**（包括 type、scope、subject 以及影响文件）；
3. **目标分支与潜在影响**（如推送到哪个远程分支）。
只有在用户给出明确肯定答复（如“确认”、“同意”、“执行提交”）后，Agent 方可执行对应命令。

---

## 7. Git 安全防线 (Git Security Hardlines)

- **严禁凭证入库**：绝对禁止将包含明文秘钥、Token 或未被 `.gitignore` 过滤的环境变量文件（`.env`）纳入版本库；
- **保护主分支**：严禁在共享受保护分支（如 `main`, `master`, `release`）执行强制推送（`git push -f`）。

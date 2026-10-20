# Git 协同与提交规范 (Git Standards)

本文件定义团队所有代码仓库通用的 Git 提交（Conventional Commits）与分支管理规范。

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

## 2. 提交粒度原则 (Atomic Commits)

- **原子性提交**：一个 Commit 只做一件逻辑完整的事；
- **禁止混合提交**：严禁把无关的“重构代码”和“修复 Bug”糅杂在一个提交中，保持回滚（Revert）与排查（Bisect）的清晰度。

---

## 3. 分支命名规范 (Branching Model)

- 新功能分支：`feature/<issue-id>-<short-description>` 或 `feat/<short-description>`
- 修复分支：`bugfix/<issue-id>-<short-description>` 或 `fix/<short-description>`
- 重构分支：`refactor/<short-description>`
- 快速热修复：`hotfix/<short-description>`

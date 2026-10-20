# 团队规范贡献与发版指南 (Contributing Guide)

**`team-agent-standards`** 是全体团队成员的共同资产。当你在日常开发中沉淀了优质的 Prompt 流程、自动化脚本或框架规范时，非常欢迎贡献回本项目，赋能团队伙伴！

---

## 一、如何贡献自研 Skill

### 1. 结构规范
在 `skills/` 目录下新建技能文件夹：
```text
skills/<your-skill-name>/
├── SKILL.md                 # 【必需】主执行说明与 frontmatter
├── references/              # 【可选】长文档/协议手册
└── scripts/                 # 【可选】自动化脚本
```

### 2. Frontmatter 要求
`SKILL.md` 顶部必须包含标准的 YAML Frontmatter：
```markdown
---
name: your-skill-name
description: >-
  清晰说明该技能的用途和适用场景（第三人称叙述）。如："用于自动化生成微服务 Mock 接口数据，支持 REST 与 gRPC 契约。"
---
```

### 3. 本地自检
提交前，运行健康检查脚本确保语法与相对链接无误：
```powershell
.\scripts\check-health.ps1
```

---

## 二、如何提议修改通用 Rules

通用规则（`rules/common.md`, `rules/git.md`）会影响所有业务子项目，因此修改规则需遵循以下原则：
1. **普适性**：该规则必须对团队绝大多数项目（无论前端、后端或算法）都具有约束价值；
2. **确定性**：规则必须清晰、无歧义，Agent 能够明确执行判断；
3. **评审共识**：修改规则需提交 PR 并至少经过 2 位核心工程师 Review 同意。

---

## 三、第三方开源 Skill 的引入标准

如果社区（如 `skills.sh` 或 GitHub）有优秀的开源 Skill 希望引入：
1. **代码审查**：务必审查其 `SKILL.md` 和附带脚本，严防提示词注入（Prompt Injection）或恶意系统命令；
2. **依赖锁定**：使用 `manage-skills.ps1 add <source>` 安装并生成 `.skill-lock.json`；
3. **源码入库**：以 Vendor 模式一同提交 Git，确保离线可用与防删库。

---

## 四、PR 提交与发布流程

1. 基于 `main` 分支切出特性分支：`git checkout -b feat/add-graphql-skill`；
2. 编写技能/规则并完善自检；
3. 提交符合 Conventional Commits 规范的 Commit；
4. 发起 Pull Request 至团队远程仓库；
5. CI 校验通过与 Code Review 合并后，通知团队伙伴执行 `git pull` 同步。

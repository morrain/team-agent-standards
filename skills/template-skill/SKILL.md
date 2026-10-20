---
name: template-skill
description: 团队自研 Skill 规范模板。用于指导团队工程师如何编写、封装、验证和发布标准化 Agent 技能。
---

# 团队自研 Skill 编写指南与模板规范

本 Skill 是团队内部自研标准化 Agent 技能的规范模板。开发新技能时，请复制此目录作为起点。

---

## 一、Skill 核心要素

一个标准的团队 Skill 目录结构如下：

```text
skills/<skill-name>/
├── SKILL.md                 # 【必需】主执行说明与元数据定义
├── scripts/                 # 【可选】辅助执行脚本 (Python/Bash/Node 等)
├── references/              # 【可选】详细参考手册、API 规格或操作手册
│   └── guide.md
└── resources/               # 【可选】配置模板、静态模版代码或 Schema
```

---

## 二、YAML Frontmatter 配置要求

每个 `SKILL.md` 顶部必须包含合法的 YAML Frontmatter：

```markdown
---
name: your-skill-name
description: >-
  清晰描述该技能的用途与触发时机（第三人称）。例如："用于在发布前执行端到端回归测试，生成测试覆盖率报告。"
---
```

> [!IMPORTANT]
> **`description` 是 Agent 决定是否激活本技能的唯一依据**。必须明确写清：
> 1. 这个技能**解决什么问题**；
> 2. 用户说出**什么意图或触发词**时应该激活。

---

## 三、正文编写最佳实践 (SOP 范式)

1. **渐进式披露 (Progressive Disclosure)**：
   - `SKILL.md` 正文保持精炼，专注于“步骤清单（Step-by-step Procedures）”；
   - 冗长的手册或协议细节请放入 `references/` 目录，通过相对链接引用，Agent 在需要时会按需阅读。参考：[references/guide.md](./references/guide.md)。
2. **明确输入与输出**：
   - 步骤必须具有确定性（如执行什么命令、检查什么输出结果）。
3. **闭环验证 (Verification Step)**：
   - 必须包含校验步骤（如“执行测试并通过”、“检查输出日志包含 SUCCESS”）。

---

## 四、自研技能发布与提交流程

1. 在 `skills/<your-skill-name>/` 下完成编写；
2. 运行 `.\scripts\check-health.ps1` 校验 Frontmatter 与链接有效性；
3. 提交 PR 至 `team-agent-standards` 仓库；
4. 评审合并后，全团队执行 `git pull` 即可同步生效。

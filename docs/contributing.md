# 团队规范贡献与发版指南 (Contributing Guide)

**`team-agent-standards`** 是全团队共同维护的 AI Agent 工程规范与分发工具仓库。贡献前请先了解我们的核心术语 [GLOSSARY.md](../GLOSSARY.md) 与架构决策 [docs/adr/](adr/)。

---

## 🧭 贡献的三大核心原则

1. **普适性 (Broad Applicability)**：通用规则与私有技能应面向团队大多数项目，不得混入单一业务项目的专有术语或临时逻辑；
2. **确定性 (Determinism)**：SOP 与规则描述清晰无歧义，不依赖 Agent 猜测；
3. **单一真理来源 (SSOT) & Token 经济性**：长篇参考资料剥离至 `references/`，规则正文仅在 `rules/` 唯一维护，避免跨文档复制粘贴。

---

## 一、贡献团队自研私有技能 (Private Skills)

团队自研私有技能统一存放在根目录 `skills/`，脚手架模板物理隔离在 `templates/skill-template/`：

```bash
# 1. 一键生成私有技能骨架（遵循小写连字符命名）
npm run new-skill -- api-mock-generator

# 2. 编辑 skills/api-mock-generator/SKILL.md
#    - 完善顶部 YAML Frontmatter 的 name（必须与目录名一致）和 description（第三人称触发条件）
#    - 按“前置检查 -> 核心执行 -> 验证闭环”编写 SOP，长篇参考移至 references/

# 3. 运行健康自检与单元测试
npm run check
npm test
```

合并后，业务项目再次运行 `npx github:<owner>/team-agent-standards` 即可将该私有技能自动同步到项目的 `.agents/skills/`。

---

## 二、维护第三方技能清单 (External Skills Manifest)

本仓库**不内联任何第三方上游技能源码**，所有外部技能均通过根目录 [`skills-manifest.json`](../skills-manifest.json) 声明：

```json
{
  "version": 1,
  "entries": [
    {
      "source": "owner/repo",
      "scope": "global",
      "skills": ["skill-a", "skill-b"],
      "description": "简要说明该外部技能集合的用途"
    }
  ]
}
```

### 引入第三方技能的要求
1. **安全审查**：人工审查目标上游技能的 `SKILL.md` 与附带脚本，确认无提示词注入、无越权读取凭证、无危险系统指令；
2. **合理选择作用域 (`scope`)**：
   - `global`：跨项目通用的方法论技能（安装到用户全局目录，避免每个业务仓库重复拷贝）；
   - `project`：与业务项目强绑定、需要随业务仓库 Git 锁定的外部技能；
3. **精准列出技能名**：优先通过 `skills: [...]` 显式列出所需技能，避免使用 `all: true` 引入上游仓库中的无关噪声；若技能仅适用于特定类型项目（如前端/页面原型），可配置 `"optional": true` 与 `"prompt": "..."`，由开发者在初始化时确认是否安装；
4. **执行校验**：修改清单后必须运行 `npm run check` 验证 Schema 合法性。

---

## 三、修改静态 Rules

静态规则（[`rules/agent.md`](../rules/agent.md)、[`rules/common.md`](../rules/common.md)、[`rules/testing.md`](../rules/testing.md)、[`rules/git.md`](../rules/git.md)）影响全团队所有业务项目：

1. 先说明修改动机（Why）与真实工程痛点；
2. 保持普适性与向后兼容，禁止混入特定业务项目案例；
3. 提交 PR 后需经至少 2 位核心工程师评审通过方可合并。

---

## 四、本地验证与提交流程

所有 PR 在提交前必须在本地通过全部质量门禁（CI 也会自动执行相同命令）：

```bash
npm run check
npm test
```

提交信息遵循 Conventional Commits（如 `feat(skills): add api-mock-generator private skill`），PR 描述须包含 **Why（背景动机）**、**What（核心改动）** 与 **Verification（本地校验输出）**。

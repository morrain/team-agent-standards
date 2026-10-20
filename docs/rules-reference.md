# 团队静态规范与规则参考 (Rules Reference)

本文件详细说明团队静态规范的设计理念、各子仓库的生效方式以及针对违规代码的阻断准则。

---

## 1. 静态 Rules 体系概览

与按需调用的 Skills（技能）不同，Rules（规则）是**无条件常驻在 Agent 系统上下文中的工程宪法**。无论你在何处编写、修改或重构代码，Agent 都会优先遵循这些规则。

### 规则分类
1. **`rules/common.md`**：通用代码质量、异常处理、圈复杂度与最高安全红线；
2. **`rules/git.md`**：Git 提交规范（Conventional Commits）与分支管理。

---

## 2. 核心红线解读 (Security & Quality)

### 2.1 绝不吞异常 (No Silent Failure)
```typescript
// ❌ 严重违规：静默吞异常，导致下游数据状态损坏且无法追踪根因
try {
  await processPayment(orderId);
} catch (e) {}

// ✅ 规范代码：结构化日志上报，带上上下文关键信息
try {
  await processPayment(orderId);
} catch (error) {
  logger.error("Payment failed for order", { orderId, error });
  throw new PaymentProcessingException(`Failed to charge order: ${orderId}`, { cause: error });
}
```

### 2.2 杜绝魔法数字与无意义命名
```typescript
// ❌ 严重违规：3600 是什么？obj 是什么？
if (duration > 3600) {
  save(obj);
}

// ✅ 规范代码：常量集中定义，变量自解释
const MAX_SESSION_TIMEOUT_SECONDS = 3600;
if (sessionDurationSeconds > MAX_SESSION_TIMEOUT_SECONDS) {
  persistExpiredSessionState(activeSession);
}
```

### 2.3 严禁硬编码敏感信息
- 任何出现在代码中的字符串形如 `ak-xxxx`, `sk-proj-xxxx`, `ghp_xxxx`, `mysql://root:password` 均属于最高安全违规。
- 必须通过环境变量或配置中心注入。

---

## 3. 子仓库中的 Rules 扩展与定制

在子仓库的 `AGENTS.md` 中，原生支持 `@[label](path)` 展开语法：

```markdown
# 本项目 Guidelines

@[通用编码红线](../.agents/rules/common.md)
@[Git提交规范](../.agents/rules/git.md)

## 本项目特定规则
- 本项目必须使用 Vue 3 组合式 API (<script setup lang="ts">)；
- 状态管理统一使用 Pinia，禁止使用全局 window 变量。
```

> [!NOTE]
> 子项目既能 100% 继承团队顶层大规范，又能根据自己的语言和框架追加特有规则。

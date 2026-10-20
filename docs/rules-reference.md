# 团队静态规范与规则参考 (Rules Reference)

本文件详细说明团队静态规范的设计理念、各子仓库的生效方式以及针对违规代码的阻断准则。

---

## 1. 静态 Rules 体系概览

与按需调用的 Skills（技能）不同，Rules（规则）是**无条件常驻在 Agent 系统上下文中的工程底线与质量约束**。无论在任何业务场景中编写、修改或重构代码，Agent 都会优先遵循这些规则。

### 核心规则矩阵 (The 4 Pillars)

| 规则文件 | 规范职责 | 核心关注点 |
| :--- | :--- | :--- |
| **`rules/agent.md`** | Agent 协作纪律与行为红线 | 严禁偷懒占位符、控制最小爆炸半径、真实运行自测、科学排错 |
| **`rules/common.md`** | 通用代码质量与安全红线 | 深度模块设计、单一职责、防吞异常、类型安全、结构化日志、最高安全红线 |
| **`rules/testing.md`** | 自动化测试与质量守护规范 | TDD 红绿重构、测试隔离、边界 Mock 原则、有效断言、防脆弱测试 |
| **`rules/git.md`** | Git 协同与提交规范 | Conventional Commits、Breaking Change 声明、原子性提交、变动操作强制确认、PR 规范 |

---

## 2. 核心红线解读与代码对照

### 2.1 Agent 交付红线：杜绝偷懒与占位符
```typescript
// ❌ 严重违规：输出半成品与占位符，假装完成
export async function syncUserData(userId: string): Promise<void> {
  // TODO: implement later
}

// ✅ 规范代码：完整可运行交付，或明确阻塞说明
export async function syncUserData(userId: string): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new UserNotFoundException(`Cannot sync non-existing user: ${userId}`);
  }
  await externalSyncClient.push({
    id: user.id,
    updatedAt: user.updatedAt,
  });
}
```

### 2.2 代码质量红线：绝不静默吞异常
```typescript
// ❌ 严重违规：静默吞异常，导致下游数据损坏且无法追踪根因
try {
  await processPayment(orderId);
} catch (e) {}

// ✅ 规范代码：结构化日志上报，带上上下文关键信息并抛出包装异常
try {
  await processPayment(orderId);
} catch (error) {
  logger.error("Payment processing failed", { orderId, error });
  throw new PaymentProcessingException(`Failed to charge order: ${orderId}`, { cause: error });
}
```

### 2.3 代码质量红线：杜绝魔法值与无意义命名
```typescript
// ❌ 严重违规：魔法数字、无意义变量命名
if (d > 3600) {
  save(obj);
}

// ✅ 规范代码：常量集中定义，变量自解释
const MAX_SESSION_TIMEOUT_SECONDS = 3600;
if (sessionDurationSeconds > MAX_SESSION_TIMEOUT_SECONDS) {
  persistExpiredSessionState(activeSession);
}
```

### 2.4 测试守护红线：合理 Mock 与有效断言
```typescript
// ❌ 严重违规：Mock 内部私有方法（脆弱测试）或无意义断言
test("calculateDiscount", () => {
  const result = calculateDiscount(100);
  expect(result).toBeDefined(); // 假断言：根本没验证数值是否正确
});

// ✅ 规范代码：黑盒测试契约与精确断言
test("calculateDiscount should apply 20% discount for VIP users", () => {
  const discountedPrice = calculateDiscount({ originalPrice: 100, isVip: true });
  expect(discountedPrice).toBe(80);
});
```

### 2.5 安全最高红线：严禁硬编码敏感信息
- 任何出现在代码中的字符串形如 `ak-xxxx`, `sk-proj-xxxx`, `ghp_xxxx`, `mysql://root:password` 均属于最高安全违规；
- 敏感配置必须通过环境变量（`process.env` / `os.environ`）或密钥管理中心动态注入。

---

## 3. 子仓库中的 Rules 扩展与定制

在业务子仓库的 `AGENTS.md` 中，原生支持 `@[label](path)` 展开语法：

```markdown
# 本项目 Guidelines

@[Agent行为准则](../.agents/rules/agent.md)
@[通用编码红线](../.agents/rules/common.md)
@[自动化测试规范](../.agents/rules/testing.md)
@[Git提交规范](../.agents/rules/git.md)

## 本项目特定规则
- 本项目必须使用 Vue 3 组合式 API (<script setup lang="ts">)；
- 状态管理统一使用 Pinia，禁止使用全局 window 变量。
```

> [!NOTE]
> 子项目既能 100% 无缝继承团队顶层的 4 大工程底线，又能根据子项目特定的技术栈（如 Python/Go/Vue/React）与业务场景追加特有规则。

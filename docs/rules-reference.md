# 团队静态规范与规则参考手册 (Rules Reference)

本手册详细说明团队 4 大静态规则的设计理念、代码判据、违规阻断准则以及各业务项目的复用扩展机制。  
静态规则是**常驻在 Agent 系统上下文中的最高工程宪法与底线约束**，无论在任何业务场景中编写、修改或重构代码，Agent 都会优先遵循这些规则。

---

## 1. 静态 Rules 体系概览与生效机制

```text
       ┌────────────────────────────────────────────────────────┐
       │             团队静态规则库 (The 4 Pillars)             │
       ├─────────────────┬──────────────────┬───────────────────┤
       │ rules/agent.md  │ rules/common.md  │ rules/testing.md  │ rules/git.md
       │ Agent行为准则   │ 通用质量与安全   │ 自动化测试规范    │ Git协同规范
       └────────┬────────┴────────┬─────────┴─────────┬─────────┴──────┬────────┘
                │                 │                   │                │
                └─────────────────┼───────────────────┼────────────────┘
                                  ▼
                业务项目引用展开入口 (AGENTS.md / GEMINI.md)
                ├── @[Agent行为准则](../.agents/rules/agent.md)
                ├── @[通用编码红线](../.agents/rules/common.md)
                ├── @[自动化测试规范](../.agents/rules/testing.md)
                ├── @[Git提交规范](../.agents/rules/git.md)
                └── ## 本项目专属规则 (业务项目特有业务/技术栈约定)
```

- **常驻性**：与按需调用的 Skills（技能）不同，Rules 不需要敲快捷指令触发，而是随业务项目的 `AGENTS.md` / `GEMINI.md` 自动内嵌至 Agent 的系统 Prompt 中；
- **最高优先级**：当用户提示词与规则发生冲突时（例如要求写个“临时 TODO 占位代码”或“先忽略报错吞掉异常”），Agent 必须主动提示违背团队规则，并给出符合规范的解决方案。

---

## 2. 核心红线深度解读与代码对照 (Good vs Bad)

### 2.1 Agent 交付红线：杜绝偷懒与占位符交付 (No Lazy Placeholders)

- **核心原则**：所有交付代码必须完整、闭环、可编译运行；严禁输出伪代码或假实现。

```typescript
// ❌ 严重违规：留下占位符伪完成，代码不可真正运行
export async function syncUserData(userId: string): Promise<void> {
  // TODO: implement later
}

// ❌ 严重违规：以注释省略关键实现
export function calculateTax(amount: number): number {
  // ... 其余计算逻辑同上 ...
  return 0;
}

// ✅ 规范代码：具备完整实现与明确的异常边界
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

> [!NOTE]
> 若因外部依赖缺失或业务规则不明无法写出实现，**严禁自行编造虚拟代码**，必须向开发者明确说明因何受阻并列出可选解决方案。

---

### 2.2 变更控制红线：严格控制最小爆炸半径 (Minimal Blast Radius)

- **核心原则**：修改代码时仅改动与当前工单直接相关的代码行；**严禁借机对整个文件执行全局无关重新格式化**。

```text
❌ 典型违规场景：
原本只需要在 user.ts 第 120 行修复一个判断条件，Agent 却将该文件的 500 行全部自动重新调整缩进或分号。
后果：导致 git blame 历史记录全部被冲刷，原作者信息丢失，Code Review 极难辨别真实改动行。

✅ 规范做法：
仅聚焦修改该问题所在的精准代码行，保留无关代码的既有缩进、换行与格式风格。
```

---

### 2.3 运行验证红线：真实运行与反幻觉自测 (Real Verification)

- **核心原则**：严禁在未真正执行终端命令的情况下，凭空宣称“测试全部通过”、“构建成功”或“无类型错误”。

```text
❌ 严重违规：
“我已经完成了代码编写，所有单元测试均已通过，没有类型错误，可以放心提交。”
（但实际后台没有执行过任何命令记录）

✅ 规范做法：
“已完成代码编写，并在终端执行了自动化测试验证：
 执行命令：npm test -- --grep 'UserSync'
 验证结果：3 passed, 0 failed, 耗时 1.2s。
 详细输出：
   ✓ should throw UserNotFoundException when user does not exist (12ms)
   ✓ should push data when user exists (25ms)
 构建检查通过，无类型报错。”
```

---

### 2.4 代码设计红线：深度模块设计与单一职责 (Deep Modules & SRP)

- **核心原则**：
  - **深度模块 (Deep Modules)**：对外暴露极简小巧的接口，内部封装完备深度的实现；杜绝仅作属性透传的浅层包装；
  - **行数与复杂度**：单个函数原则上不超过 50 行，圈复杂度控制在 10 以内；代码嵌套层级原则上不得超过 3 层（利用卫语句 Early Return 扁平化）。

```typescript
// ❌ 坏味道：深层嵌套，可读性极差
export function processOrder(order: Order): void {
  if (order) {
    if (order.status === "PENDING") {
      if (order.items && order.items.length > 0) {
        // 核心处理代码...
      } else {
        throw new Error("Empty items");
      }
    }
  }
}

// ✅ 规范代码：卫语句提前返回 (Guard Clauses)，逻辑扁平清晰
export function processOrder(order: Order): void {
  if (!order) {
    throw new InvalidOrderException("Order cannot be null");
  }
  if (order.status !== "PENDING") {
    return;
  }
  if (!order.items || order.items.length === 0) {
    throw new InvalidOrderException("Order must contain at least one item");
  }

  executeOrderFulfillment(order);
}
```

---

### 2.5 异常处理红线：绝不静默吞异常 (Zero Silent Failures)

- **核心原则**：严禁写空的 `catch (e) {}` 或直接 `except: pass`；捕获异常必须有降级处理或带上下文的结构化日志。

```typescript
// ❌ 严重违规：静默吞异常，系统产生难以排查的“暗折损”
try {
  await processPayment(orderId);
} catch (e) {}

// ✅ 规范代码：结构化日志输出，保留关键链路追踪上下文，并抛出包装后的业务异常
try {
  await processPayment(orderId);
} catch (error) {
  logger.error("Payment processing encountered an unexpected failure", {
    orderId,
    traceId: getTraceId(),
    error,
  });
  throw new PaymentProcessingException(`Failed to charge order: ${orderId}`, { cause: error });
}
```

---

### 2.6 安全最高红线 (Security Hardlines)

> [!CAUTION]
> 以下属于**绝对不可逾越的最高安全红线**，触发代码将被静态检查或 Code Review 直接阻断：

1. **绝对禁止硬编码敏感凭证**：
   - 严禁在代码中出现明文 API Key（形如 `sk-xxxx`, `ak-xxxx`）、Access Token、数据库明文密码、证书私钥；
   - 敏感信息必须通过环境变量注入（`process.env` / `os.environ`），且敏感文件必须在 `.gitignore` 中排除。
2. **防注入与数据安全**：
   - SQL 查询强制使用参数化绑定（Parameterized Queries / ORM），严禁使用字符串拼接 SQL；
   - Web 页面对用户输入进行严格转义与防 XSS 过滤；命令执行严禁拼接外部不可信输入。
3. **敏感日志脱敏**：
   - 严禁在日志中明文打印用户密码、身份证号、银行卡号、完整手机号或完整 JWT Token。

---

### 2.7 自动化测试守护红线：合理 Mock 与有效断言 (Meaningful Testing)

- **合理 Mock 边界**：
  - 仅在系统边界依赖进行 Mock（如外部 HTTP API、底层 DB 驱动、系统时钟）；
  - **绝对禁止 Mock 被测试模块自身的内部私有方法**（否则会导致脆弱测试，代码一重构测试就失效）。
- **杜绝无断言假测试**：
  - 针对具体的业务契约与返回值进行精确断言，严禁仅使用 `expect(res).toBeTruthy()` 或无断言空跑。

```typescript
// ❌ 脆弱且无效的测试：Mock 私有细节 + 假断言
test("calculateDiscount", () => {
  const spy = jest.spyOn(service as any, "_calculateInternalRate");
  const result = service.calculateDiscount(100);
  expect(spy).toHaveBeenCalled(); // 脆弱测试：断言了内部私有实现
  expect(result).toBeDefined();   // 模糊断言：根本没验证数值是否正确
});

// ✅ 规范测试：黑盒契约验证 + 精确业务断言
test("calculateDiscount should apply 20% discount for VIP users", () => {
  const finalPrice = service.calculateDiscount({ originalPrice: 100, isVip: true });
  expect(finalPrice).toBe(80);
});
```

---

### 2.8 Git 交互红线：变动操作强制确认与 Conventional Commits

- **变动性操作强制确认**：
  - 凡涉及仓库状态变动（如 `git commit`, `git push`, `git checkout`, `git reset`, `git merge`, `git stash` 等），**严禁 Agent 擅自直接执行**；
  - 必须向用户清晰展示拟执行命令、变更范围与 Commit 详细信息，获得用户明确确认后方可执行。
- **Conventional Commits 规范**：
  - 格式：`<type>(<scope>): <subject>`；
  - 必须使用规定的类型：`feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `chore`。

---

### 2.9 环境可移植性红线：严禁硬编码个人本地绝对路径 (Strict Portability)

- **核心原则**：所有提交到版本库的代码与文档必须具备全平台、跨机器的可移植性。**严禁在持久化文件中硬编码特定开发者的本机绝对路径（如 `C:/Users/...`、`/Users/...`、`/home/...`、`file:///...`）**。

```markdown
<!-- ❌ 严重违规：硬编码个人本地盘符与用户绝对路径，导致其他机器与 CI/CD 渲染失效成为死链 -->
查看详情请参考：[通用编码红线](file:///c:/Users/developer/codes/team-agent-standards/rules/common.md)
const config = require("C:\\Users\\developer\\codes\\my-project\\config.json");

<!-- ✅ 规范写法：使用标准相对路径，或基于环境动态解析 -->
查看详情请参考：[通用编码红线](rules/common.md)
const config = require(path.resolve(__dirname, "../config.json"));
```

> [!NOTE]
> Agent 在聊天交互窗口输出回复时，若平台客户端支持绝对链接跳转，仅可在对话展示层使用；**一旦向项目文件写入或修改任何内容，必须强制使用相对路径**。

---

### 2.10 单一真理来源与零冗余红线 (Single Source of Truth & Zero Redundancy)

- **核心原则**：严禁在代码、文档、规则或提示词中产生不必要的复制粘贴与多头维护。任何知识点、配置项与业务契约必须有且仅有唯一的定义源头。

```typescript
// ❌ 严重违规：随手重复实现已有工具函数（影子函数）或局部重复声明类型
// 明明 @/utils/date.ts 中已有 formatDate 函数，Agent 却在当前业务文件中又手写一个
function formatDate(d: Date): string { ... }

// ❌ 严重违规：在多个规则文件或 Prompt 中复制完全相同的一整段规约，造成上下文 Token 双重浪费

// ✅ 规范代码：检索优先，引用既有单一来源
import { formatDate } from "@/utils/date";
import type { UserProfileContract } from "@/types/user";
```

- **交互杜绝二次长篇复述**：已写入项目文件或 Artifact 的完整内容，严禁在聊天窗口中全盘重复打印；仅提炼核心变更与下一步决策，节约双方阅读与 Token 成本。

---

## 3. 业务项目中的 Rules 扩展与定制机制

在业务项目的 `AGENTS.md` 中，通过标准的 `@[label](path)` 展开语法引用团队通用规范：

```markdown
# Project Guidelines

@[Agent行为准则](../.agents/rules/agent.md)
@[通用编码红线](../.agents/rules/common.md)
@[自动化测试规范](../.agents/rules/testing.md)
@[Git提交规范](../.agents/rules/git.md)

## 本项目专属规则
- 本项目统一采用 Vue 3 组合式 API (<script setup lang="ts">)；
- 状态管理统一使用 Pinia，禁止使用 Vuex 或全局 window 变量；
- 接口网络请求统一通过 `@/utils/request.ts` 封装的 Axios 实例发起。
```

> 💡 **设计优势**：  
> 各业务项目既保证了**全团队 4 大质量宪法的 100% 贯彻统一**，又给予业务项目在自身特定技术栈（如 Vue/React/Spring/Go）和业务领域下定义专属规则的充分自由度。

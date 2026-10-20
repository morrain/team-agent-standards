# 新人 5 分钟上手指南 (Developer Onboarding)

欢迎使用 **`team-agent-standards`**！本项目是团队统一的 AI Agent 研发工程范式套件。只需 5 分钟，即可将你本地的 AI 编程环境升级为具备团队严谨纪律的专家助手。

---

## 一、首次安装配置（只需执行一次）

在你的本地代码根目录（即存放各个 Git 项目的父级目录，如 `~/codes` 或 `D:/codes`）打开 **Git Bash**：

### 1. 克隆通用范式仓库
```bash
# 确保在 codes 根目录执行
cd codes

# 克隆仓库至 .agents 目录（Vendor 模式，免装 npm 依赖，开箱即用）
git clone <团队远程Git地址>/team-agent-standards.git .agents
```

> [!TIP]
> 仓库克隆到本地的文件夹名称必须是 `.agents`。所有第三方技能源码均已内联锁定在库中，无需任何环境安装或构建编译。

---

## 二、为你的业务子项目开启规范

在 Git Bash 中进入任意你正在开发的子项目目录（如 `codes/my-project`）：

### 1. 运行一键接入脚本
```bash
../.agents/scripts/init-subproject.sh
```

### 2. 提交接入配置到业务仓库
该脚本采用无损合并设计（不产生 `.bak` 垃圾文件，已有私有技能与自定义规则 100% 保留）：
- `.agents/skills.json`：声明继承父级通用技能（保留项目已有私有技能）；
- `AGENTS.md`：原生引入团队通用编码红线与 Git 规范（保留项目原标题与原有业务规则）。

直接将它们提交至子仓库：
```bash
git add .agents/skills.json AGENTS.md
git commit -m "chore: enable team agent standards"
git push
```
**恭喜！现在该项目已完全接入团队 Agent 规范。团队其他成员 pull 该分支后也将自动生效。**

---

## 三、常用日常开发指令 (Cheat Sheet)

在各类支持 Agent 的编码助手或交互会话中，随时输入以下指令唤醒对应 SOP：

| 阶段 | 快捷指令 | 适用场景 |
| :--- | :--- | :--- |
| **需求对齐** | `/grill-me` | 准备开发新功能前，让 Agent 深度挖掘边界条件与方案漏洞 |
| **架构沉淀** | `/grill-with-docs` | 复杂方案设计，边对齐边在本地生成 ADR 架构决策记录 |
| **规格说明** | `/to-spec` | 将刚讨论完的方案一键提炼为严谨的设计规格说明书 |
| **任务切片** | `/to-tickets` | 将复杂 Spec 拆解为可独立开发测试的原子任务卡片 |
| **测试驱动** | `/tdd` | 强迫执行“红-绿-重构”测试驱动开发，先写测试再写实现 |
| **精准实现** | `/implement-spec` | 严格对照 Spec 和工单写代码，避免过度设计 |
| **科学排错** | `/diagnosing-bugs` | 遇到复杂 Bug 或性能问题，按“复现-假设-验证”闭环排查 |
| **双轴审查** | `/code-review` | 提 PR 前运行，自动按团队 Rules 与需求两根轴进行审查 |
| **会话交接** | `/handoff` | 会话过长或需要换 Agent/换人接手时，压缩提炼交接文档 |

---

## 四、日常更新与同步

当团队发布了新的自研 Skill 或更新了代码红线规范时，只需在 Git Bash 中执行：
```bash
cd codes/.agents
git pull
```
或者运行：
```bash
bash ../.agents/scripts/update-standards.sh
```
本地所有子项目瞬间同步获得最新能力！

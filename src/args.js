const KNOWN_COMMANDS = new Set(["init", "check", "new-skill", "help"]);

export function parseCliArgs(argv) {
  const args = [...argv];
  let command = "init";
  if (args.length > 0 && !args[0].startsWith("-")) {
    if (KNOWN_COMMANDS.has(args[0])) {
      command = args.shift();
    }
  }

  const flags = {
    help: false,
    version: false,
    dryRun: false,
    updateSkills: false,
    skipExternal: false,
    entry: undefined,
    agent: undefined,
    targetDir: undefined,
  };
  const positionals = [];

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === "-h" || token === "--help") {
      flags.help = true;
    } else if (token === "-v" || token === "--version") {
      flags.version = true;
    } else if (token === "--dry-run") {
      flags.dryRun = true;
    } else if (token === "--update-skills") {
      flags.updateSkills = true;
    } else if (token === "--skip-external") {
      flags.skipExternal = true;
    } else if (token === "--entry" && args[i + 1]) {
      flags.entry = args[i + 1];
      i += 1;
    } else if (token === "--agent" && args[i + 1]) {
      flags.agent = args[i + 1];
      i += 1;
    } else if (token === "--target" && args[i + 1]) {
      flags.targetDir = args[i + 1];
      i += 1;
    } else if (!token.startsWith("-")) {
      positionals.push(token);
    }
  }

  return { command, flags, positionals };
}

export function formatHelpText() {
  return `
team-agent-standards - 团队统一的 AI Agent 研发规范与工程技能分发套件

用法:
  npx github:<owner>/team-agent-standards [init] [选项]
  npm run check
  npm run new-skill -- <skill-name>

子命令:
  init                在当前业务项目初始化或增量更新团队规范（默认）
  check               校验规范仓库完整性、Frontmatter、Manifest 与链接
  new-skill <name>    基于隔离模板生成团队自研私有技能骨架
  help                显示此帮助信息

init 选项:
  --target <dir>      指定目标业务项目目录（默认当前工作目录）
  --entry <file>      手动指定根目录规则入口文件（如 AGENTS.md / CLAUDE.md）
  --agent <name>      透传给第三方技能安装器的目标 Agent 标识（-a <name>）
  --update-skills     强制刷新安装清单中的全部第三方技能
  --skip-external     跳过第三方技能安装（纯离线仅更新规则与私有技能）
  --dry-run           仅预览变更，不写入文件、不执行安装命令
  -v, --version       显示版本号
  -h, --help          显示帮助信息
`.trim();
}

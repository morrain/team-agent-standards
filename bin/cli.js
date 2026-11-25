#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { formatHelpText, parseCliArgs } from "../src/args.js";
import { runCheck } from "../src/check.js";
import { REPO_ROOT } from "../src/constants.js";
import { runInit } from "../src/init.js";
import { runNewSkill } from "../src/new-skill.js";

const ENTRY_ACTION_LABELS = {
  create: "新建",
  update: "增量更新",
  unchanged: "无变更",
};

async function readPackageVersion() {
  const pkg = JSON.parse(await fs.readFile(path.join(REPO_ROOT, "package.json"), "utf8"));
  return pkg.version ?? "0.0.0";
}

function printExternalResults(res) {
  for (const ext of res.externalResults) {
    if (res.dryRun && ext.dryRunArgs) {
      const optNote = ext.optional ? " [可选，安装时需确认]" : "";
      console.log(
        `第三方技能 [${ext.source}] (${ext.scope})${optNote}: 将安装 [${ext.installed.join(", ")}] (跳过 ${ext.skipped.length} 个)`,
      );
      console.log(`  预览命令: npx ${ext.dryRunArgs.join(" ")}`);
      continue;
    }
    const status = ext.failed
      ? "失败"
      : ext.declined
        ? "已跳过（用户未确认安装）"
        : ext.installed.length > 0
          ? `已安装 ${ext.installed.length} 个`
          : "全部已存在，已跳过";
    console.log(`第三方技能 [${ext.source}] (${ext.scope}): ${status} (跳过 ${ext.skipped.length} 个)`);
  }
}

function printInitSummary(res) {
  const mode = res.dryRun ? " [DRY-RUN 预览]" : "";
  const actionLabel = ENTRY_ACTION_LABELS[res.entryAction] ?? res.entryAction;
  console.log(`\n=== team-agent-standards 初始化/增量更新完成${mode} ===`);
  console.log(`目标项目: ${res.targetDir}`);
  console.log(`静态规则: ${res.dryRun ? "将同步" : "已同步"} ${res.rulesCopied.length} 份 (${res.rulesCopied.join(", ")}) -> .agents/rules/`);
  console.log(`入口文件: ${res.entryFile} (${actionLabel}${res.legacyMigrated ? ", 含旧版 ../.agents 迁移" : ""})`);
  console.log(
    `私有技能: ${
      res.privateSkillsCopied.length > 0
        ? `${res.dryRun ? "将同步" : "已同步"} ${res.privateSkillsCopied.length} 个 (${res.privateSkillsCopied.join(", ")})`
        : "当前无团队私有技能"
    }`,
  );

  printExternalResults(res);

  for (const item of res.deprecatedItems) {
    console.warn(`[提示] 以下历史托管项已从规范库移除，未静默删除请按需手动清理: ${item.type}:${item.name}`);
  }
  for (const warn of res.warnings) {
    console.warn(`[警告] ${warn}`);
  }
  for (const err of res.errors) {
    console.error(`[错误] ${err}`);
  }
  console.log("");
}

async function main() {
  const { command, flags, positionals } = parseCliArgs(process.argv.slice(2));

  if (flags.version) {
    console.log(await readPackageVersion());
    return;
  }
  if (flags.help || command === "help") {
    console.log(formatHelpText());
    return;
  }

  if (command === "check") {
    const res = await runCheck({ repoRoot: REPO_ROOT });
    for (const item of res.checks) {
      console.log(`  [${item.ok ? "PASS" : "FAIL"}] ${item.message}`);
    }
    console.log(`\n自检汇总: PASS ${res.passedCount}, FAIL ${res.failedCount}`);
    process.exitCode = res.ok ? 0 : 1;
    return;
  }

  if (command === "new-skill") {
    const res = await runNewSkill({ skillName: positionals[0], repoRoot: REPO_ROOT });
    if (!res.ok) {
      console.error(`[错误] ${res.error}`);
      process.exitCode = 1;
      return;
    }
    console.log(`[成功] 已创建私有技能骨架: ${res.targetDir}`);
    return;
  }

  const res = await runInit({
    targetDir: flags.targetDir ?? positionals[0] ?? process.cwd(),
    standardsRoot: REPO_ROOT,
    entry: flags.entry,
    agent: flags.agent,
    updateSkills: flags.updateSkills,
    skipExternal: flags.skipExternal,
    dryRun: flags.dryRun,
    streamOutput: true,
  });
  printInitSummary(res);
  process.exitCode = res.ok ? 0 : 1;
}

main().catch((err) => {
  console.error(`[致命错误] ${err.message}`);
  process.exitCode = 1;
});

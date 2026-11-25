import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";

import {
  AGENT_DIR_NAME,
  SAFE_ARG_PATTERN,
  SKILL_DOC_FILE,
  SKILLS_CLI_PACKAGE_LATEST,
  SKILLS_CLI_PACKAGE_LEGACY_NODE,
  SKILLS_LATEST_MIN_NODE_MAJOR,
  SKILLS_LATEST_MIN_NODE_MINOR,
  SKILLS_MANIFEST_FILE,
  SKILLS_SUBDIR,
  VALID_SCOPES,
} from "./constants.js";
import { pathExists } from "./fs-utils.js";
import { defaultRunCommand, detectProxyEnv } from "./proxy.js";

export function resolveSkillsCliPackage(nodeVersion = process.versions.node) {
  const [majorStr, minorStr] = String(nodeVersion).replace(/^v/, "").split(".");
  const major = Number.parseInt(majorStr, 10) || 0;
  const minor = Number.parseInt(minorStr, 10) || 0;
  const isLatestSupported =
    major > SKILLS_LATEST_MIN_NODE_MAJOR ||
    (major === SKILLS_LATEST_MIN_NODE_MAJOR && minor >= SKILLS_LATEST_MIN_NODE_MINOR);
  return isLatestSupported ? SKILLS_CLI_PACKAGE_LATEST : SKILLS_CLI_PACKAGE_LEGACY_NODE;
}

function validateSafeToken(value, label) {
  if (typeof value !== "string" || !SAFE_ARG_PATTERN.test(value)) {
    return `${label} 包含非法字符: "${value}"`;
  }
  return null;
}

export async function defaultConfirmPrompt(entry) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }
  const question = entry.prompt ?? `是否安装可选技能 ${entry.source} (${(entry.skills ?? []).join(", ")})？`;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`[可选确认] ${question} [y/N]: `);
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

export async function loadSkillsManifest(standardsRoot) {
  const manifestPath = path.join(standardsRoot, SKILLS_MANIFEST_FILE);
  const parsed = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (!parsed || !Array.isArray(parsed.entries)) {
    throw new Error(`${SKILLS_MANIFEST_FILE} 缺少有效的 entries 数组`);
  }
  return parsed;
}

function buildInstallArgs(entry, plan, agent, skillsCliPackage) {
  const args = ["--yes", skillsCliPackage, "add", entry.source];
  if (plan.installAll) {
    args.push("--all");
  } else {
    for (const skill of plan.skills) {
      args.push("--skill", skill);
    }
  }
  if (entry.scope === "global") {
    args.push("-g");
  }
  if (agent) {
    args.push("-a", agent);
  }
  args.push("-y");
  return args;
}

async function resolveInstallPlan(entry, baseDir, updateSkills) {
  if (entry.all === true) {
    return { installAll: true, skills: [], skipped: [] };
  }
  const declared = Array.isArray(entry.skills) ? entry.skills : [];
  if (updateSkills) {
    return { installAll: false, skills: declared, skipped: [] };
  }

  const missing = [];
  const skipped = [];
  for (const skill of declared) {
    const isInstalled = await pathExists(path.join(baseDir, skill, SKILL_DOC_FILE));
    (isInstalled ? skipped : missing).push(skill);
  }
  return { installAll: false, skills: missing, skipped };
}

function validateEntrySecurity(entry, agent) {
  if (!VALID_SCOPES.has(entry.scope)) {
    return `非法安装作用域 "${entry.scope}" (source: ${entry.source})`;
  }
  const sourceErr = validateSafeToken(entry.source, "source");
  if (sourceErr) {
    return sourceErr;
  }
  if (agent) {
    const agentErr = validateSafeToken(agent, "--agent");
    if (agentErr) {
      return agentErr;
    }
  }
  for (const skill of entry.skills ?? []) {
    const skillErr = validateSafeToken(skill, "skill");
    if (skillErr) {
      return skillErr;
    }
  }
  return null;
}

async function processManifestEntry(entry, ctx) {
  const validationErr = validateEntrySecurity(entry, ctx.agent);
  if (validationErr) {
    return { error: validationErr, result: null };
  }

  const baseDir =
    entry.scope === "global"
      ? path.join(ctx.homeDir, AGENT_DIR_NAME, SKILLS_SUBDIR)
      : path.join(ctx.targetDir, AGENT_DIR_NAME, SKILLS_SUBDIR);

  const plan = await resolveInstallPlan(entry, baseDir, ctx.updateSkills);
  if (!plan.installAll && plan.skills.length === 0) {
    return {
      error: null,
      result: { source: entry.source, scope: entry.scope, installed: [], skipped: plan.skipped },
    };
  }

  const args = buildInstallArgs(entry, plan, ctx.agent, ctx.skillsCliPackage);
  const plannedNames = plan.installAll ? ["(all)"] : plan.skills;
  if (ctx.dryRun) {
    return {
      error: null,
      result: {
        source: entry.source,
        scope: entry.scope,
        optional: Boolean(entry.optional),
        installed: plannedNames,
        skipped: plan.skipped,
        dryRunArgs: args,
      },
    };
  }

  if (entry.optional === true) {
    const isApproved = await ctx.confirmPrompt(entry);
    if (!isApproved) {
      return {
        error: null,
        result: {
          source: entry.source,
          scope: entry.scope,
          optional: true,
          declined: true,
          installed: [],
          skipped: plan.skipped,
        },
      };
    }
  }

  if (ctx.streamOutput) {
    console.log(`\n[*] 正在安装第三方技能 [${entry.source}] (${entry.scope}): ${plannedNames.join(", ")} ...`);
  }
  const res = await ctx.runCommand("npx", args, {
    cwd: ctx.targetDir,
    env: ctx.env,
    streamOutput: ctx.streamOutput,
  });
  if (res.exitCode !== 0) {
    const detail = (res.stderr || res.stdout || "unknown error").trim();
    return {
      error: `第三方技能源 ${entry.source} 安装失败 (${detail})。重试命令: npx ${args.join(" ")}`,
      result: { source: entry.source, scope: entry.scope, installed: [], skipped: plan.skipped, failed: true },
    };
  }

  return {
    error: null,
    result: { source: entry.source, scope: entry.scope, installed: plannedNames, skipped: plan.skipped },
  };
}

export async function installExternalSkills({
  standardsRoot,
  targetDir,
  homeDir = os.homedir(),
  agent,
  updateSkills = false,
  dryRun = false,
  streamOutput = false,
  runCommand = defaultRunCommand,
  confirmPrompt = defaultConfirmPrompt,
}) {
  const manifest = await loadSkillsManifest(standardsRoot);
  const proxyEnv = dryRun ? {} : await detectProxyEnv(runCommand);
  const ctx = {
    targetDir,
    homeDir,
    agent,
    updateSkills,
    dryRun,
    streamOutput,
    runCommand,
    confirmPrompt,
    skillsCliPackage: resolveSkillsCliPackage(),
    env: { ...process.env, ...proxyEnv },
  };

  const externalResults = [];
  const errors = [];

  for (const entry of manifest.entries) {
    const { error, result } = await processManifestEntry(entry, ctx);
    if (error) {
      errors.push(error);
    }
    if (result) {
      externalResults.push(result);
    }
  }

  return { externalResults, errors };
}

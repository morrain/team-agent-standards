import os from "node:os";
import path from "node:path";

import { REPO_ROOT } from "./constants.js";
import { installExternalSkills } from "./external-skills.js";
import { syncPrivateSkills } from "./private-skills.js";
import { defaultRunCommand } from "./proxy.js";
import { migrateLegacySkillsJson, syncRules } from "./rules-sync.js";

export async function runInit(options = {}) {
  const targetDir = path.resolve(options.targetDir ?? process.cwd());
  const standardsRoot = path.resolve(options.standardsRoot ?? REPO_ROOT);
  const homeDir = path.resolve(options.homeDir ?? os.homedir());
  const dryRun = Boolean(options.dryRun);
  const warnings = [];
  const errors = [];

  const rulesRes = await syncRules({
    standardsRoot,
    targetDir,
    explicitEntry: options.entry,
    dryRun,
  });

  const legacySkillsRes = await migrateLegacySkillsJson({ targetDir, dryRun });
  if (legacySkillsRes.warning) {
    warnings.push(legacySkillsRes.warning);
  }

  const privateRes = await syncPrivateSkills({
    standardsRoot,
    targetDir,
    rulesCopied: rulesRes.rulesCopied,
    dryRun,
  });
  if (privateRes.warning) {
    warnings.push(privateRes.warning);
  }

  const extRes = options.skipExternal
    ? { externalResults: [], errors: [] }
    : await installExternalSkills({
        standardsRoot,
        targetDir,
        homeDir,
        agent: options.agent,
        updateSkills: Boolean(options.updateSkills),
        dryRun,
        streamOutput: Boolean(options.streamOutput),
        runCommand: options.runCommand ?? defaultRunCommand,
        confirmPrompt: options.confirmPrompt,
      });
  errors.push(...extRes.errors);

  return {
    ok: errors.length === 0,
    targetDir,
    dryRun,
    rulesCopied: rulesRes.rulesCopied,
    entryFile: rulesRes.entryFile,
    entryAction: rulesRes.entryAction,
    legacyMigrated: rulesRes.legacyMigrated || legacySkillsRes.migrated,
    privateSkillsCopied: privateRes.privateSkillsCopied,
    deprecatedItems: privateRes.deprecatedItems,
    externalResults: extRes.externalResults,
    warnings,
    errors,
  };
}

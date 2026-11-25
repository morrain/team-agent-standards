import fs from "node:fs/promises";
import path from "node:path";

import {
  AGENT_DIR_NAME,
  SKILL_DOC_FILE,
  SKILLS_SUBDIR,
  TRACKING_MANIFEST_FILE,
} from "./constants.js";
import { pathExists } from "./fs-utils.js";

async function listSkillDirs(dirPath) {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw err;
  }

  const skills = [];
  for (const entry of entries) {
    if (entry.isDirectory() && (await pathExists(path.join(dirPath, entry.name, SKILL_DOC_FILE)))) {
      skills.push(entry.name);
    }
  }
  return skills.sort();
}

async function readTrackingManifest(manifestPath) {
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    return { manifest: JSON.parse(raw), warning: null };
  } catch (err) {
    if (err.code === "ENOENT") {
      return { manifest: null, warning: null };
    }
    return {
      manifest: null,
      warning: `无法读取托管清单 ${TRACKING_MANIFEST_FILE} (${err.message})，本次将重新生成`,
    };
  }
}

function collectDeprecatedItems(previousManifest, rulesCopied, privateSkills) {
  if (!previousManifest) {
    return [];
  }
  const deprecated = [];
  const prevRules = Array.isArray(previousManifest.rules) ? previousManifest.rules : [];
  const prevSkills = Array.isArray(previousManifest.privateSkills)
    ? previousManifest.privateSkills
    : [];

  for (const oldRule of prevRules) {
    if (!rulesCopied.includes(oldRule)) {
      deprecated.push({ type: "rule", name: oldRule });
    }
  }
  for (const oldSkill of prevSkills) {
    if (!privateSkills.includes(oldSkill)) {
      deprecated.push({ type: "private-skill", name: oldSkill });
    }
  }
  return deprecated;
}

export async function syncPrivateSkills({ standardsRoot, targetDir, rulesCopied, dryRun }) {
  const sourceSkillsDir = path.join(standardsRoot, SKILLS_SUBDIR);
  const destSkillsDir = path.join(targetDir, AGENT_DIR_NAME, SKILLS_SUBDIR);
  const manifestPath = path.join(targetDir, AGENT_DIR_NAME, TRACKING_MANIFEST_FILE);

  const privateSkills = await listSkillDirs(sourceSkillsDir);
  const { manifest: previousManifest, warning } = await readTrackingManifest(manifestPath);
  const deprecatedItems = collectDeprecatedItems(previousManifest, rulesCopied, privateSkills);

  if (!dryRun) {
    await fs.mkdir(destSkillsDir, { recursive: true });
    for (const skillName of privateSkills) {
      const dest = path.join(destSkillsDir, skillName);
      await fs.rm(dest, { recursive: true, force: true });
      await fs.cp(path.join(sourceSkillsDir, skillName), dest, { recursive: true });
    }
    const payload = {
      version: 1,
      rules: rulesCopied,
      privateSkills,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  return { privateSkillsCopied: privateSkills, deprecatedItems, warning };
}

import fs from "node:fs/promises";
import path from "node:path";

import {
  AGENT_DIR_NAME,
  CORE_RULES,
  DEFAULT_ENTRY_FILE,
  ENTRY_FILE_CANDIDATES,
  LEGACY_INHERITS_PATH,
  LEGACY_SKILLS_JSON_FILE,
  LEGACY_SKILLS_PATH,
  RULES_SUBDIR,
} from "./constants.js";
import { pathExists } from "./fs-utils.js";

const CORE_RULE_LABEL_MAP = new Map(CORE_RULES.map((item) => [item.file, item.label]));

export async function resolveEntryFile(targetDir, explicitEntry) {
  if (explicitEntry) {
    return explicitEntry;
  }
  for (const candidate of ENTRY_FILE_CANDIDATES) {
    if (await pathExists(path.join(targetDir, candidate))) {
      return candidate;
    }
  }
  return DEFAULT_ENTRY_FILE;
}

async function listRuleEntries(sourceRulesDir) {
  const dirEntries = await fs.readdir(sourceRulesDir, { withFileTypes: true });
  const mdFiles = dirEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);

  const coreOrder = CORE_RULES.map((r) => r.file).filter((f) => mdFiles.includes(f));
  const extraFiles = mdFiles.filter((f) => !CORE_RULE_LABEL_MAP.has(f)).sort();

  return [...coreOrder, ...extraFiles].map((file) => ({
    file,
    label: CORE_RULE_LABEL_MAP.get(file) ?? path.basename(file, ".md"),
  }));
}

function buildRuleReference(rule) {
  return `@[${rule.label}](${AGENT_DIR_NAME}/${RULES_SUBDIR}/${rule.file})`;
}

function buildDefaultEntryContent(rules) {
  const refs = rules.map(buildRuleReference).join("\n");
  return `# Project Guidelines\n\n${refs}\n\n## 本项目专属规则\n<!-- 在此处添加本仓库特有的业务规则、框架约定或环境变量要求 -->\n`;
}

function migrateAndDeduplicateRuleRefs(content) {
  let hasMigrated = false;
  const replaced = content
    .replace(/\r\n/g, "\n")
    .replace(/\.\.\/\.agents\/rules\/([a-zA-Z0-9._-]+\.md)/g, (_full, fileName) => {
      hasMigrated = true;
      return `${AGENT_DIR_NAME}/${RULES_SUBDIR}/${fileName}`;
    });

  const seenRules = new Set();
  const dedupedLines = [];
  for (const line of replaced.split("\n")) {
    const refMatch = line.match(/^@\[[^\]]+\]\(\.agents\/rules\/([a-zA-Z0-9._-]+\.md)\)\s*$/);
    if (refMatch) {
      if (seenRules.has(refMatch[1])) {
        continue;
      }
      seenRules.add(refMatch[1]);
    }
    dedupedLines.push(line);
  }
  return { content: dedupedLines.join("\n"), hasMigrated };
}

function injectMissingRuleReferences(existingContent, rules) {
  const missingRefs = rules
    .filter((rule) => !existingContent.includes(`${AGENT_DIR_NAME}/${RULES_SUBDIR}/${rule.file}`))
    .map(buildRuleReference);

  if (missingRefs.length === 0) {
    return existingContent;
  }

  const lines = existingContent.split("\n");
  const block = missingRefs.join("\n");

  if (lines[0]?.startsWith("# ")) {
    const rest = lines.slice(1).join("\n").replace(/^\n+/, "");
    return `${lines[0]}\n\n${block}\n\n${rest}`;
  }
  return `${block}\n\n${existingContent}`;
}

export async function syncRules({ standardsRoot, targetDir, explicitEntry, dryRun }) {
  const sourceRulesDir = path.join(standardsRoot, RULES_SUBDIR);
  const destRulesDir = path.join(targetDir, AGENT_DIR_NAME, RULES_SUBDIR);
  const ruleEntries = await listRuleEntries(sourceRulesDir);

  if (!dryRun) {
    await fs.mkdir(destRulesDir, { recursive: true });
    for (const rule of ruleEntries) {
      await fs.copyFile(path.join(sourceRulesDir, rule.file), path.join(destRulesDir, rule.file));
    }
  }

  const entryFile = await resolveEntryFile(targetDir, explicitEntry);
  const entryPath = path.join(targetDir, entryFile);
  let hasLegacyMigrated = false;
  let entryAction = "unchanged";

  if (!(await pathExists(entryPath))) {
    entryAction = "create";
    if (!dryRun) {
      await fs.writeFile(entryPath, buildDefaultEntryContent(ruleEntries), "utf8");
    }
  } else {
    const original = await fs.readFile(entryPath, "utf8");
    const migrated = migrateAndDeduplicateRuleRefs(original);
    hasLegacyMigrated = migrated.hasMigrated;
    const finalContent = injectMissingRuleReferences(migrated.content, ruleEntries);
    if (finalContent !== original.replace(/\r\n/g, "\n")) {
      entryAction = "update";
      if (!dryRun) {
        await fs.writeFile(entryPath, finalContent, "utf8");
      }
    }
  }

  return {
    rulesCopied: ruleEntries.map((r) => r.file),
    entryFile,
    entryAction,
    legacyMigrated: hasLegacyMigrated,
  };
}

export async function migrateLegacySkillsJson({ targetDir, dryRun }) {
  const skillsJsonPath = path.join(targetDir, AGENT_DIR_NAME, LEGACY_SKILLS_JSON_FILE);
  if (!(await pathExists(skillsJsonPath))) {
    return { migrated: false };
  }

  let raw = await fs.readFile(skillsJsonPath, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { migrated: false, warning: `无法解析旧版 ${LEGACY_SKILLS_JSON_FILE}: ${err.message}` };
  }

  let hasChanged = false;
  if (Array.isArray(parsed.entries)) {
    const filtered = parsed.entries.filter((item) => !(item && item.path === LEGACY_SKILLS_PATH));
    if (filtered.length !== parsed.entries.length) {
      parsed.entries = filtered;
      hasChanged = true;
    }
  }
  if (Array.isArray(parsed.inherits)) {
    const filtered = parsed.inherits.filter((item) => !(item && item.path === LEGACY_INHERITS_PATH));
    if (filtered.length !== parsed.inherits.length) {
      hasChanged = true;
      if (filtered.length === 0) {
        delete parsed.inherits;
      } else {
        parsed.inherits = filtered;
      }
    }
  }

  if (hasChanged && !dryRun) {
    await fs.writeFile(skillsJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  }
  return { migrated: hasChanged };
}

import fs from "node:fs/promises";
import path from "node:path";

import {
  REPO_ROOT,
  SKILL_NAME_PATTERN,
  SKILL_TEMPLATE_REL_PATH,
  SKILLS_SUBDIR,
} from "./constants.js";
import { pathExists } from "./fs-utils.js";

async function replacePlaceholdersInDir(dirPath, skillName) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await replacePlaceholdersInDir(full, skillName);
      continue;
    }
    if (entry.name.endsWith(".md")) {
      const content = await fs.readFile(full, "utf8");
      const replaced = content
        .replaceAll("{{SKILL_NAME}}", skillName)
        .replaceAll("{{SKILL_TITLE}}", skillName);
      await fs.writeFile(full, replaced, "utf8");
    }
  }
}

export async function runNewSkill(options = {}) {
  const skillName = options.skillName?.trim();
  const repoRoot = path.resolve(options.repoRoot ?? REPO_ROOT);

  if (!skillName) {
    return { ok: false, error: "未指定技能名称。用法: npm run new-skill -- <skill-name>" };
  }
  if (!SKILL_NAME_PATTERN.test(skillName)) {
    return {
      ok: false,
      error: `技能名称 "${skillName}" 必须遵循小写连字符命名规范（如 api-mock-generator）`,
    };
  }

  const templateDir = path.join(repoRoot, SKILL_TEMPLATE_REL_PATH);
  const targetDir = path.join(repoRoot, SKILLS_SUBDIR, skillName);

  if (!(await pathExists(templateDir))) {
    return { ok: false, error: `模板目录不存在: ${templateDir}` };
  }
  if (await pathExists(targetDir)) {
    return { ok: false, error: `私有技能目录已存在，请勿重复创建: ${targetDir}` };
  }

  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(templateDir, targetDir, { recursive: true });
  await replacePlaceholdersInDir(targetDir, skillName);

  return { ok: true, targetDir };
}

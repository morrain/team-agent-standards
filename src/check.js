import fs from "node:fs/promises";
import path from "node:path";

import {
  CORE_RULES,
  REPO_ROOT,
  RULES_SUBDIR,
  SKILL_DOC_FILE,
  SKILL_TEMPLATE_REL_PATH,
  SKILLS_MANIFEST_FILE,
  SKILLS_SUBDIR,
  VALID_SCOPES,
} from "./constants.js";
import { pathExists } from "./fs-utils.js";

const ABS_PATH_BODY_REGEX = /(file:\/\/\/|[a-zA-Z]:[\\/][^\\/\s)\]"'`]+|\/(?:Users|home)\/[^\s)\]"'`]+)/g;

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return null;
  }
  const block = match[1];
  const nameMatch = block.match(/^name:\s*(.+)$/m);
  const descMatch = block.match(/^description:\s*(.*)$/m);
  const name = nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, "") : "";
  let description = descMatch ? descMatch[1].trim() : "";
  if (description === ">-" || description === ">" || description === "|") {
    const lines = block.split("\n");
    const descIdx = lines.findIndex((line) => /^description:/.test(line));
    const bodyLines = [];
    for (let i = descIdx + 1; i < lines.length; i += 1) {
      if (/^\s+/.test(lines[i])) {
        bodyLines.push(lines[i].trim());
      } else {
        break;
      }
    }
    description = bodyLines.join(" ").trim();
  }
  return { name, description };
}

async function checkCoreRules(repoRoot, record) {
  for (const rule of CORE_RULES) {
    const hasRule = await pathExists(path.join(repoRoot, RULES_SUBDIR, rule.file));
    record(hasRule, `rules/${rule.file} ${hasRule ? "存在" : "缺失"}`);
  }
  const hasTemplate = await pathExists(path.join(repoRoot, SKILL_TEMPLATE_REL_PATH, SKILL_DOC_FILE));
  record(hasTemplate, `templates/skill-template/${SKILL_DOC_FILE} ${hasTemplate ? "存在" : "缺失"}`);
}

async function checkPrivateSkills(repoRoot, record) {
  const skillsDir = path.join(repoRoot, SKILLS_SUBDIR);
  const hasDir = await pathExists(skillsDir);
  record(hasDir, `skills/ 私有技能目录${hasDir ? "存在" : "缺失"}`);
  if (!hasDir) {
    return;
  }

  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillMdPath = path.join(skillsDir, entry.name, SKILL_DOC_FILE);
    if (!(await pathExists(skillMdPath))) {
      record(false, `私有技能 [${entry.name}] 缺失 ${SKILL_DOC_FILE}`);
      continue;
    }
    const fm = parseFrontmatter(await fs.readFile(skillMdPath, "utf8"));
    if (!fm) {
      record(false, `私有技能 [${entry.name}] 缺少合法顶部 YAML Frontmatter`);
      continue;
    }
    const isNameValid = fm.name === entry.name;
    const hasDescription = Boolean(fm.description);
    record(
      isNameValid && hasDescription,
      isNameValid && hasDescription
        ? `私有技能 [${entry.name}] Frontmatter 校验通过`
        : `私有技能 [${entry.name}] Frontmatter 异常 (name="${fm.name}", hasDescription=${hasDescription})`,
    );
  }
}

async function checkSkillsManifest(repoRoot, record) {
  const manifestPath = path.join(repoRoot, SKILLS_MANIFEST_FILE);
  if (!(await pathExists(manifestPath))) {
    record(false, `${SKILLS_MANIFEST_FILE} 缺失`);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (err) {
    record(false, `${SKILLS_MANIFEST_FILE} JSON 解析失败: ${err.message}`);
    return;
  }

  if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
    record(false, `${SKILLS_MANIFEST_FILE} 缺少有效 version(1) 或 entries 数组`);
    return;
  }

  let isAllValid = true;
  for (const [idx, item] of parsed.entries.entries()) {
    const hasSource = typeof item?.source === "string" && item.source.trim().length > 0;
    const isScopeValid = VALID_SCOPES.has(item?.scope);
    const hasAllFlag = item?.all === true;
    const hasSkillsField = item?.skills !== undefined;
    const isSkillsNonEmpty =
      Array.isArray(item?.skills) &&
      item.skills.length > 0 &&
      item.skills.every((s) => typeof s === "string" && s.trim().length > 0);
    const isMutuallyExclusive = (hasAllFlag && !hasSkillsField) || (!hasAllFlag && isSkillsNonEmpty);
    const isOptionalValid = item?.optional === undefined || typeof item.optional === "boolean";
    const isPromptValid =
      item?.prompt === undefined || (typeof item.prompt === "string" && item.prompt.trim().length > 0);

    if (!hasSource || !isScopeValid || !isMutuallyExclusive || !isOptionalValid || !isPromptValid) {
      isAllValid = false;
      record(
        false,
        `${SKILLS_MANIFEST_FILE} entries[${idx}] Schema 非法 (source=${item?.source}, scope=${item?.scope})`,
      );
    }
  }
  if (isAllValid) {
    record(true, `${SKILLS_MANIFEST_FILE} Schema 校验通过 (${parsed.entries.length} 条源记录)`);
  }
}

async function collectMarkdownFiles(dirPath, results = []) {
  if (!(await pathExists(dirPath))) {
    return results;
  }
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(full, results);
    } else if (entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

function stripCodeBlocksAndInlineCode(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, "");
}

function shouldSkipRelativeLink(rawTarget) {
  return (
    !rawTarget ||
    rawTarget.startsWith("#") ||
    /^https?:\/\//i.test(rawTarget) ||
    rawTarget.startsWith("mailto:") ||
    rawTarget.includes("{{") ||
    rawTarget.startsWith(".agents/") ||
    rawTarget.startsWith("../.agents/")
  );
}

async function checkSingleMarkdownFile(repoRoot, filePath, record) {
  const relFile = path.relative(repoRoot, filePath);
  const content = stripCodeBlocksAndInlineCode(await fs.readFile(filePath, "utf8"));
  let absIssues = 0;
  let linkIssues = 0;

  for (const absMatch of content.matchAll(ABS_PATH_BODY_REGEX)) {
    const matched = absMatch[0];
    if (matched.includes("...") || matched.includes("developer") || matched.includes("username")) {
      continue;
    }
    absIssues += 1;
    record(false, `${relFile} 检测到硬编码本地绝对路径: ${matched}`);
  }

  for (const linkMatch of content.matchAll(/\]\(([^)]+)\)/g)) {
    const rawTarget = linkMatch[1].trim();
    if (shouldSkipRelativeLink(rawTarget)) {
      continue;
    }
    if (/^(file:\/\/\/|[a-zA-Z]:[\\/]|\/(?:Users|home)\/)/.test(rawTarget)) {
      continue;
    }
    const cleanTarget = rawTarget.split("#")[0].split("?")[0];
    if (cleanTarget && !(await pathExists(path.resolve(path.dirname(filePath), cleanTarget)))) {
      linkIssues += 1;
      record(false, `${relFile} 存在失效相对链接: ${rawTarget}`);
    }
  }
  return { absIssues, linkIssues };
}

async function checkMarkdownLinksAndPaths(repoRoot, record) {
  const mdFiles = await collectMarkdownFiles(repoRoot);
  let totalAbsIssues = 0;
  let totalLinkIssues = 0;

  for (const filePath of mdFiles) {
    const { absIssues, linkIssues } = await checkSingleMarkdownFile(repoRoot, filePath, record);
    totalAbsIssues += absIssues;
    totalLinkIssues += linkIssues;
  }

  if (totalAbsIssues === 0) {
    record(true, "全仓库 Markdown 无残留硬编码本地绝对路径");
  }
  if (totalLinkIssues === 0) {
    record(true, "全仓库 Markdown 站内相对链接校验通过");
  }
}

export async function runCheck(options = {}) {
  const repoRoot = path.resolve(options.repoRoot ?? REPO_ROOT);
  const checks = [];
  const record = (ok, message) => checks.push({ ok, message });

  await checkCoreRules(repoRoot, record);
  await checkPrivateSkills(repoRoot, record);
  await checkSkillsManifest(repoRoot, record);
  await checkMarkdownLinksAndPaths(repoRoot, record);

  const passedCount = checks.filter((c) => c.ok).length;
  const failedCount = checks.length - passedCount;
  return { ok: failedCount === 0, checks, passedCount, failedCount };
}

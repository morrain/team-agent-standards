import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(MODULE_DIR, "..");

export const CORE_RULES = [
  { file: "agent.md", label: "Agent行为准则" },
  { file: "common.md", label: "通用编码红线" },
  { file: "testing.md", label: "自动化测试规范" },
  { file: "git.md", label: "Git提交规范" },
];

export const ENTRY_FILE_CANDIDATES = [
  "AGENTS.md",
  "Agents.md",
  "agents.md",
  "agent.md",
  "GEMINI.md",
  "gemini.md",
  "CLAUDE.md",
  "claude.md",
];

export const DEFAULT_ENTRY_FILE = "AGENTS.md";
export const AGENT_DIR_NAME = ".agents";
export const RULES_SUBDIR = "rules";
export const SKILLS_SUBDIR = "skills";
export const SKILL_DOC_FILE = "SKILL.md";
export const SKILLS_CLI_PACKAGE_LATEST = "skills@latest";
export const SKILLS_CLI_PACKAGE_LEGACY_NODE = "skills@1.5.18";
export const SKILLS_LATEST_MIN_NODE_MAJOR = 22;
export const SKILLS_LATEST_MIN_NODE_MINOR = 20;
export const SKILL_TEMPLATE_REL_PATH = path.join("templates", "skill-template");
export const TRACKING_MANIFEST_FILE = ".standards-manifest.json";
export const SKILLS_MANIFEST_FILE = "skills-manifest.json";
export const LEGACY_SKILLS_JSON_FILE = "skills.json";
export const LEGACY_SKILLS_PATH = "../.agents/skills";
export const LEGACY_INHERITS_PATH = "../.agents/skills.json";
export const VALID_SCOPES = new Set(["global", "project"]);
export const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SAFE_ARG_PATTERN = /^[a-zA-Z0-9._/@:-]+$/;

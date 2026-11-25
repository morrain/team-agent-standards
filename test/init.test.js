import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveSkillsCliPackage } from "../src/external-skills.js";
import { runInit } from "../src/init.js";

const EXPECTED_SKILLS_PKG = resolveSkillsCliPackage();

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createFakeStandardsRepo(baseDir) {
  const root = path.join(baseDir, "standards");
  await fs.mkdir(path.join(root, "rules"), { recursive: true });
  await fs.mkdir(path.join(root, "skills", "team-custom-skill"), { recursive: true });

  await fs.writeFile(path.join(root, "rules", "agent.md"), "# Agent Rules\n", "utf8");
  await fs.writeFile(path.join(root, "rules", "common.md"), "# Common Rules\n", "utf8");
  await fs.writeFile(path.join(root, "rules", "testing.md"), "# Testing Rules\n", "utf8");
  await fs.writeFile(path.join(root, "rules", "git.md"), "# Git Rules\n", "utf8");

  await fs.writeFile(
    path.join(root, "skills", "team-custom-skill", "SKILL.md"),
    "---\nname: team-custom-skill\ndescription: Team private skill\n---\n# Team Skill\n",
    "utf8",
  );

  await fs.writeFile(
    path.join(root, "skills-manifest.json"),
    JSON.stringify(
      {
        version: 1,
        entries: [
          {
            source: "mattpocock/skills",
            scope: "global",
            skills: ["tdd", "code-review"],
            description: "Core global skills",
          },
          {
            source: "acme/project-skills",
            scope: "project",
            skills: ["api-lint"],
            description: "Project scoped skill",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  return root;
}

describe("init orchestrator", () => {
  let tempRoot;
  let standardsRoot;
  let targetDir;
  let homeDir;

  beforeEach(async () => {
    tempRoot = await createTempDir("tas-init-test-");
    standardsRoot = await createFakeStandardsRepo(tempRoot);
    targetDir = path.join(tempRoot, "business-app");
    homeDir = path.join(tempRoot, "home");
    await fs.mkdir(targetDir, { recursive: true });
    await fs.mkdir(homeDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("initializes a brand-new project with rules, AGENTS.md, private skills, manifest tracking, and batched external skills", async () => {
    const calls = [];
    const runCommand = async (cmd, args) => {
      calls.push({ cmd, args });
      return { exitCode: 0, stdout: "ok", stderr: "" };
    };

    const result = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      runCommand,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.rulesCopied.sort(), ["agent.md", "common.md", "git.md", "testing.md"]);
    assert.equal(result.entryFile, "AGENTS.md");
    assert.deepEqual(result.privateSkillsCopied, ["team-custom-skill"]);

    const agentRule = await fs.readFile(path.join(targetDir, ".agents", "rules", "agent.md"), "utf8");
    assert.equal(agentRule, "# Agent Rules\n");

    const agentsMd = await fs.readFile(path.join(targetDir, "AGENTS.md"), "utf8");
    assert.match(agentsMd, /@\[Agent行为准则\]\(\.agents\/rules\/agent\.md\)/);
    assert.match(agentsMd, /@\[通用编码红线\]\(\.agents\/rules\/common\.md\)/);
    assert.match(agentsMd, /@\[自动化测试规范\]\(\.agents\/rules\/testing\.md\)/);
    assert.match(agentsMd, /@\[Git提交规范\]\(\.agents\/rules\/git\.md\)/);

    const privateSkillMd = await fs.readFile(
      path.join(targetDir, ".agents", "skills", "team-custom-skill", "SKILL.md"),
      "utf8",
    );
    assert.match(privateSkillMd, /name: team-custom-skill/);

    const trackingRaw = await fs.readFile(
      path.join(targetDir, ".agents", ".standards-manifest.json"),
      "utf8",
    );
    const tracking = JSON.parse(trackingRaw);
    assert.deepEqual(tracking.rules.sort(), ["agent.md", "common.md", "git.md", "testing.md"]);
    assert.deepEqual(tracking.privateSkills, ["team-custom-skill"]);

    // Verify no docs/agents or GLOSSARY.md were forcibly created
    await assert.rejects(fs.access(path.join(targetDir, "docs", "agents")));
    await assert.rejects(fs.access(path.join(targetDir, "GLOSSARY.md")));

    // Verify batched external skills calls
    const skillCalls = calls.filter((c) => c.args.includes(EXPECTED_SKILLS_PKG));
    assert.equal(skillCalls.length, 2);
    assert.deepEqual(skillCalls[0].args, [
      "--yes",
      EXPECTED_SKILLS_PKG,
      "add",
      "mattpocock/skills",
      "--skill",
      "tdd",
      "--skill",
      "code-review",
      "-g",
      "-y",
    ]);
    assert.deepEqual(skillCalls[1].args, [
      "--yes",
      EXPECTED_SKILLS_PKG,
      "add",
      "acme/project-skills",
      "--skill",
      "api-lint",
      "-y",
    ]);
  });

  it("migrates legacy ../.agents references and preserves custom rules and local private skills", async () => {
    await fs.mkdir(path.join(targetDir, ".agents", "skills", "my-local-skill"), { recursive: true });
    await fs.writeFile(
      path.join(targetDir, ".agents", "skills", "my-local-skill", "SKILL.md"),
      "---\nname: my-local-skill\ndescription: Local business skill\n---\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(targetDir, ".agents", "skills.json"),
      JSON.stringify(
        {
          entries: [{ path: "../.agents/skills" }, { path: "./custom-skills" }],
          inherits: [{ path: "../.agents/skills.json" }],
        },
        null,
        2,
      ),
      "utf8",
    );
    await fs.writeFile(
      path.join(targetDir, "GEMINI.md"),
      [
        "# My Business App",
        "",
        "@[Agent行为准则](../.agents/rules/agent.md)",
        "@[通用编码红线](../.agents/rules/common.md)",
        "",
        "## Business Rules",
        "- Keep Vue 3 Composition API",
      ].join("\n"),
      "utf8",
    );

    const result = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      skipExternal: true,
    });

    assert.equal(result.ok, true);
    assert.equal(result.entryFile, "GEMINI.md");
    assert.equal(result.legacyMigrated, true);

    const geminiMd = await fs.readFile(path.join(targetDir, "GEMINI.md"), "utf8");
    assert.doesNotMatch(geminiMd, /\.\.\/\.agents\/rules\//);
    assert.match(geminiMd, /^# My Business App/m);
    assert.match(geminiMd, /@\[Agent行为准则\]\(\.agents\/rules\/agent\.md\)/);
    assert.match(geminiMd, /@\[自动化测试规范\]\(\.agents\/rules\/testing\.md\)/);
    assert.match(geminiMd, /@\[Git提交规范\]\(\.agents\/rules\/git\.md\)/);
    assert.match(geminiMd, /- Keep Vue 3 Composition API/);

    const skillsJson = JSON.parse(
      await fs.readFile(path.join(targetDir, ".agents", "skills.json"), "utf8"),
    );
    assert.deepEqual(skillsJson.entries, [{ path: "./custom-skills" }]);
    assert.equal(skillsJson.inherits, undefined);

    // Local private skill is preserved
    const localSkill = await fs.readFile(
      path.join(targetDir, ".agents", "skills", "my-local-skill", "SKILL.md"),
      "utf8",
    );
    assert.match(localSkill, /my-local-skill/);

    // Re-running is strictly idempotent
    const secondRun = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      skipExternal: true,
    });
    assert.equal(secondRun.ok, true);
    const geminiMdAfter = await fs.readFile(path.join(targetDir, "GEMINI.md"), "utf8");
    assert.equal(geminiMdAfter, geminiMd);
  });

  it("picks highest-priority entry file by default and respects --entry override", async () => {
    await fs.writeFile(path.join(targetDir, "AGENTS.md"), "# Agents Entry\n", "utf8");
    await fs.writeFile(path.join(targetDir, "CLAUDE.md"), "# Claude Entry\n", "utf8");

    const defaultRun = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      skipExternal: true,
    });
    assert.equal(defaultRun.entryFile, "AGENTS.md");

    const overrideRun = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      entry: "CLAUDE.md",
      skipExternal: true,
    });
    assert.equal(overrideRun.entryFile, "CLAUDE.md");
    const claudeMd = await fs.readFile(path.join(targetDir, "CLAUDE.md"), "utf8");
    assert.match(claudeMd, /@\[Agent行为准则\]\(\.agents\/rules\/agent\.md\)/);
  });

  it("skips already-installed external skills by default, installs missing diff, and supports --update-skills and --agent", async () => {
    // Pre-install "tdd" globally
    await fs.mkdir(path.join(homeDir, ".agents", "skills", "tdd"), { recursive: true });
    await fs.writeFile(path.join(homeDir, ".agents", "skills", "tdd", "SKILL.md"), "# tdd\n", "utf8");
    // Pre-install "api-lint" locally
    await fs.mkdir(path.join(targetDir, ".agents", "skills", "api-lint"), { recursive: true });
    await fs.writeFile(path.join(targetDir, ".agents", "skills", "api-lint", "SKILL.md"), "# lint\n", "utf8");

    const calls = [];
    const runCommand = async (cmd, args) => {
      calls.push({ cmd, args });
      return { exitCode: 0, stdout: "ok", stderr: "" };
    };

    await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      agent: "antigravity",
      runCommand,
    });

    const firstSkillCalls = calls.filter((c) => c.args.includes(EXPECTED_SKILLS_PKG));
    assert.equal(firstSkillCalls.length, 1);
    assert.deepEqual(firstSkillCalls[0].args, [
      "--yes",
      EXPECTED_SKILLS_PKG,
      "add",
      "mattpocock/skills",
      "--skill",
      "code-review",
      "-g",
      "-a",
      "antigravity",
      "-y",
    ]);

    calls.length = 0;
    await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      updateSkills: true,
      runCommand,
    });

    const forceSkillCalls = calls.filter((c) => c.args.includes(EXPECTED_SKILLS_PKG));
    assert.equal(forceSkillCalls.length, 2);
    assert.ok(forceSkillCalls[0].args.includes("tdd"));
    assert.ok(forceSkillCalls[0].args.includes("code-review"));
    assert.ok(forceSkillCalls[1].args.includes("api-lint"));
  });

  it("warns without silently deleting deprecated managed private skills", async () => {
    await fs.mkdir(path.join(targetDir, ".agents", "skills", "old-team-skill"), { recursive: true });
    await fs.writeFile(
      path.join(targetDir, ".agents", "skills", "old-team-skill", "SKILL.md"),
      "# old\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(targetDir, ".agents", ".standards-manifest.json"),
      JSON.stringify({
        version: 1,
        rules: ["agent.md"],
        privateSkills: ["old-team-skill"],
      }),
      "utf8",
    );

    const result = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      skipExternal: true,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.deprecatedItems, [{ type: "private-skill", name: "old-team-skill" }]);
    await fs.access(path.join(targetDir, ".agents", "skills", "old-team-skill", "SKILL.md"));
  });

  it("deduplicates rule references when entry file contains both legacy and local links", async () => {
    await fs.writeFile(
      path.join(targetDir, "AGENTS.md"),
      [
        "# App",
        "",
        "@[Agent行为准则](../.agents/rules/agent.md)",
        "@[Agent行为准则](.agents/rules/agent.md)",
      ].join("\n"),
      "utf8",
    );

    const result = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      skipExternal: true,
    });

    assert.equal(result.ok, true);
    const content = await fs.readFile(path.join(targetDir, "AGENTS.md"), "utf8");
    const matches = content.match(/\.agents\/rules\/agent\.md/g) ?? [];
    assert.equal(matches.length, 1);
  });

  it("dynamically copies additional rules beyond the four core rules", async () => {
    await fs.writeFile(path.join(standardsRoot, "rules", "security.md"), "# Security\n", "utf8");

    const result = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      skipExternal: true,
    });

    assert.equal(result.ok, true);
    assert.ok(result.rulesCopied.includes("security.md"));
    await fs.access(path.join(targetDir, ".agents", "rules", "security.md"));
  });

  it("warns instead of silently swallowing corrupted tracking manifest JSON", async () => {
    await fs.mkdir(path.join(targetDir, ".agents"), { recursive: true });
    await fs.writeFile(
      path.join(targetDir, ".agents", ".standards-manifest.json"),
      "{broken-json",
      "utf8",
    );

    const result = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      skipExternal: true,
    });

    assert.equal(result.ok, true);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /\.standards-manifest\.json/);
  });

  it("rejects unsafe --agent values to prevent command injection", async () => {
    const calls = [];
    const runCommand = async (cmd, args) => {
      calls.push({ cmd, args });
      return { exitCode: 0, stdout: "", stderr: "" };
    };

    const result = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      agent: "cursor & calc",
      runCommand,
    });

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /--agent/.test(e)));
    assert.equal(calls.filter((c) => c.args.includes(EXPECTED_SKILLS_PKG)).length, 0);
  });

  it("prompts for optional project skills, installs when approved, skips when declined, and skips prompt if already installed", async () => {
    await fs.writeFile(
      path.join(standardsRoot, "skills-manifest.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            source: "vercel-labs/agent-skills",
            scope: "project",
            skills: ["web-design-guidelines"],
            optional: true,
            prompt: "是否为前端项目？",
          },
        ],
      }),
      "utf8",
    );

    const calls = [];
    const runCommand = async (cmd, args) => {
      calls.push({ cmd, args });
      return { exitCode: 0, stdout: "ok", stderr: "" };
    };

    // 1. Declined by user
    const declinedRes = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      runCommand,
      confirmPrompt: async () => false,
    });
    assert.equal(declinedRes.ok, true);
    assert.equal(declinedRes.externalResults[0].declined, true);
    assert.equal(calls.filter((c) => c.args.includes(EXPECTED_SKILLS_PKG)).length, 0);

    // 2. Approved by user
    const approvedRes = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      runCommand,
      confirmPrompt: async () => true,
    });
    assert.equal(approvedRes.ok, true);
    assert.deepEqual(approvedRes.externalResults[0].installed, ["web-design-guidelines"]);
    assert.equal(calls.filter((c) => c.args.includes(EXPECTED_SKILLS_PKG)).length, 1);

    // 3. Already installed -> never prompts again
    await fs.mkdir(path.join(targetDir, ".agents", "skills", "web-design-guidelines"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(targetDir, ".agents", "skills", "web-design-guidelines", "SKILL.md"),
      "# web\n",
      "utf8",
    );
    let promptCalled = false;
    await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      runCommand,
      confirmPrompt: async () => {
        promptCalled = true;
        return true;
      },
    });
    assert.equal(promptCalled, false);
  });

  it("supports --dry-run with zero filesystem writes and zero external command invocations", async () => {
    const calls = [];
    const runCommand = async (cmd, args) => {
      calls.push({ cmd, args });
      return { exitCode: 0, stdout: "", stderr: "" };
    };

    const result = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      dryRun: true,
      runCommand,
    });

    assert.equal(result.ok, true);
    assert.equal(calls.filter((c) => c.args.includes(EXPECTED_SKILLS_PKG)).length, 0);
    await assert.rejects(fs.access(path.join(targetDir, "AGENTS.md")));
    await assert.rejects(fs.access(path.join(targetDir, ".agents")));
  });

  it("continues and summarizes failures when an external skill source fails to install", async () => {
    const runCommand = async (_cmd, args) => {
      if (args.includes("mattpocock/skills")) {
        return { exitCode: 1, stdout: "", stderr: "network timeout" };
      }
      return { exitCode: 0, stdout: "ok", stderr: "" };
    };

    const result = await runInit({
      targetDir,
      standardsRoot,
      homeDir,
      runCommand,
    });

    assert.equal(result.ok, false);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /mattpocock\/skills/);
    // Rules and private skills were still copied
    await fs.access(path.join(targetDir, ".agents", "rules", "agent.md"));
    await fs.access(path.join(targetDir, ".agents", "skills", "team-custom-skill", "SKILL.md"));
  });
});

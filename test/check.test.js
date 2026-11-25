import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runCheck } from "../src/check.js";

async function createValidRepo(repoRoot) {
  await fs.mkdir(path.join(repoRoot, "rules"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "skills", "demo-skill"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "templates", "skill-template", "references"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "docs"), { recursive: true });

  for (const rule of ["agent.md", "common.md", "testing.md", "git.md"]) {
    await fs.writeFile(path.join(repoRoot, "rules", rule), `# ${rule}\n`, "utf8");
  }
  await fs.writeFile(
    path.join(repoRoot, "skills", "demo-skill", "SKILL.md"),
    "---\nname: demo-skill\ndescription: Demo private skill\n---\n# Demo\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(repoRoot, "templates", "skill-template", "SKILL.md"),
    "---\nname: {{SKILL_NAME}}\ndescription: template\n---\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(repoRoot, "skills-manifest.json"),
    JSON.stringify({
      version: 1,
      entries: [
        {
          source: "mattpocock/skills",
          scope: "global",
          skills: ["tdd"],
          description: "TDD",
        },
      ],
    }),
    "utf8",
  );
  await fs.writeFile(
    path.join(repoRoot, "README.md"),
    "# Repo\nSee [agent](rules/agent.md)\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(repoRoot, "docs", "guide.md"),
    "# Guide\nSee [manifest](../skills-manifest.json)\n",
    "utf8",
  );
}

describe("check health gate", () => {
  let repoRoot;

  beforeEach(async () => {
    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tas-check-test-"));
    await createValidRepo(repoRoot);
  });

  afterEach(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  it("passes on a completely valid repository", async () => {
    const result = await runCheck({ repoRoot });
    assert.equal(result.ok, true);
    assert.equal(result.failedCount, 0);
  });

  it("fails when a private skill has mismatched name in YAML frontmatter", async () => {
    await fs.writeFile(
      path.join(repoRoot, "skills", "demo-skill", "SKILL.md"),
      "---\nname: wrong-name\ndescription: Demo\n---\n",
      "utf8",
    );
    const result = await runCheck({ repoRoot });
    assert.equal(result.ok, false);
    assert.ok(result.checks.some((c) => !c.ok && /demo-skill/.test(c.message)));
  });

  it("fails when skills-manifest.json has invalid scope or missing skills", async () => {
    await fs.writeFile(
      path.join(repoRoot, "skills-manifest.json"),
      JSON.stringify({
        version: 1,
        entries: [{ source: "mattpocock/skills", scope: "invalid", skills: [] }],
      }),
      "utf8",
    );
    const result = await runCheck({ repoRoot });
    assert.equal(result.ok, false);
    assert.ok(result.checks.some((c) => !c.ok && /skills-manifest\.json/.test(c.message)));
  });

  it("fails when markdown contains hardcoded local absolute paths", async () => {
    await fs.writeFile(
      path.join(repoRoot, "README.md"),
      "# Repo\n[bad](file:///C:/Users/alice/codes/rules/agent.md)\n",
      "utf8",
    );
    const result = await runCheck({ repoRoot });
    assert.equal(result.ok, false);
    assert.ok(result.checks.some((c) => !c.ok && /绝对路径/.test(c.message)));
  });

  it("fails when markdown contains broken relative links", async () => {
    await fs.writeFile(
      path.join(repoRoot, "docs", "guide.md"),
      "# Guide\nSee [broken](../non-existent-file.md)\n",
      "utf8",
    );
    const result = await runCheck({ repoRoot });
    assert.equal(result.ok, false);
    assert.ok(result.checks.some((c) => !c.ok && /non-existent-file\.md/.test(c.message)));
  });

  it("ignores link-like syntax inside inline code spans", async () => {
    await fs.writeFile(
      path.join(repoRoot, "docs", "guide.md"),
      "# Guide\nUse `@[label](path)` syntax to reference rules.\n",
      "utf8",
    );
    const result = await runCheck({ repoRoot });
    assert.equal(result.ok, true);
  });

  it("fails when a core rule file is missing", async () => {
    await fs.rm(path.join(repoRoot, "rules", "git.md"));
    const result = await runCheck({ repoRoot });
    assert.equal(result.ok, false);
    assert.ok(result.checks.some((c) => !c.ok && /rules\/git\.md/.test(c.message)));
  });

  it("fails when a private skill has missing frontmatter or empty description", async () => {
    await fs.writeFile(
      path.join(repoRoot, "skills", "demo-skill", "SKILL.md"),
      "---\nname: demo-skill\ndescription:\n---\n# Demo\n",
      "utf8",
    );
    const emptyDescRes = await runCheck({ repoRoot });
    assert.equal(emptyDescRes.ok, false);
    assert.ok(emptyDescRes.checks.some((c) => !c.ok && /hasDescription=false/.test(c.message)));

    await fs.writeFile(
      path.join(repoRoot, "skills", "demo-skill", "SKILL.md"),
      "# No Frontmatter\n",
      "utf8",
    );
    const noFmRes = await runCheck({ repoRoot });
    assert.equal(noFmRes.ok, false);
    assert.ok(noFmRes.checks.some((c) => !c.ok && /Frontmatter/.test(c.message)));
  });

  it("fails when skills-manifest.json sets both all:true and skills array", async () => {
    await fs.writeFile(
      path.join(repoRoot, "skills-manifest.json"),
      JSON.stringify({
        version: 1,
        entries: [{ source: "mattpocock/skills", scope: "global", all: true, skills: [] }],
      }),
      "utf8",
    );
    const result = await runCheck({ repoRoot });
    assert.equal(result.ok, false);
    assert.ok(result.checks.some((c) => !c.ok && /skills-manifest\.json/.test(c.message)));
  });

  it("fails when markdown body contains Windows backslash absolute paths", async () => {
    await fs.writeFile(
      path.join(repoRoot, "README.md"),
      "# Repo\nConfig lives at C:\\Users\\alice\\secret.json\n",
      "utf8",
    );
    const result = await runCheck({ repoRoot });
    assert.equal(result.ok, false);
    assert.ok(result.checks.some((c) => !c.ok && /绝对路径/.test(c.message)));
  });
});

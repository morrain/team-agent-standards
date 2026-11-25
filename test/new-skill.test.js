import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runNewSkill } from "../src/new-skill.js";

describe("new-skill scaffold", () => {
  let repoRoot;

  beforeEach(async () => {
    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tas-new-skill-test-"));
    await fs.mkdir(path.join(repoRoot, "skills"), { recursive: true });
    await fs.mkdir(path.join(repoRoot, "templates", "skill-template", "references"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(repoRoot, "templates", "skill-template", "SKILL.md"),
      "---\nname: {{SKILL_NAME}}\ndescription: template\n---\n# {{SKILL_TITLE}}\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(repoRoot, "templates", "skill-template", "references", "guide.md"),
      "# {{SKILL_TITLE}} Guide\n",
      "utf8",
    );
  });

  afterEach(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  it("creates a new private skill from template with placeholders replaced", async () => {
    const result = await runNewSkill({ skillName: "api-mock-gen", repoRoot });
    assert.equal(result.ok, true);

    const skillMd = await fs.readFile(
      path.join(repoRoot, "skills", "api-mock-gen", "SKILL.md"),
      "utf8",
    );
    assert.match(skillMd, /name: api-mock-gen/);
    assert.match(skillMd, /# api-mock-gen/);

    const guideMd = await fs.readFile(
      path.join(repoRoot, "skills", "api-mock-gen", "references", "guide.md"),
      "utf8",
    );
    assert.match(guideMd, /# api-mock-gen Guide/);
  });

  it("rejects invalid skill names and duplicate skills with clear error messages", async () => {
    const bad = await runNewSkill({ skillName: "Invalid_Name", repoRoot });
    assert.equal(bad.ok, false);
    assert.match(bad.error, /小写连字符命名规范/);

    await runNewSkill({ skillName: "my-skill", repoRoot });
    const dup = await runNewSkill({ skillName: "my-skill", repoRoot });
    assert.equal(dup.ok, false);
    assert.match(dup.error, /已存在/);
  });
});

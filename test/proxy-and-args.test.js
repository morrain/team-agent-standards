import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseCliArgs } from "../src/args.js";
import { resolveSkillsCliPackage } from "../src/external-skills.js";
import { detectProxyEnv, parseWindowsProxyServer } from "../src/proxy.js";

describe("CLI argument parser", () => {
  it("defaults to init command and parses all flags accurately", () => {
    const parsed = parseCliArgs([
      "--dry-run",
      "--update-skills",
      "--skip-external",
      "--entry",
      "CLAUDE.md",
      "--agent",
      "claude-code",
      "--target",
      "./my-app",
    ]);

    assert.equal(parsed.command, "init");
    assert.equal(parsed.flags.dryRun, true);
    assert.equal(parsed.flags.updateSkills, true);
    assert.equal(parsed.flags.skipExternal, true);
    assert.equal(parsed.flags.entry, "CLAUDE.md");
    assert.equal(parsed.flags.agent, "claude-code");
    assert.equal(parsed.flags.targetDir, "./my-app");
  });

  it("parses explicit subcommands and positional arguments", () => {
    const parsed = parseCliArgs(["new-skill", "api-mock-gen"]);
    assert.equal(parsed.command, "new-skill");
    assert.deepEqual(parsed.positionals, ["api-mock-gen"]);
  });
});

describe("Windows proxy detection", () => {
  it("parses both host:port and per-protocol proxy server strings", () => {
    const simple = parseWindowsProxyServer("127.0.0.1:7890");
    assert.equal(simple.http_proxy, "http://127.0.0.1:7890");
    assert.equal(simple.https_proxy, "http://127.0.0.1:7890");

    const perProto = parseWindowsProxyServer("http=127.0.0.1:7890;https=127.0.0.1:7891");
    assert.equal(perProto.http_proxy, "http://127.0.0.1:7890");
    assert.equal(perProto.https_proxy, "http://127.0.0.1:7891");
  });

  it("detects enabled Windows proxy via reg.exe and skips when proxy env already exists", async () => {
    const regMock = async (_cmd, args) => {
      if (args.includes("ProxyEnable")) {
        return { exitCode: 0, stdout: "    ProxyEnable    REG_DWORD    0x1\r\n", stderr: "" };
      }
      return {
        exitCode: 0,
        stdout: "    ProxyServer    REG_SZ    http=127.0.0.1:7890;https=127.0.0.1:7890\r\n",
        stderr: "",
      };
    };

    const detected = await detectProxyEnv(regMock, {}, "win32");
    assert.equal(detected.https_proxy, "http://127.0.0.1:7890");

    const skippedExisting = await detectProxyEnv(regMock, { HTTP_PROXY: "http://10.0.0.1:8080" }, "win32");
    assert.deepEqual(skippedExisting, {});

    const skippedLinux = await detectProxyEnv(regMock, {}, "linux");
    assert.deepEqual(skippedLinux, {});
  });
});

describe("skills CLI version compatibility", () => {
  it("uses skills@1.5.18 for Node < 22.20 and skills@latest for Node >= 22.20", () => {
    assert.equal(resolveSkillsCliPackage("18.20.4"), "skills@1.5.18");
    assert.equal(resolveSkillsCliPackage("20.20.2"), "skills@1.5.18");
    assert.equal(resolveSkillsCliPackage("22.19.0"), "skills@1.5.18");
    assert.equal(resolveSkillsCliPackage("22.20.0"), "skills@latest");
    assert.equal(resolveSkillsCliPackage("24.1.0"), "skills@latest");
  });
});

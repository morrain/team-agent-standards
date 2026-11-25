import { spawn } from "node:child_process";

const REG_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";

function needsWindowsShell(command) {
  if (process.platform !== "win32") {
    return false;
  }
  return !command.toLowerCase().endsWith(".exe");
}

export async function defaultRunCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: needsWindowsShell(command),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (options.streamOutput) {
        process.stdout.write(text);
      }
    });
    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (options.streamOutput) {
        process.stderr.write(text);
      }
    });
    child.on("error", (err) => {
      resolve({ exitCode: 1, stdout, stderr: err.message });
    });
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

function normalizeProxyUrl(rawValue) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return "";
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export function parseWindowsProxyServer(rawServer) {
  const trimmed = rawServer.trim();
  if (!trimmed) {
    return {};
  }

  if (!trimmed.includes("=")) {
    const proxyUrl = normalizeProxyUrl(trimmed);
    return {
      http_proxy: proxyUrl,
      https_proxy: proxyUrl,
      HTTP_PROXY: proxyUrl,
      HTTPS_PROXY: proxyUrl,
    };
  }

  const pairs = Object.fromEntries(
    trimmed
      .split(";")
      .map((segment) => segment.split("="))
      .filter((parts) => parts.length === 2 && parts[0].trim() && parts[1].trim())
      .map(([proto, host]) => [proto.trim().toLowerCase(), normalizeProxyUrl(host)]),
  );

  const httpUrl = pairs.http ?? pairs.https;
  const httpsUrl = pairs.https ?? pairs.http;
  if (!httpUrl && !httpsUrl) {
    return {};
  }
  return {
    http_proxy: httpUrl,
    https_proxy: httpsUrl,
    HTTP_PROXY: httpUrl,
    HTTPS_PROXY: httpsUrl,
  };
}

export async function detectProxyEnv(
  runCommand = defaultRunCommand,
  baseEnv = process.env,
  platform = process.platform,
) {
  if (baseEnv.http_proxy || baseEnv.HTTP_PROXY || baseEnv.https_proxy || baseEnv.HTTPS_PROXY) {
    return {};
  }
  if (platform !== "win32") {
    return {};
  }

  const enableRes = await runCommand("reg.exe", ["query", REG_KEY, "/v", "ProxyEnable"]);
  if (enableRes.exitCode !== 0 || !/0x1/i.test(enableRes.stdout)) {
    return {};
  }

  const serverRes = await runCommand("reg.exe", ["query", REG_KEY, "/v", "ProxyServer"]);
  if (serverRes.exitCode !== 0) {
    return {};
  }

  const match = serverRes.stdout.match(/ProxyServer\s+REG_SZ\s+(.+)$/im);
  if (!match) {
    return {};
  }
  return parseWindowsProxyServer(match[1]);
}

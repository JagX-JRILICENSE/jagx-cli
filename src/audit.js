import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fetchUrlTool } from "./netTools.js";

const SECRET_PATTERNS = [
  { name: "AWS Access Key", re: /AKIA[0-9A-Z]{16}/, severity: "high" },
  { name: "AWS Secret Key", re: /(?:aws)?_?secret(?:access)?_?key['"]?\s*[:=]\s*['"][A-Za-z0-9/+=]{30,}['"]/i, severity: "high" },
  { name: "Generic API Key", re: /['"](?:api[_-]?key|apikey)['"]\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/i, severity: "medium" },
  { name: "Private Key block", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, severity: "high" },
  { name: "Slack Token", re: /xox[baprs]-[0-9A-Za-z-]{10,}/, severity: "high" },
  { name: "Stripe Live Key", re: /sk_live_[0-9a-zA-Z]{20,}/, severity: "high" },
  { name: "Stripe Test Key", re: /sk_test_[0-9a-zA-Z]{20,}/, severity: "low" },
  { name: "GitHub Token", re: /gh[pousr]_[A-Za-z0-9_]{20,}/, severity: "high" },
  { name: "GitLab Token", re: /glpat-[A-Za-z0-9_-]{20,}/, severity: "high" },
  { name: "OpenAI Key", re: /sk-[A-Za-z0-9]{20,}/, severity: "high" },
  { name: "Anthropic Key", re: /sk-ant-[A-Za-z0-9_-]{20,}/, severity: "high" },
  { name: "Google API Key", re: /AIza[0-9A-Za-z_-]{30,}/, severity: "high" },
  { name: "JWT (likely secret)", re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, severity: "medium" },
  { name: "Password assignment", re: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i, severity: "medium" },
  { name: "Database URL with creds", re: /(?:postgres|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@/i, severity: "high" },
];

const SCAN_EXTENSIONS = new Set([
  ".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs",
  ".env", ".json", ".py", ".yml", ".yaml", ".toml",
  ".go", ".rs", ".java", ".rb", ".php", ".sh",
]);
const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".jagx",
  "coverage", ".next", ".nuxt", "vendor", "__pycache__",
]);

function scanFileForSecrets(filePath) {
  const findings = [];
  try {
    const content = fs.readFileSync(filePath, "utf8");
    // skip lockfiles and huge minified blobs
    if (filePath.endsWith("package-lock.json") || filePath.endsWith("yarn.lock")) return findings;
    if (content.length > 2_000_000) return findings;
    for (const { name, re, severity } of SECRET_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(content)) findings.push({ name, severity });
    }
  } catch {
    // unreadable/binary — skip
  }
  return findings;
}

export function scanForSecrets(workdir) {
  const results = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".env" && entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (SCAN_EXTENSIONS.has(path.extname(entry.name)) || entry.name === ".env" || entry.name.startsWith(".env.")) {
        const findings = scanFileForSecrets(full);
        if (findings.length) {
          results.push({
            file: path.relative(workdir, full),
            findings: findings.map((f) => f.name),
            severity: findings.reduce((worst, f) => {
              const order = { high: 3, medium: 2, low: 1 };
              return (order[f.severity] || 0) > (order[worst] || 0) ? f.severity : worst;
            }, "low"),
          });
        }
      }
    }
  }
  walk(workdir);
  return results;
}

/**
 * Returns { vulnerabilities, note } — never throws noisy npm errors to the user.
 */
export function checkDependencies(workdir) {
  const pkgPath = path.join(workdir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { vulnerabilities: null, note: "No package.json — skipped dependency audit." };
  }
  const hasLock =
    fs.existsSync(path.join(workdir, "package-lock.json")) ||
    fs.existsSync(path.join(workdir, "npm-shrinkwrap.json")) ||
    fs.existsSync(path.join(workdir, "yarn.lock")) ||
    fs.existsSync(path.join(workdir, "pnpm-lock.yaml"));
  if (!hasLock) {
    return {
      vulnerabilities: null,
      note: "No lockfile found — run npm i / yarn / pnpm install first, then re-run audit.",
    };
  }
  try {
    const out = execSync("npm audit --json", {
      cwd: workdir,
      encoding: "utf8",
      timeout: 45000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const parsed = JSON.parse(out);
    return { vulnerabilities: parsed.metadata?.vulnerabilities || null, note: null };
  } catch (err) {
    try {
      const parsed = JSON.parse(err.stdout || "{}");
      if (parsed.metadata?.vulnerabilities) {
        return { vulnerabilities: parsed.metadata.vulnerabilities, note: null };
      }
    } catch {
      // ignore
    }
    return { vulnerabilities: null, note: "npm audit could not run (non-npm project or network)." };
  }
}

export async function checkLiveSite(url) {
  const findings = [];
  let base;
  try {
    base = new URL(url);
  } catch {
    return ["Invalid URL."];
  }

  try {
    const res = await fetchUrlTool(url);
    const h = res.headers;
    if (!h["content-security-policy"]) findings.push("Missing Content-Security-Policy header.");
    if (!h["x-content-type-options"]) findings.push("Missing X-Content-Type-Options header.");
    if (
      !h["x-frame-options"] &&
      !(h["content-security-policy"] || "").includes("frame-ancestors")
    ) {
      findings.push("Missing X-Frame-Options (or CSP frame-ancestors).");
    }
    if (!h["strict-transport-security"] && base.protocol === "https:") {
      findings.push("Missing Strict-Transport-Security (HSTS) header.");
    }
    if (h["server"]) {
      findings.push(`Server header exposes: ${h["server"]} (consider hiding version info).`);
    }
  } catch (e) {
    findings.push(`Could not reach the site: ${e.message}`);
  }

  for (const p of ["/.env", "/.git/config", "/.git/HEAD"]) {
    try {
      const res = await fetchUrlTool(base.origin + p);
      if (res.status === 200) {
        findings.push(`${p} appears to be publicly accessible — this should never be exposed.`);
      }
    } catch {
      // unreachable is fine
    }
  }

  return findings;
}

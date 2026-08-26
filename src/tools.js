import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const SHELL_TIMEOUT_MS = 60_000;

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\/(?!\S)/i,
  /rm\s+-rf\s+~(?!\S)/i,
  /rm\s+-rf\s+\*/i,
  /:\(\)\s*\{\s*:\|:&\s*\}\s*;\s*:/,
  /mkfs\./i,
  /\bdd\s+if=/i,
  />\s*\/dev\/sd/i,
  /\bsudo\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bformat\s+[a-z]:/i,
  /del\s+\/f\s+\/s\s+\/q\s+[a-z]:\\/i,
];

export function isDangerous(command) {
  return DANGEROUS_PATTERNS.some((re) => re.test(command || ""));
}

export function resolveInWorkdir(workdir, requestedPath) {
  const resolved = path.resolve(workdir, requestedPath || ".");
  const workdirResolved = path.resolve(workdir);
  if (resolved !== workdirResolved && !resolved.startsWith(workdirResolved + path.sep)) {
    throw new Error(`Path '${requestedPath}' is outside the project folder — refused.`);
  }
  return resolved;
}

export function readFileTool(workdir, filePath) {
  const full = resolveInWorkdir(workdir, filePath);
  const stat = fs.statSync(full);
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(`File too large to read (${stat.size} bytes, max ${MAX_FILE_BYTES}).`);
  }
  return fs.readFileSync(full, "utf8");
}

export function writeFileTool(workdir, filePath, content) {
  const full = resolveInWorkdir(workdir, filePath);
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
    throw new Error("Content too large to write.");
  }
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  return `Wrote ${Buffer.byteLength(content, "utf8")} bytes to ${filePath}`;
}

export function listDirTool(workdir, dirPath) {
  const full = resolveInWorkdir(workdir, dirPath || ".");
  const entries = fs.readdirSync(full, { withFileTypes: true });
  return entries
    .filter((e) => e.name !== "node_modules" && e.name !== ".git")
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
    .join("\n");
}

export function runShellTool(workdir, command) {
  if (isDangerous(command)) {
    throw new Error("Refused: this command matches a blocked destructive pattern and will never run, even with --auto.");
  }
  try {
    const out = execSync(command, {
      cwd: workdir,
      timeout: SHELL_TIMEOUT_MS,
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
    });
    return out || "(no output)";
  } catch (err) {
    const out = (err.stdout || "") + (err.stderr || err.message || "");
    return `[exit code ${err.status ?? "?"}]\n${out}`;
  }
}

export function mkdirTool(workdir, dirPath) {
  const full = resolveInWorkdir(workdir, dirPath || ".");
  fs.mkdirSync(full, { recursive: true });
  return `Created directory ${dirPath}`;
}

export function globTool(workdir, pattern = "**/*") {
  const root = path.resolve(workdir);
  const needle = String(pattern).replace(/^\.\//, "");
  const out = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === ".jagx") continue;
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full).replaceAll("\\", "/");
      if (e.isDirectory()) walk(full);
      else if (matchGlob(rel, needle)) out.push(rel);
      if (out.length >= 400) return;
    }
  }
  walk(root);
  return out.join("\n") || "(no matches)";
}

function matchGlob(rel, pattern) {
  if (!pattern || pattern === "**/*" || pattern === "*") return true;
  const esc = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "::DS::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DS::/g, ".*");
  return new RegExp(`^${esc}$`).test(rel) || rel.includes(pattern.replace(/\*\*/g, "").replace(/\*/g, ""));
}

export function moveFileTool(workdir, from, to) {
  const src = resolveInWorkdir(workdir, from);
  const dest = resolveInWorkdir(workdir, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
  return `Moved ${from} → ${to}`;
}

export function deleteFileTool(workdir, filePath) {
  const full = resolveInWorkdir(workdir, filePath);
  if (!fs.existsSync(full)) return `No such file ${filePath}`;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    throw new Error("Refused: will not recursively delete directories. Remove files individually.");
  }
  fs.unlinkSync(full);
  return `Deleted ${filePath}`;
}

/** Serialize writes to the same path across parallel agents. */
export function createWriteLock() {
  const locks = new Map();
  return {
    async run(filePath, fn) {
      const key = String(filePath || "");
      while (locks.has(key)) {
        await locks.get(key);
      }
      let release;
      const p = new Promise((r) => {
        release = r;
      });
      locks.set(key, p);
      try {
        return await fn();
      } finally {
        locks.delete(key);
        release();
      }
    },
  };
}

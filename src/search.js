import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MAX_RESULTS = 40;
const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".jagx",
  "coverage", ".next", "vendor", "__pycache__",
]);

function jsFallbackSearch(workdir, query) {
  const results = [];
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  function walk(dir) {
    if (results.length >= MAX_RESULTS) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= MAX_RESULTS) return;
      if (IGNORE_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        let content;
        try {
          content = fs.readFileSync(full, "utf8");
        } catch {
          continue;
        }
        if (content.length > 1_000_000) continue;
        content.split("\n").forEach((line, i) => {
          if (results.length < MAX_RESULTS && re.test(line)) {
            results.push(
              `${path.relative(workdir, full)}:${i + 1}: ${line.trim().slice(0, 200)}`,
            );
          }
        });
      }
    }
  }
  walk(workdir);
  return results;
}

function hasBinary(name) {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [name], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefer ripgrep, then grep, then pure JS walk.
 */
export function searchCode(workdir, query) {
  if (!query || !query.trim()) return "No query provided.";

  if (hasBinary("rg")) {
    try {
      const out = execFileSync(
        "rg",
        [
          "-n",
          "-I",
          "--hidden",
          "--glob", "!node_modules",
          "--glob", "!.git",
          "--glob", "!.jagx",
          "--glob", "!dist",
          "--glob", "!build",
          "-m", String(MAX_RESULTS),
          query,
          ".",
        ],
        { cwd: workdir, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
      );
      const lines = out.split("\n").filter(Boolean).slice(0, MAX_RESULTS);
      return lines.length ? lines.join("\n") : "No matches found.";
    } catch (err) {
      if (err.status === 1) return "No matches found.";
      // fall through
    }
  }

  try {
    const out = execFileSync(
      "grep",
      [
        "-rn",
        "-I",
        "--exclude-dir=node_modules",
        "--exclude-dir=.git",
        "--exclude-dir=.jagx",
        "--exclude-dir=dist",
        "--exclude-dir=build",
        query,
        ".",
      ],
      { cwd: workdir, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
    );
    const lines = out.split("\n").filter(Boolean).slice(0, MAX_RESULTS);
    return lines.length ? lines.join("\n") : "No matches found.";
  } catch (err) {
    if (err.status === 1) return "No matches found.";
    const fallback = jsFallbackSearch(workdir, query);
    return fallback.length ? fallback.join("\n") : "No matches found.";
  }
}

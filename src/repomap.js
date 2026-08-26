import fs from "node:fs";
import path from "node:path";

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".jagx", "__pycache__", ".venv", "venv"]);
const MAX_ENTRIES = 400;

export function buildRepoMap(workdir) {
  const lines = [];
  let count = 0;

  function walk(dir, depth) {
    if (count >= MAX_ENTRIES || depth > 6) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (count >= MAX_ENTRIES) return;
      if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        lines.push(`${"  ".repeat(depth)}${entry.name}/`);
        count++;
        walk(path.join(dir, entry.name), depth + 1);
      } else {
        lines.push(`${"  ".repeat(depth)}${entry.name}`);
        count++;
      }
    }
  }

  walk(workdir, 0);
  if (count >= MAX_ENTRIES) lines.push("... (truncated — project is larger than this map)");
  return lines.join("\n");
}

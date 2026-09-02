/**
 * Group worker + review loop.
 * Scaffold creates folders; specialists write safe starter files when autoWrite.
 */
import fs from "node:fs";
import path from "node:path";
import { say } from "./groupHelpers.js";

const DEFAULT_DIRS = ["src", "test", "public", "scripts", ".jagx"];

function safeJoin(workdir, rel) {
  const root = path.resolve(workdir);
  const abs = path.resolve(workdir, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error(`path escape blocked: ${rel}`);
  }
  return abs;
}

function writeIfMissing(workdir, rel, body) {
  const abs = safeJoin(workdir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (fs.existsSync(abs)) return false;
  fs.writeFileSync(abs, body, "utf8");
  return true;
}

function scaffoldFolders(workdir, task) {
  const created = [];
  for (const d of DEFAULT_DIRS) {
    const abs = safeJoin(workdir, d);
    if (!fs.existsSync(abs)) {
      fs.mkdirSync(abs, { recursive: true });
      created.push(d);
    }
  }
  const t = String(task || "").toLowerCase();
  const extra = [];
  if (/api|express|backend|server/.test(t)) extra.push("src/api", "src/routes");
  if (/front|react|page|ui|html/.test(t)) extra.push("public", "src/components");
  if (/mobile|flutter|android/.test(t)) extra.push("mobile");
  for (const d of extra) {
    const abs = safeJoin(workdir, d);
    if (!fs.existsSync(abs)) {
      fs.mkdirSync(abs, { recursive: true });
      created.push(d);
    }
  }
  if (writeIfMissing(
    workdir,
    "README.md",
    `# Project\n\nScaffolded by JagX group agent.\n\nTask: ${String(task).slice(0, 200)}\n`,
  )) {
    created.push("README.md");
  }
  return created;
}

function specialistStarter(role, workdir, task) {
  const t = String(task || "");
  const wrote = [];
  if (role === "backend" || role === "files") {
    if (writeIfMissing(
      workdir,
      "src/server.js",
      `// Starter — JagX ${role}\n// Task: ${t.slice(0, 120)}\nimport http from "node:http";\n\nconst port = process.env.PORT || 3000;\nconst server = http.createServer((req, res) => {\n  if (req.url === "/health") {\n    res.writeHead(200, { "content-type": "application/json" });\n    res.end(JSON.stringify({ ok: true }));\n    return;\n  }\n  res.writeHead(200, { "content-type": "text/plain" });\n  res.end("hello from jagx");\n});\n\nserver.listen(port, () => console.log("listening", port));\n`,
    )) {
      wrote.push("src/server.js");
    }
    if (writeIfMissing(
      workdir,
      "package.json",
      JSON.stringify(
        {
          name: "jagx-project",
          version: "0.0.1",
          type: "module",
          scripts: { start: "node src/server.js" },
        },
        null,
        2,
      ) + "\n",
    )) {
      wrote.push("package.json");
    }
  }
  if (role === "frontend" || role === "design") {
    if (writeIfMissing(
      workdir,
      "public/index.html",
      `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1" />\n  <title>JagX project</title>\n  <style>\n    body { font-family: system-ui, sans-serif; margin: 2rem; }\n    h1 { color: #0ea5e9; }\n  </style>\n</head>\n<body>\n  <h1>Hello from JagX</h1>\n  <p>${t.replace(/</g, "<").slice(0, 160)}</p>\n</body>\n</html>\n`,
    )) {
      wrote.push("public/index.html");
    }
  }
  if (role === "shell") {
    if (writeIfMissing(
      workdir,
      "scripts/dev.sh",
      `#!/usr/bin/env bash\nset -euo pipefail\necho "JagX shell starter — task: ${t.slice(0, 80)}"\nnode src/server.js\n`,
    )) {
      wrote.push("scripts/dev.sh");
    }
  }
  return wrote;
}

export async function runWorker({
  role,
  task,
  workdir = process.cwd(),
  maxSteps = 10,
  autoWrite = true,
  autoShell = true,
  dryRun = false,
  sharedContext = "",
  rl,
  transcript = [],
  writeLock,
  allowSocial = false,
}) {
  say(role, `Starting: ${String(task).slice(0, 120)}`);
  if (transcript) transcript.push(`**${role}:** starting ${task}`);

  if (dryRun) {
    say(role, "(dry-run — no writes)");
    return { role, ok: true, dryRun: true };
  }

  if (role === "scaffold" && autoWrite) {
    try {
      const created = scaffoldFolders(workdir, task);
      say(
        role,
        created.length
          ? `Created: ${created.join(", ")}`
          : "Folders already present — scaffold complete.",
      );
      if (transcript) {
        transcript.push(`**scaffold:** created ${created.join(", ") || "(existing)"}`);
      }
    } catch (e) {
      say(role, `Scaffold error: ${e.message}`);
      return { role, ok: false, error: e.message };
    }
  } else if (autoWrite && ["backend", "frontend", "files", "design", "shell"].includes(role)) {
    try {
      const wrote = specialistStarter(role, workdir, task);
      say(
        role,
        wrote.length
          ? `Wrote starters: ${wrote.join(", ")}`
          : "Starters already present — nothing to overwrite.",
      );
      if (transcript && wrote.length) {
        transcript.push(`**${role}:** wrote ${wrote.join(", ")}`);
      }
    } catch (e) {
      say(role, `Write error: ${e.message}`);
      return { role, ok: false, error: e.message };
    }
  } else {
    say(role, `Working on assignment (hands-off=${autoWrite}, steps≤${maxSteps}).`);
  }

  say(role, `Done with: ${String(task).slice(0, 100)}`);
  if (transcript) transcript.push(`**${role}:** done — ${task}`);
  return { role, ok: true };
}

export async function reviewAndRework({
  workdir = process.cwd(),
  assignments = [],
  maxRework = 2,
  transcript = [],
}) {
  say("review", "Checking board for gaps and mistakes…");
  if (transcript) transcript.push("**Review:** checking board");

  const open = (assignments || []).filter((a) => a.status !== "done");
  let notes = [];
  try {
    if (!fs.existsSync(path.join(workdir, "src"))) notes.push("no src/ folder");
    if (!fs.existsSync(path.join(workdir, "README.md"))) notes.push("no README.md");
  } catch {
    /* ignore */
  }

  if (!open.length && !notes.length) {
    say("review", "Board looks complete.");
    if (transcript) transcript.push("**Review:** board complete");
    return { ok: true, rework: [], notes };
  }

  if (notes.length) say("review", `Notes: ${notes.join("; ")}`);
  if (open.length) {
    say("review", `${open.length} item(s) still open — flag for rework (max ${maxRework}).`);
  }
  return {
    ok: notes.length === 0 && open.length === 0,
    rework: open.map((a) => a.id),
    notes,
  };
}

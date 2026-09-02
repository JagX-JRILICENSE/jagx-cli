/**
 * Group worker + review loop.
 * Scaffold creates folders for real; other roles announce + return for provider-backed steps.
 */
import fs from "node:fs";
import path from "node:path";
import { say, DIM, GREEN, YELLOW, RESET } from "./groupHelpers.js";

const DEFAULT_DIRS = ["src", "test", "public", "scripts", ".jagx"];

function safeJoin(workdir, rel) {
  const abs = path.resolve(workdir, rel);
  if (!abs.startsWith(path.resolve(workdir))) {
    throw new Error(`path escape blocked: ${rel}`);
  }
  return abs;
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
  // Hint from task keywords
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
  const readme = safeJoin(workdir, "README.md");
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      `# Project\n\nScaffolded by JagX group agent.\n\nTask: ${String(task).slice(0, 200)}\n`,
      "utf8",
    );
    created.push("README.md");
  }
  return created;
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

  // Scaffold always materializes folders when autoWrite
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
  const missingScaffold = !(assignments || []).some((a) => a.role === "scaffold");

  // Light filesystem sanity
  let notes = [];
  try {
    if (!fs.existsSync(path.join(workdir, "src"))) notes.push("no src/ folder");
    if (!fs.existsSync(path.join(workdir, "README.md"))) notes.push("no README.md");
  } catch {
    /* ignore */
  }

  if (!open.length && !notes.length && !missingScaffold) {
    say("review", "Board looks complete.");
    if (transcript) transcript.push("**Review:** board complete");
    return { ok: true, rework: [], notes };
  }

  if (notes.length) {
    say("review", `Notes: ${notes.join("; ")}`);
  }
  if (open.length) {
    say("review", `${open.length} item(s) still open — flag for rework (max ${maxRework}).`);
  }
  return {
    ok: notes.length === 0 && open.length === 0,
    rework: open.map((a) => a.id),
    notes,
  };
}

/**
 * Coding agent entry — session helpers + runCodeAgent.
 * Minimal exports so CLI and CI load; full loop is in publish package.
 */
import fs from "node:fs";
import path from "node:path";

function sessionPath(workdir) {
  return path.join(workdir, ".jagx", "session.json");
}

function loadSession(workdir) {
  try {
    return JSON.parse(fs.readFileSync(sessionPath(workdir), "utf8"));
  } catch {
    return null;
  }
}

export function getSessionStatus(workdir) {
  const session = loadSession(workdir);
  if (!session) return null;
  return {
    task: session.task,
    totalSteps: session.totalSteps || 0,
    historyTurns: (session.history || []).length,
    hasPlan: !!session.planText,
    planPreview: (session.planText || "").split("\n").slice(0, 8).join("\n"),
  };
}

export function clearSession(workdir) {
  try {
    fs.unlinkSync(sessionPath(workdir));
    return true;
  } catch {
    return false;
  }
}

/**
 * Coding agent loop. Stub until full code.js is uploaded from the publish zip.
 */
export async function runCodeAgent(task, opts = {}) {
  const workdir = opts.workdir || process.cwd();
  console.log(`[code] ${String(task).slice(0, 200)}`);
  console.log(`[code] workdir=${workdir} (stub agent — replace src/code.js with full build)`);
  if (opts.dryRun) console.log("[code] dry-run mode");
  if (opts.review) console.log("[code] review mode");
  return { ok: true, stub: true, task };
}

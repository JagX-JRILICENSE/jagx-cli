/**
 * Coding agent — session helpers + runCodeAgent.
 * Tool dispatch is in executeTool.js; full multi-step loop can be extended here.
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

function saveSession(workdir, session) {
  const dir = path.join(workdir, ".jagx");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(sessionPath(workdir), JSON.stringify(session, null, 2), "utf8");
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
 * Coding agent entry.
 * For production multi-step tool loops, merge body from jagx-cli-3.1.0-publish.zip.
 * executeTool.js is already in-repo for tool dispatch.
 */
export async function runCodeAgent(task, opts = {}) {
  const workdir = opts.workdir || process.cwd();
  const maxSteps = opts.maxSteps || 20;
  const dryRun = !!opts.dryRun;
  const review = !!opts.review;
  const stream = !!opts.stream;

  console.log(`[code] ${String(task).slice(0, 200)}`);
  console.log(`[code] workdir=${workdir}`);
  if (dryRun) console.log("[code] dry-run mode");
  if (review) console.log("[code] review mode");
  if (stream) console.log("[code] stream timings on");

  const session = loadSession(workdir) || {
    task,
    history: [],
    totalSteps: 0,
    planText: "",
  };
  session.task = task;
  session.totalSteps = (session.totalSteps || 0) + 1;
  session.history = session.history || [];
  session.history.push({ role: "user", content: task, at: new Date().toISOString() });
  if (session.history.length > 40) session.history = session.history.slice(-40);
  saveSession(workdir, session);

  // Optional: dynamic import of executeTool when available
  try {
    const { executeAgentTool } = await import("./executeTool.js");
    if (typeof executeAgentTool === "function" && opts.runTool) {
      const result = await executeAgentTool(opts.runTool, {
        workdir,
        dryRun,
        autoWrite: opts.auto || opts.approval === "full-auto",
      });
      return { ok: true, task, workdir, toolResult: result };
    }
  } catch {
    /* executeTool optional for minimal runs */
  }

  console.log(`[code] session step ${session.totalSteps} recorded under .jagx/session.json`);
  console.log("[code] Agent ready. Wire provider keys + full loop from publish zip for multi-step edits.");
  return { ok: true, task, workdir, steps: session.totalSteps };
}

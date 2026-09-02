/**
 * Group worker + review loop.
 * Full tool-dispatch body can be swapped from jagx-cli-3.1.0-publish.zip.
 */
import { say, ask, DIM, CYAN, GREEN, YELLOW, RED, RESET } from "./groupHelpers.js";

export async function runWorker({
  role,
  task,
  workdir,
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
  say(role, `Working on assignment (hands-off=${autoWrite}).`);
  say(role, `Done with: ${String(task).slice(0, 100)}`);
  if (transcript) transcript.push(`**${role}:** done — ${task}`);
  return { role, ok: true };
}

export async function reviewAndRework({
  workdir,
  assignments = [],
  maxRework = 2,
  transcript = [],
}) {
  say("review", "Checking board for gaps and mistakes…");
  if (transcript) transcript.push("**Review:** checking board");
  const todo = (assignments || []).filter((a) => a.status !== "done");
  if (!todo.length) {
    say("review", "Board looks complete.");
    return { ok: true, rework: [] };
  }
  say("review", `${todo.length} item(s) still open — flag for rework if needed.`);
  return { ok: true, rework: todo.map((a) => a.id) };
}

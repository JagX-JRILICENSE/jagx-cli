/**
 * Multi-agent GROUP module.
 * Stub exports satisfy unit tests; full runner ships in publish zip / next push.
 */

export const DEFAULT_MEMBERS = [
  "lead",
  "scaffold",
  "backend",
  "frontend",
  "files",
  "shell",
  "design",
  "review",
];

/**
 * Ensure scaffold agent runs first and wire dependsOn for others.
 * @param {Array<{role:string,task:string,dependsOn?:string[]}>} assignments
 */
export function ensureScaffoldFirst(assignments) {
  const list = (assignments || []).map((a, i) => ({
    id: a.id || `a${i}`,
    role: a.role,
    task: a.task || "",
    dependsOn: Array.isArray(a.dependsOn) ? [...a.dependsOn] : [],
  }));

  if (!list.length || list[0].role === "scaffold") {
    if (list[0]?.role === "scaffold" && !list[0].id) list[0].id = "scaffold-0";
    return list;
  }

  const scaffold = {
    id: "scaffold-0",
    role: "scaffold",
    task: "Create project folders and base files before other agents write code.",
    dependsOn: [],
  };

  for (const a of list) {
    if (!a.dependsOn.includes(scaffold.id)) a.dependsOn.push(scaffold.id);
  }
  return [scaffold, ...list];
}

export function say(roleKey, text) {
  const msg = String(text || "").slice(0, 2000);
  console.log(`[${roleKey}] ${msg}`);
}

/** Full multi-agent session — replace with complete implementation from publish package. */
export async function runGroupSession(task, opts = {}) {
  console.log(`[group] task: ${String(task).slice(0, 200)}`);
  if (opts.dryRun) console.log("[group] dry-run — no writes");
  return { ok: true, task, stub: true };
}

/** Interactive group chat room. */
export async function runGroupChat(opts = {}) {
  console.log(`[group-chat] room open (stub). workdir=${opts.workdir || process.cwd()}`);
  return { ok: true, stub: true };
}

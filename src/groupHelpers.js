/**
 * Multi-agent GROUP helpers — roster, scaffold-first, kickoff, plan.
 */
export const DIM = "\x1b[2m";
export const CYAN = "\x1b[36m";
export const GREEN = "\x1b[32m";
export const YELLOW = "\x1b[33m";
export const RED = "\x1b[31m";
export const RESET = "\x1b[0m";
export const MAX_REWORK = 2;

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

export function ask(rl, q) {
  return new Promise((r) => rl.question(q, r));
}

export function parseAction(text) {
  return null;
}

export function ts() {
  return new Date().toTimeString().slice(0, 8);
}

export function say(roleKey, text) {
  console.log(`[${roleKey}] ${String(text).slice(0, 800)}`);
}

export function printGroupHeader(groupName, members, task, handsOff) {
  console.log(`\n◆ GROUP: ${groupName}`);
  console.log(`  Task: ${task}`);
  console.log(handsOff ? "  Hands-off — agents approve writes" : "  Ask mode — you confirm writes");
  console.log(`  Members: ${(members || []).join(", ")}\n`);
}

export function saveGroupLog(workdir, groupName, transcript) {
  return null;
}

export function ensureScaffoldFirst(assignments) {
  let list = (assignments || []).map((a, i) => ({
    id: a.id || `t${i + 1}`,
    role: a.role,
    task: a.task,
    dependsOn: Array.isArray(a.dependsOn) ? [...a.dependsOn] : [],
    status: "todo",
  }));
  let sc = list.find((a) => a.role === "scaffold");
  if (!sc) {
    sc = {
      id: "t0",
      role: "scaffold",
      task: "Create folders and empty project skeleton before anyone writes code.",
      dependsOn: [],
      status: "todo",
    };
    list = [sc, ...list];
  }
  return list.map((a) => {
    if (a.role === "scaffold") return a;
    if (!a.dependsOn.length) return { ...a, dependsOn: [sc.id] };
    return a;
  });
}

export async function kickoffMeeting(task, members, sharedContext, transcript) {
  say("lead", `Opening the room. Goal: ${task}`);
  if (transcript) transcript.push(`**Lead:** Opening the room. Goal: ${task}`);
}

export async function planAssignments(task, members, sharedContext, transcript) {
  say("lead", "Assigning work. Scaffold goes first.");
  const assignments = ensureScaffoldFirst([
    { id: "t0", role: "scaffold", task: `Create folders for: ${task}`, dependsOn: [] },
    {
      id: "t1",
      role: (members || []).includes("files") ? "files" : "backend",
      task,
      dependsOn: ["t0"],
    },
    { id: "t2", role: "review", task: `QA the result of: ${task}`, dependsOn: ["t1"] },
  ]);
  const summary = "Scaffold first, then specialists, then review.";
  say("lead", summary);
  return { summary, assignments };
}

/**
 * Terminal multi-agent GROUP — war-room entry.
 * Hands-off by default; scaffold first; done + rework loop.
 */
import readline from "node:readline";
import {
  DEFAULT_MEMBERS,
  say,
  ensureScaffoldFirst,
  printGroupHeader,
  saveGroupLog,
  kickoffMeeting,
  planAssignments,
  DIM,
  CYAN,
  GREEN,
  YELLOW,
  RED,
  RESET,
  MAX_REWORK,
} from "./groupHelpers.js";
import { runWorker, reviewAndRework } from "./groupWorker.js";

export { DEFAULT_MEMBERS, say, ensureScaffoldFirst };

export async function runGroupSession(task, opts = {}) {
  const {
    workdir = process.cwd(),
    maxSteps = 10,
    auto = false,
    approval,
    dryRun = false,
    members = null,
    groupName = "jagx-project",
    skipKickoff = false,
    ask: askMode = false,
    maxRework = MAX_REWORK,
    allowSocial = false,
  } = opts;

  const roster = members && members.length ? members : DEFAULT_MEMBERS;
  const handsOff =
    !askMode &&
    approval !== "suggest" &&
    (auto || approval === "auto-edit" || approval === "full-auto");

  printGroupHeader(groupName, roster, task, handsOff);
  const transcript = [`# Group ${groupName}`, `Task: ${task}`, ""];

  if (!skipKickoff) {
    await kickoffMeeting(task, roster, "", transcript);
  }

  const { summary, assignments } = await planAssignments(task, roster, "", transcript);
  say("lead", summary);

  for (const a of assignments) {
    await runWorker({
      role: a.role,
      task: a.task,
      workdir,
      maxSteps,
      autoWrite: handsOff,
      autoShell: handsOff,
      dryRun,
      transcript,
      allowSocial,
    });
    a.status = "done";
  }

  await reviewAndRework({ workdir, assignments, maxRework, transcript });
  saveGroupLog(workdir, groupName, transcript);
  console.log(`${GREEN}Group session complete.${RESET}`);
  return { ok: true, assignments, summary };
}

export async function runGroupChat(opts = {}) {
  const {
    workdir = process.cwd(),
    groupName = "jagx-room",
    auto = true,
    maxSteps = 10,
    dryRun = false,
  } = opts;

  const members = DEFAULT_MEMBERS;
  say("lead", "Room is open. /run <goal>  /members  /exit");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.setPrompt(`${CYAN}group>${RESET} `);
  rl.prompt();

  rl.on("line", async (line) => {
    const text = line.trim();
    if (!text) return rl.prompt();
    if (text === "/exit" || text === "/quit") {
      console.log(`${DIM}Group closed.${RESET}`);
      rl.close();
      return;
    }
    if (text === "/members") {
      members.forEach((m) => console.log(`  ● ${m}`));
      return rl.prompt();
    }
    if (text.startsWith("/run ")) {
      const goal = text.slice(5).trim();
      rl.pause();
      await runGroupSession(goal, {
        workdir,
        groupName,
        members,
        auto: true,
        approval: "full-auto",
        dryRun,
        maxSteps,
      });
      rl.resume();
      return rl.prompt();
    }
    say("lead", `Heard: ${text.slice(0, 120)}. Use /run <goal> to start a build.`);
    rl.prompt();
  });

  rl.on("close", () => process.exit(0));
}

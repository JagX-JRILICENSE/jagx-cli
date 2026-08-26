/**
 * Multi-agent team orchestrator.
 * Lead plans and assigns specialized workers; each worker has a focused role + tool subset.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { sendMessage } from "./api.js";
import { extractJson } from "./jsonUtil.js";
import { sanitizeText, sanitizeAction } from "./sanitize.js";
import { buildRepoMap } from "./repomap.js";
import { loadAgentsFile } from "./agentsFile.js";
import { memoryContextBlock, appendProjectMemory, addFact } from "./memory.js";
import { readFileTool, writeFileTool, listDirTool, runShellTool, isDangerous } from "./tools.js";
import { searchCode } from "./search.js";
import { applyUnifiedPatch } from "./patch.js";
import { lineDiff, renderDiff } from "./diff.js";
import { backupBeforeWrite } from "./backup.js";
import { loadProjectConfig, detectTestCommand } from "./projectConfig.js";
import { printSupportFooter } from "./theme.js";
import { generateImage } from "./images.js";
import { previewUrl, formatPreview } from "./preview.js";

const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";

/** Specialist roster */
export const TEAM_ROLES = {
  lead: {
    name: "Lead",
    color: CYAN,
    system: `You are the Lead architect agent. Decompose the user task into specialist subtasks.
Reply ONLY with JSON:
{"assignments":[{"role":"scaffold|backend|frontend|files|shell|design|review|image","task":"...","dependsOn":[]}],"summary":"..."}
Roles: scaffold (ALWAYS first — folders only), files, backend, frontend, shell, design, review, image.
Keep 3–7 assignments. Scaffold must create directories before anyone else writes code.`,
  },
  scaffold: {
    name: "Scaffold",
    color: YELLOW,
    system: `You are the Scaffold agent. You ALWAYS go first. Create folders with mkdir/mkdir_p and tiny placeholders only. Do not implement features. Finish with {"final":"created …"}.`,
    tools: ["list_dir", "mkdir", "mkdir_p", "run_shell", "write_file", "finish"],
  },
  files: {
    name: "Files",
    color: GREEN,
    system: `You are the Files agent. Implement source files with write_file or apply_patch. Read before write. One mutating tool per turn. When finished, announce what you created. Finish with {"final":"..."}.`,
    tools: ["list_dir", "read_file", "search_code", "glob", "write_file", "apply_patch", "finish"],
  },
  backend: {
    name: "Backend",
    color: MAGENTA,
    system: `You are the Backend agent. APIs, servers, data layer, auth. Prefer apply_patch for edits. Finish with {"final":"..."}.`,
    tools: ["list_dir", "read_file", "search_code", "write_file", "apply_patch", "run_shell", "finish"],
  },
  frontend: {
    name: "Frontend",
    color: CYAN,
    system: `You are the Frontend agent. UI components, styles, client pages. Finish with {"final":"..."}.`,
    tools: ["list_dir", "read_file", "search_code", "glob", "write_file", "apply_patch", "finish"],
  },
  shell: {
    name: "Shell",
    color: RED,
    system: `You are the Shell agent. Run install/build/test commands. Diagnose failures. No source rewrites unless a one-line fix. Finish with {"final":"..."}.`,
    tools: ["list_dir", "read_file", "run_shell", "finish"],
  },
  design: {
    name: "Design",
    color: YELLOW,
    system: `You are the Design agent. Improve UX structure, copy, accessibility notes, CSS layout. Prefer patches. Finish with {"final":"..."}.`,
    tools: ["list_dir", "read_file", "search_code", "write_file", "apply_patch", "finish"],
  },
  review: {
    name: "Review",
    color: DIM,
    system: `You are the Review agent. Read-only QA. After others say they are done, look for missing work and mistakes. Finish with a summary. If you find issues, list role + problem so Lead can send work back.`,
    tools: ["list_dir", "read_file", "search_code", "glob", "preview_url", "finish"],
  },
  image: {
    name: "Image",
    color: MAGENTA,
    system: `You are the Image agent. Generate UI mockups or assets with generate_image. Save under assets/. Finish with {"final":"..."}.`,
    tools: ["generate_image", "list_dir", "finish"],
  },
  architect: {
    name: "Architect",
    color: CYAN,
    system: `You are the Architect. Produce system blueprints (docs/ARCHITECTURE.md) with mermaid. No feature code. Finish with {"final":"..."}.`,
    tools: ["list_dir", "read_file", "write_blueprint", "write_file", "finish"],
  },
};

function ask(rl, q) {
  return new Promise((r) => rl.question(q, r));
}

function parseAction(text) {
  const raw = extractJson(sanitizeText(text));
  return sanitizeAction(raw);
}

async function runWorker({
  role,
  task,
  workdir,
  maxSteps,
  autoWrite,
  autoShell,
  dryRun,
  stream,
  sharedContext,
  rl,
}) {
  const spec = TEAM_ROLES[role] || TEAM_ROLES.files;
  const history = [];
  let message = `${spec.system}\n\nProject folder: ${workdir}\n${sharedContext}\n\nYour assignment: ${task}\n\nReply with one tool JSON per turn, or {"final":"summary"}.`;
  let steps = 0;
  let summary = "";
  const writes = [];

  console.log(`\n${spec.color}▸ ${spec.name}${RESET} ${DIM}— ${task.slice(0, 100)}${RESET}`);

  while (steps < maxSteps) {
    steps++;
    const t0 = Date.now();
    process.stdout.write(`${DIM}  [${spec.name} step ${steps}] thinking…${RESET}\r`);
    const { response } = await sendMessage(message, history, "engineer", { agentTools: true });
    process.stdout.write(" ".repeat(50) + "\r");
    if (stream && response && !response.trim().startsWith("{")) {
      process.stdout.write(`${DIM}${response.slice(0, 200)}${RESET}\n`);
    }
    const ms = Date.now() - t0;
    const action = parseAction(response);

    if (!action) {
      console.log(`${YELLOW}  [${spec.name}] protocol miss (${ms}ms)${RESET}`);
      history.push({ role: "user", content: message });
      history.push({ role: "assistant", content: response.slice(0, 1500) });
      message = `Reply ONLY with tool JSON or {"final":"..."}.`;
      continue;
    }

    if (action.final || action.tool === "finish") {
      summary = sanitizeText(action.final || action.input?.summary || "Done.");
      console.log(`${GREEN}  [${spec.name}] done (${ms}ms):${RESET} ${summary.slice(0, 200)}`);
      break;
    }

    const tool = action.tool;
    const input = action.input || {};
    // enforce role tool allowlist when present
    if (spec.tools && !spec.tools.includes(tool) && tool !== "finish") {
      history.push({ role: "user", content: message });
      history.push({ role: "assistant", content: response });
      message = `[TOOL RESULT] Role ${role} cannot use ${tool}. Allowed: ${spec.tools.join(", ")}`;
      continue;
    }

    let result = "";
    try {
      if (tool === "list_dir") {
        result = listDirTool(workdir, input.path);
        console.log(`${DIM}  [list_dir ${input.path || "."}] (${ms}ms)${RESET}`);
      } else if (tool === "read_file") {
        result = readFileTool(workdir, input.path);
        console.log(`${DIM}  [read_file ${input.path}] (${ms}ms)${RESET}`);
      } else if (tool === "search_code") {
        result = searchCode(workdir, input.query);
        console.log(`${DIM}  [search_code "${input.query}"] (${ms}ms)${RESET}`);
      } else if (tool === "write_file") {
        const content = sanitizeText(input.content ?? "");
        const full = path.resolve(workdir, input.path || "");
        const existed = fs.existsSync(full);
        const prev = existed ? fs.readFileSync(full, "utf8") : "";
        console.log(`  ${CYAN}${input.path}${RESET}`);
        console.log(renderDiff(lineDiff(prev, content)).split("\n").slice(0, 40).join("\n"));
        if (dryRun) result = "(dry-run)";
        else if (role === "review") result = "Review role cannot write.";
        else {
          const ok =
            autoWrite ||
            (await ask(rl, `${YELLOW}  Apply write ${input.path}? (y/n) ${RESET}`)).toLowerCase().startsWith("y");
          if (!ok) result = "Declined.";
          else {
            backupBeforeWrite(workdir, input.path, existed, prev);
            result = writeFileTool(workdir, input.path, content);
            writes.push(input.path);
            console.log(`${GREEN}  [wrote ${input.path}]${RESET}`);
          }
        }
      } else if (tool === "apply_patch") {
        if (role === "review" || dryRun) {
          result = dryRun ? "(dry-run patch)" : "Review cannot patch.";
        } else {
          const prev = readFileTool(workdir, input.path);
          const next = applyUnifiedPatch(prev, sanitizeText(input.patch || ""));
          console.log(`  ${CYAN}${input.path} (patch)${RESET}`);
          console.log(renderDiff(lineDiff(prev, next)).split("\n").slice(0, 40).join("\n"));
          const ok =
            autoWrite ||
            (await ask(rl, `${YELLOW}  Apply patch ${input.path}? (y/n) ${RESET}`)).toLowerCase().startsWith("y");
          if (!ok) result = "Declined.";
          else {
            backupBeforeWrite(workdir, input.path, true, prev);
            result = writeFileTool(workdir, input.path, next);
            writes.push(input.path);
            console.log(`${GREEN}  [patched ${input.path}]${RESET}`);
          }
        }
      } else if (tool === "run_shell") {
        if (isDangerous(input.command || "")) {
          result = "Blocked dangerous command.";
          console.log(`${RED}  [blocked] ${input.command}${RESET}`);
        } else if (dryRun) {
          result = "(dry-run)";
          console.log(`${DIM}  [would run] ${input.command}${RESET}`);
        } else {
          const ok =
            autoShell ||
            (await ask(rl, `${YELLOW}  Run: ${input.command}? (y/n) ${RESET}`)).toLowerCase().startsWith("y");
          if (!ok) result = "Declined.";
          else {
            console.log(`${DIM}  [running] ${input.command}${RESET}`);
            result = runShellTool(workdir, input.command);
            console.log(String(result).slice(0, 500));
          }
        }
      } else if (tool === "generate_image") {
        if (dryRun) result = "(dry-run image)";
        else {
          try {
            const img = await generateImage(workdir, { prompt: input.prompt, filename: input.filename });
            result = `Saved ${img.path}`;
            console.log(`${GREEN}  [image ${img.path}]${RESET}`);
          } catch (e) {
            result = `Image error: ${e.message}`;
          }
        }
      } else if (tool === "preview_url") {
        try {
          result = formatPreview(await previewUrl(input.url));
          console.log(`${DIM}  [preview ${input.url}]${RESET}`);
        } catch (e) {
          result = e.message;
        }

      } else {
        result = `Unknown tool ${tool}`;
      }
    } catch (e) {
      result = `Error: ${e.message}`;
    }

    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: response });
    message = `[TOOL RESULT for ${tool}]\n${String(result).slice(0, 6000)}\n\nContinue or {"final":"..."}.`;
  }

  return { role, summary, writes, steps };
}

export async function runTeamAgent(task, opts) {
  const {
    workdir,
    maxSteps = 12,
    auto = false,
    approval,
    dryRun = false,
    stream = false,
  } = opts;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const projectConfig = loadProjectConfig(workdir);
  const autoWrite = auto || approval === "auto-edit" || approval === "full-auto" || projectConfig.approval === "auto-edit";
  const autoShell = auto || approval === "full-auto" || projectConfig.approval === "full-auto";

  console.log(`${CYAN}JagX Team${RESET} — multi-agent mode · folder: ${workdir}${dryRun ? " [DRY RUN]" : ""}\n`);

  const repoMap = buildRepoMap(workdir);
  const agents = loadAgentsFile(workdir);
  const memory = memoryContextBlock(workdir);
  const sharedContext = `File tree:\n${repoMap}${agents ? `\n\nHouse rules (${agents.file}):\n${agents.content}` : ""}${memory}`;

  // Lead plans
  console.log(`${DIM}Lead planning…${RESET}`);
  const leadMsg = `${TEAM_ROLES.lead.system}\n\n${sharedContext}\n\nUser task: ${task}`;
  const t0 = Date.now();
  const { response: leadRaw } = await sendMessage(leadMsg, [], "architect");
  const lead = parseAction(leadRaw);
  const assignments = lead?.assignments || [
    { role: "files", task: task, dependsOn: [] },
    { role: "review", task: `Review the changes for: ${task}`, dependsOn: [] },
  ];

  console.log(`${CYAN}Plan (${Date.now() - t0}ms):${RESET}`);
  assignments.forEach((a, i) => {
    console.log(`  ${i + 1}. [${a.role}] ${a.task}`);
  });

  if (!autoWrite && !dryRun) {
    const ok = (await ask(rl, `\n${YELLOW}Run this team plan? (y/n) ${RESET}`)).toLowerCase().startsWith("y");
    if (!ok) {
      console.log(`${DIM}Cancelled.${RESET}`);
      rl.close();
      return;
    }
  }

  const results = [];
  // Group: run assignments with empty dependsOn in parallel batches; sequential otherwise
  const remaining = assignments.map((a, i) => ({ ...a, _i: i }));
  const done = new Set();
  while (remaining.length) {
    const ready = remaining.filter(
      (a) => !(a.dependsOn || []).length || (a.dependsOn || []).every((d) => done.has(d) || done.has(String(d)))
    );
    const batch = (ready.length ? ready : [remaining[0]]).slice(0, 3); // max 3 parallel
    for (const b of batch) {
      const idx = remaining.findIndex((x) => x._i === b._i);
      if (idx >= 0) remaining.splice(idx, 1);
    }
    console.log(`${DIM}Parallel batch: ${batch.map((b) => b.role).join(", ")}${RESET}`);
    const batchResults = await Promise.all(
      batch.map((a) =>
        runWorker({
          role: TEAM_ROLES[a.role] ? a.role : "files",
          task: a.task,
          workdir,
          maxSteps: Math.min(maxSteps, 10),
          autoWrite,
          autoShell,
          dryRun,
          stream,
          sharedContext:
            sharedContext +
            (results.length
              ? `\n\nPrior team results:\n${results.map((x) => `- ${x.role}: ${x.summary}`).join("\n")}`
              : ""),
          rl,
        })
      )
    );
    for (const r of batchResults) {
      results.push(r);
      done.add(r.role);
    }
  }

  const allWrites = results.flatMap((r) => r.writes);
  const digest = results.map((r) => `${r.role}: ${r.summary}`).join("\n");
  appendProjectMemory(workdir, `Team task: ${task}\n${digest}`);
  if (allWrites.length) addFact(workdir, `Team touched files: ${[...new Set(allWrites)].join(", ")}`);

  console.log(`\n${GREEN}Team finished.${RESET}`);
  results.forEach((r) => console.log(`  ${r.role}: ${r.summary.slice(0, 120)}`));
  if (allWrites.length) console.log(`${DIM}Files: ${[...new Set(allWrites)].join(", ")}${RESET}`);

  const testCmd = projectConfig.testCommand || detectTestCommand(workdir);
  if (testCmd && !dryRun && autoShell) {
    console.log(`${DIM}Running ${testCmd}…${RESET}`);
    console.log(runShellTool(workdir, testCmd).slice(0, 1500));
  }

  printSupportFooter();
  rl.close();
}

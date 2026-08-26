import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { sendMessage } from "./api.js";
import { streamAgentStep } from "./stream.js";
import { readFileTool, writeFileTool, listDirTool, runShellTool, isDangerous } from "./tools.js";
import { lineDiff, renderDiff } from "./diff.js";
import { buildRepoMap } from "./repomap.js";
import { backupBeforeWrite } from "./backup.js";
import { loadProjectConfig, detectTestCommand } from "./projectConfig.js";
import {
  PLANNING_PROMPT,
  AGENT_LOOP_PROMPT,
  REFLECT_PROMPT,
  JSON_RECOVERY_NUDGE,
} from "./prompts.js";
import { fetchUrlTool } from "./netTools.js";
import { listPlugins, sendEmailViaResend } from "./plugins.js";
import { printSupportFooter } from "./theme.js";
import { searchCode } from "./search.js";
import { loadAgentsFile } from "./agentsFile.js";
import { isGitRepo, gitContext, hasUncommittedChanges, commitAll } from "./git.js";
import { extractJson, isToolAction } from "./jsonUtil.js";
import { sanitizeText, sanitizeAction } from "./sanitize.js";
import { applyUnifiedPatch } from "./patch.js";
import { memoryContextBlock, appendProjectMemory, addFact } from "./memory.js";
import { skillsContextBlock } from "./skills.js";
import { generateImage } from "./images.js";
import { previewUrl, formatPreview } from "./preview.js";
import { browserPreview } from "./browser.js";
import { runIntegration, SOCIAL_TOOLS } from "./integrations.js";

export const DIM = "\x1b[2m";
export const CYAN = "\x1b[36m";
export const GREEN = "\x1b[32m";
export const YELLOW = "\x1b[33m";
export const RED = "\x1b[31m";
export const RESET = "\x1b[0m";

export const MAX_JSON_RETRIES = 2;

export function sessionPath(workdir) {
  return path.join(workdir, ".jagx", "session.json");
}
export function loadSession(workdir) {
  try {
    return JSON.parse(fs.readFileSync(sessionPath(workdir), "utf8"));
  } catch {
    return null;
  }
}
export function saveSession(workdir, session) {
  fs.mkdirSync(path.dirname(sessionPath(workdir)), { recursive: true });
  fs.writeFileSync(sessionPath(workdir), JSON.stringify(session, null, 2));
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

export function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function resolveApprovalMode(approval, legacyAuto, projectConfig) {
  if (approval) return approval;
  if (legacyAuto) return "full-auto";
  if (projectConfig.approval) return projectConfig.approval;
  if (projectConfig.auto) return "full-auto";
  return "suggest";
}

export async function makePlan(task, repoMap) {
  const message = `${PLANNING_PROMPT}\n\nProject file tree:\n${repoMap}\n\nTask: ${task}`;
  const { response } = await sendMessage(message, [], "engineer");
  const parsed = extractJson(sanitizeText(response));
  if (parsed?.plan && Array.isArray(parsed.plan)) {
    return sanitizeAction(parsed).plan;
  }
  return null;
}

export function addUsage(totals, usage) {
  if (!usage) return;
  totals.inputTokens += usage.inputTokens || 0;
  totals.outputTokens += usage.outputTokens || 0;
}

export function normalizeAction(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.tool === "finish") {
    return { final: raw.input?.summary || raw.input?.final || "Done." };
  }
  if (typeof raw.final === "string") return { final: raw.final };
  if (Array.isArray(raw.tools) && raw.tools.length) {
    return { tools: raw.tools.map((t) => ({ tool: t.tool, input: t.input || {} })) };
  }
  if (typeof raw.tool === "string") return { tool: raw.tool, input: raw.input || {} };
  return null;
}

export const READ_ONLY_TOOLS = new Set(["list_dir", "read_file", "search_code", "fetch_url"]);

export function isReadOnlyTool(name) {
  return READ_ONLY_TOOLS.has(name);
}

export async function requestToolAction(message, history, usageTotals, { stream = false, workdir } = {}) {
  let lastResponse = "";
  let lastHistoryMessage = message;

  for (let attempt = 0; attempt <= MAX_JSON_RETRIES; attempt++) {
    const msg = attempt === 0 ? lastHistoryMessage : JSON_RECOVERY_NUDGE;
    const stepT0 = Date.now();
    process.stdout.write(
      `${DIM}[step] thinking${attempt ? ` (retry ${attempt})` : ""}…${RESET}` + (stream ? "\n" : "\r"),
    );

    let response, usage, structured;
    if (stream) {
      try {
        const system =
          "You are JagX AI coding agent. Reply with ONLY tool JSON when acting (no markdown).";
        const msgs = [...history, { role: "user", content: msg }];
        const streamed = await streamAgentStep({
          system,
          messages: msgs,
          onToken: (chunk) => process.stdout.write(`${DIM}${chunk}${RESET}`),
        });
        process.stdout.write("\n");
        response = streamed.response;
        usage = streamed.usage;
        structured = false;
      } catch {
        const r = await sendMessage(msg, history, "engineer", { agentTools: true, workdir });
        response = r.response;
        usage = r.usage;
        structured = r.structured;
      }
    } else {
      const r = await sendMessage(msg, history, "engineer", { agentTools: true, workdir });
      response = r.response;
      usage = r.usage;
      structured = r.structured;
    }

    usageTotals.apiCalls++;
    addUsage(usageTotals, usage);
    if (!stream) process.stdout.write(" ".repeat(40) + "\r");
    const ms = Date.now() - stepT0;
    if (stream) console.log(`${DIM}  (${ms}ms)${RESET}`);

    lastResponse = response;
    const parsed = extractJson(response);
    const action = normalizeAction(sanitizeAction(parsed));

    if (action && isToolAction(action)) {
      return { action, response: lastResponse, recovered: attempt > 0 };
    }

    history.push({ role: "user", content: msg });
    history.push({
      role: "assistant",
      content: response.slice(0, 2000),
    });
    lastHistoryMessage = JSON_RECOVERY_NUDGE;
  }

  return { action: null, response: lastResponse, recovered: true };
}

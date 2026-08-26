import fs from "node:fs";
import path from "node:path";
import { readFileTool, writeFileTool, listDirTool, runShellTool, isDangerous } from "./tools.js";
import { lineDiff, renderDiff } from "./diff.js";
import { backupBeforeWrite } from "./backup.js";
import { searchCode } from "./search.js";
import { sanitizeText } from "./sanitize.js";
import { applyUnifiedPatch } from "./patch.js";
import { fetchUrlTool } from "./netTools.js";
import { listPlugins, sendEmailViaResend } from "./plugins.js";
import { generateImage } from "./images.js";
import { previewUrl, formatPreview } from "./preview.js";
import { browserPreview } from "./browser.js";
import { runIntegration, SOCIAL_TOOLS } from "./integrations.js";

const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

/**
 * Execute a single agent tool call.
 * @param {string} tool
 * @param {object} input
 * @param {object} ctx workdir, review, dryRun, autoWrite, autoShell, rl, ask, hasResend, plugins
 */
export async function executeAgentTool(tool, input, ctx) {
  const { workdir, review, dryRun, autoWrite, autoShell, rl, ask, hasResend, plugins } = ctx;
  let anyWrites = false;
  let result;
  try {
    if (tool === "list_dir") {
      result = listDirTool(workdir, input?.path);
      console.log(`${DIM}[list_dir ${input?.path || "."}]${RESET}`);
    } else if (tool === "read_file") {
      result = readFileTool(workdir, input?.path);
      console.log(`${DIM}[read_file ${input?.path}]${RESET}`);
    } else if (tool === "search_code") {
      result = searchCode(workdir, input?.query);
      console.log(`${DIM}[search_code "${input?.query}"]${RESET}`);
    } else if (tool === "write_file") {
      if (review) {
        result = "Review mode — writes are disabled. Describe the change only.";
        console.log(`${DIM}[review] blocked write to ${input?.path}${RESET}`);
      } else {
        const safeContent = sanitizeText(input?.content ?? "");
        const full = path.resolve(workdir, input?.path || "");
        const existedBefore = fs.existsSync(full);
        const previousContent = existedBefore ? fs.readFileSync(full, "utf8") : "";
        console.log(`\n${CYAN}${input?.path}${RESET}`);
        console.log(renderDiff(lineDiff(previousContent, safeContent)));

        if (dryRun) {
          result = "(dry run — not actually written)";
          console.log(`${DIM}[dry run, not applied]${RESET}\n`);
        } else {
          const approved =
            autoWrite ||
            (await ask(rl, `${YELLOW}Apply this write to ${input?.path}? (y/n) ${RESET}`))
              .toLowerCase()
              .startsWith("y");
          if (!approved) {
            result = "User declined this write.";
          } else {
            backupBeforeWrite(workdir, input?.path, existedBefore, previousContent);
            result = writeFileTool(workdir, input?.path, safeContent);
            anyWrites = true;
            console.log(`${GREEN}[wrote ${input?.path}]${RESET}\n`);
          }
        }
      }
    } else if (tool === "apply_patch") {
      if (review) {
        result = "Review mode — patches are disabled.";
        console.log(`${DIM}[review] blocked patch to ${input?.path}${RESET}`);
      } else {
        const rel = input?.path || "";
        const patchText = sanitizeText(input?.patch ?? "");
        let previous = "";
        let existed = false;
        try {
          previous = readFileTool(workdir, rel);
          existed = true;
        } catch {
          result = `Error: cannot patch missing file ${rel}. Create it with write_file first.`;
        }
        if (existed) {
          let next;
          try {
            next = applyUnifiedPatch(previous, patchText);
          } catch (e) {
            next = null;
            result = `Patch apply failed: ${e.message}`;
          }
          if (next != null) {
            console.log(`\n${CYAN}${rel} (patch)${RESET}`);
            console.log(renderDiff(lineDiff(previous, next)));
            if (dryRun) {
              result = "(dry run — patch not applied)";
              console.log(`${DIM}[dry run, not applied]${RESET}\n`);
            } else {
              const approved =
                autoWrite ||
                (await ask(rl, `${YELLOW}Apply patch to ${rel}? (y/n) ${RESET}`))
                  .toLowerCase()
                  .startsWith("y");
              if (!approved) result = "User declined this patch.";
              else {
                backupBeforeWrite(workdir, rel, true, previous);
                result = writeFileTool(workdir, rel, next);
                anyWrites = true;
                console.log(`${GREEN}[patched ${rel}]${RESET}\n`);
              }
            }
          }
        }
      }
    } else if (tool === "apply_patch_bundle") {
      const list = Array.isArray(input?.patches) ? input.patches : [];
      if (!list.length) result = "No patches in bundle.";
      else if (review) result = "Review mode — patch bundles disabled.";
      else {
        const outcomes = [];
        for (const item of list) {
          const rel = item.path;
          const patchText = sanitizeText(item.patch || "");
          try {
            const previous = readFileTool(workdir, rel);
            const next = applyUnifiedPatch(previous, patchText);
            console.log(`\n${CYAN}${rel} (bundle patch)${RESET}`);
            console.log(renderDiff(lineDiff(previous, next)).split("\n").slice(0, 30).join("\n"));
            if (dryRun) {
              outcomes.push(`${rel}: dry-run`);
            } else {
              const approved =
                autoWrite ||
                (await ask(rl, `${YELLOW}Apply bundle patch to ${rel}? (y/n) ${RESET}`))
                  .toLowerCase()
                  .startsWith("y");
              if (!approved) outcomes.push(`${rel}: declined`);
              else {
                backupBeforeWrite(workdir, rel, true, previous);
                writeFileTool(workdir, rel, next);
                anyWrites = true;
                outcomes.push(`${rel}: applied`);
                console.log(`${GREEN}[patched ${rel}]${RESET}`);
              }
            }
          } catch (e) {
            outcomes.push(`${rel}: error ${e.message}`);
          }
        }
        result = outcomes.join("\n");
      }
    } else if (tool === "run_shell") {
      if (review) {
        result = "Review mode — shell is disabled.";
        console.log(`${DIM}[review] blocked shell: ${input?.command}${RESET}`);
      } else if (isDangerous(input?.command || "")) {
        result = "Refused: blocked destructive command pattern.";
        console.log(`${RED}[blocked] ${input?.command}${RESET}`);
      } else if (dryRun) {
        result = "(dry run — not actually executed)";
        console.log(`${DIM}[dry run] would run: ${input?.command}${RESET}`);
      } else {
        const approved =
          autoShell ||
          (await ask(rl, `${YELLOW}Run: ${input?.command} ? (y/n) ${RESET}`))
            .toLowerCase()
            .startsWith("y");
        if (!approved) {
          result = "User declined running this command.";
        } else {
          console.log(`${DIM}[running] ${input?.command}${RESET}`);
          result = runShellTool(workdir, input?.command);
        }
      }
    } else if (tool === "fetch_url") {
      if (dryRun) {
        result = "(dry run — not actually fetched)";
      } else {
        try {
          const res = await fetchUrlTool(input?.url);
          result = `status ${res.status}\nheaders: ${JSON.stringify(res.headers).slice(0, 800)}\nbody snippet: ${res.body.slice(0, 1500)}`;
          console.log(`${DIM}[fetch_url ${input?.url}]${RESET}`);
        } catch (e) {
          result = `Error: ${e.message}`;
        }
      }
    } else if (tool === "send_email") {
      if (!hasResend) {
        result =
          "No email plugin configured. Run: jagx plugin add resend --key YOUR_RESEND_KEY --from you@yourdomain.com";
      } else {
        console.log(
          `\n${CYAN}Proposed email${RESET}\nTo: ${input?.to}\nSubject: ${input?.subject}\n\n${input?.body}\n`,
        );
        const approved = (
          await ask(rl, `${YELLOW}Send this email? (y/n) ${RESET}`)
        )
          .toLowerCase()
          .startsWith("y");
        if (!approved) {
          result = "User declined sending this email.";
        } else {
          try {
            await sendEmailViaResend({
              apiKey: plugins.resend.key,
              from: plugins.resend.from,
              to: input?.to,
              subject: input?.subject,
              text: input?.body,
            });
            result = `Email sent to ${input?.to}.`;
            console.log(`${GREEN}[email sent]${RESET}\n`);
          } catch (e) {
            result = `Error sending email: ${e.message}`;
          }
        }
      }
    } else if (tool === "generate_image") {
      if (review || dryRun) {
        result = dryRun ? "(dry-run image)" : "Review mode — images disabled.";
      } else {
        try {
          const img = await generateImage(workdir, { prompt: input?.prompt, filename: input?.filename });
          result = `Saved image to ${img.path}`;
          console.log(`${GREEN}[image ${img.path}]${RESET}`);
        } catch (e) {
          result = `Image error: ${e.message}`;
          console.log(`${RED}[image error] ${e.message}${RESET}`);
        }
      }
    } else if (tool === "preview_url") {
      try {
        const prev = await browserPreview(input?.url, { workdir });
        result = prev.formatted || formatPreview(prev);
        console.log(`${DIM}[preview_url ${input?.url} → ${prev.status} via ${prev.mode}]${RESET}`);
      } catch (e) {
        try {
          const prev = await previewUrl(input?.url);
          result = formatPreview(prev);
        } catch (e2) {
          result = `Preview error: ${e.message}`;
        }
      }
    } else if (
      ["supabase_query", "x_post", "x_reply", "social_webhook", "write_blueprint"].includes(tool)
    ) {
      if (review || dryRun) result = dryRun ? `(dry-run ${tool})` : "Review mode — disabled.";
      else if (SOCIAL_TOOLS.has(tool)) {
        const ok = (
          await ask(rl, `${YELLOW}Allow ${tool}? This leaves your machine. (y/n) ${RESET}`)
        )
          .toLowerCase()
          .startsWith("y");
        if (!ok) result = "Declined.";
        else result = await runIntegration(tool, input, workdir);
      } else {
        result = await runIntegration(tool, input, workdir);
      }
    } else {
      result = `Unknown tool: ${tool}`;
    }
  } catch (err) {
    result = `Error: ${err.message}`;
  }
  return { result, anyWrites };
}

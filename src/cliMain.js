import {
  PROVIDERS, APPROVAL_MODES,
  DIM, CYAN, GREEN, RED, YELLOW, RESET,
  printHelp, printSupport, maybeNoticeDemoKey, parseArgs, oneShot, interactive,
} from "./cliCore.js";
import { saveConfig, setProvider, getDefaultMode, getProvider, usingDemoKey } from "./config.js";
import { sendMessage, MODES } from "./api.js";
import { runCodeAgent, clearSession, getSessionStatus } from "./code.js";
import { undoLastWrite, listBackups } from "./backup.js";
import { printBanner, printSupportFooter, printSupportFull, setTheme, listThemes } from "./theme.js";
import { scanForSecrets, checkDependencies, checkLiveSite } from "./audit.js";
import { monitorUrl } from "./monitor.js";
import { listPlugins, setPlugin, removePlugin } from "./plugins.js";
import { runDoctor } from "./doctor.js";
import { getVersion } from "./version.js";
import { initProject } from "./init.js";
import { streamChat } from "./stream.js";
import { printModelCatalog, recommendAfterConnect } from "./models.js";
import { runTeamAgent } from "./team.js";
import { runGroupSession, runGroupChat } from "./group.js";
import { clearMemory } from "./memory.js";
import { printLedger } from "./ledger.js";
import { listSkills, ensureExampleSkill } from "./skills.js";
import { printFeatures } from "./features.js";
import { loadBoard, listGroupLogs, printBoard } from "./board.js";
import { sendEmail, supabaseRequest, xPost, socialWebhook, writeBlueprint } from "./integrations.js";
import { generateImage } from "./images.js";

export async function main(argv) {
  const { mode, positional, flags } = parseArgs(argv);

  if (flags.help) return printHelp();
  if (flags.version || positional[0] === "version") {
    console.log(`jagx-cli ${getVersion()}`);
    return;
  }
  if (positional[0] === "support") return printSupport();
  if (positional[0] === "doctor") return runDoctor();
  if (positional[0] === "features") {
    printFeatures();
    return;
  }
  if (positional[0] === "roadmap") {
    const { printRoadmap } = await import("./roadmap.js");
    printRoadmap();
    return;
  }
  if (positional[0] === "blueprint") {
    const title = positional.slice(1).join(" ").trim() || "Architecture";
    const dir = flags.dir || process.cwd();
    const file = writeBlueprint(dir, {
      title,
      content: `Blueprint for: ${title}\n\nFill in services, data stores, and interfaces. Generated as a starting architecture doc.`,
      mermaid: `flowchart LR\n  user[User] --> api[API]\n  api --> db[(Store)]`,
    });
    console.log(`${GREEN}Wrote${RESET} ${file}`);
    return;
  }
  if (positional[0] === "email") {
    try {
      const r = await sendEmail({ to: flags.to, subject: flags.subject, text: flags.text });
      console.log(`${GREEN}Sent${RESET} ${JSON.stringify(r).slice(0, 300)}`);
    } catch (e) {
      console.log(`${RED}${e.message}${RESET}`);
    }
    return;
  }
  if (positional[0] === "x") {
    const text = positional.slice(1).join(" ").trim() || flags.text;
    try {
      const r = await xPost({ text, in_reply_to: flags.inReplyTo });
      console.log(r);
    } catch (e) {
      console.log(`${RED}${e.message}${RESET}`);
    }
    return;
  }
  if (positional[0] === "supabase") {
    try {
      const r = await supabaseRequest({ table: flags.table, query: flags.query, method: flags.method || "GET" });
      console.log(r);
    } catch (e) {
      console.log(`${RED}${e.message}${RESET}`);
    }
    return;
  }
  if (positional[0] === "ledger") {
    printLedger(flags.dir || process.cwd());
    return;
  }
  if (positional[0] === "skills") {
    const dir = flags.dir || process.cwd();
    if (positional[1] === "init") {
      const f = ensureExampleSkill(dir);
      console.log(`${GREEN}Example skill:${RESET} ${f}`);
      return;
    }
    const skills = listSkills(dir);
    if (!skills.length) console.log(`${DIM}No skills found. Try: jagx skills init${RESET}`);
    else skills.forEach((s) => console.log(`${s.id}  ${DIM}${s.path}${RESET}`));
    return;
  }
  if (positional[0] === "image") {
    const prompt = positional.slice(1).join(" ").trim();
    if (!prompt) {
      console.log('Usage: jagx image "a blue robot mascot" [--name robot.png]');
      return;
    }
    const dir = flags.dir || process.cwd();
    try {
      const img = await generateImage(dir, { prompt, filename: flags.name });
      console.log(`${GREEN}Saved${RESET} ${img.path}`);
    } catch (e) {
      console.log(`${RED}${e.message}${RESET}`);
    }
    return;
  }
  if (positional[0] === "models") {
    printModelCatalog(positional[1] || null);
    return;
  }
  if (positional[0] === "memory") {
    const dir = flags.dir || process.cwd();
    if (positional[1] === "clear") {
      console.log(clearMemory(dir) ? `${GREEN}Memory cleared in ${dir}${RESET}` : `${DIM}No memory to clear${RESET}`);
      return;
    }
    console.log("Usage: jagx memory clear [--dir path]");
    return;
  }
  if (positional[0] === "group") {
    const sub = positional[1];
    const dir = flags.dir || process.cwd();
    if (sub === "chat") {
      maybeNoticeDemoKey();
      return runGroupChat({
        workdir: dir,
        groupName: flags.name || "jagx-room",
        auto: flags.auto || !flags.ask,
        approval: flags.ask ? "suggest" : "full-auto",
        dryRun: !!flags.dryRun,
        maxSteps: flags.maxSteps || 10,
      });
    }
    if (sub === "board") {
      printBoard(loadBoard(dir));
      return;
    }
    if (sub === "last") {
      const logs = listGroupLogs(dir);
      if (!logs[0]) {
        console.log(`${DIM}No group transcripts in ${dir}${RESET}`);
        return;
      }
      const fs = await import("node:fs");
      console.log(fs.readFileSync(logs[0].file, "utf8"));
      return;
    }
    const task = positional.slice(1).join(" ").trim();
    if (!task) {
      console.log(
        'Usage:\n  jagx group "build a todo api with ui"     (hands-off by default)\n  jagx group "…" --ask                    (you confirm writes)\n  jagx group chat | board | last',
      );
      return;
    }
    maybeNoticeDemoKey();
    return runGroupSession(task, {
      workdir: dir,
      groupName: flags.name || "jagx-project",
      maxSteps: flags.maxSteps || 10,
      auto: flags.auto || !flags.ask,
      approval: flags.ask ? "suggest" : flags.approval || "full-auto",
      dryRun: !!flags.dryRun,
      skipKickoff: !!flags.skipKickoff,
      ask: !!flags.ask,
      allowSocial: !!flags.allowSocial,
    });
  }
  if (positional[0] === "team") {
    const task = positional.slice(1).join(" ").trim();
    if (!task) {
      console.log('Usage: jagx team "build a landing page with api" [--dir path] [--approval mode] [--dry-run]');
      return;
    }
    maybeNoticeDemoKey();
    return runGroupSession(task, {
      workdir: flags.dir || process.cwd(),
      groupName: flags.name || "jagx-project",
      maxSteps: flags.maxSteps || 10,
      auto: flags.auto || !flags.ask,
      approval: flags.ask ? "suggest" : flags.approval || "full-auto",
      dryRun: !!flags.dryRun,
      ask: !!flags.ask,
    });
  }

  if (positional[0] === "init") {
    const dir = flags.dir || process.cwd();
    const { created, skipped } = initProject(dir, { force: !!flags.force });
    console.log(`${CYAN}jagx init${RESET} in ${dir}\n`);
    created.forEach((f) => console.log(`  ${GREEN}+${RESET} ${f}`));
    skipped.forEach((f) => console.log(`  ${DIM}· ${f}${RESET}`));
    if (!created.length && skipped.length) console.log(`\n${DIM}Use --force to overwrite${RESET}`);
    return;
  }

  if (positional[0] === "theme") {
    if (!positional[1]) {
      console.log(`Available themes: ${listThemes().join(", ")}`);
      return;
    }
    try {
      setTheme(positional[1]);
      console.log(`Theme set to ${positional[1]}.`);
    } catch (e) {
      console.log(e.message);
    }
    return;
  }

  if (positional[0] === "undo") {
    const dir = flags.dir || process.cwd();
    if (flags.list) {
      const log = listBackups(dir);
      if (!log.length) {
        console.log(`${DIM}No tracked writes in ${dir}${RESET}`);
        return;
      }
      console.log(`${CYAN}Write history${RESET} (${log.length}):\n`);
      log
        .slice()
        .reverse()
        .forEach((e, i) => {
          const kind = e.existedBefore ? "modified" : "created";
          console.log(`  ${i + 1}. ${e.path}  ${DIM}(${kind}, ${e.time})${RESET}`);
        });
      console.log(`\n${DIM}jagx undo — reverts the most recent entry${RESET}`);
      return;
    }
    const result = undoLastWrite(dir);
    console.log(result.ok ? `${GREEN}${result.message}${RESET}` : `${DIM}${result.message}${RESET}`);
    return;
  }

  if (positional[0] === "audit") {
    const dir = flags.dir || process.cwd();
    const url = positional[1];
    console.log(`${CYAN}Auditing ${dir}${RESET}\n`);
    const secrets = scanForSecrets(dir);
    if (secrets.length) {
      console.log(`${RED}Possible secrets found:${RESET}`);
      secrets.forEach((s) => {
        const sev =
          s.severity === "high" ? RED : s.severity === "medium" ? YELLOW : DIM;
        console.log(`  ${s.file}: ${s.findings.join(", ")}  ${sev}[${s.severity}]${RESET}`);
      });
    } else {
      console.log(`${GREEN}No obvious hardcoded secrets found.${RESET}`);
    }
    console.log("");
    const { vulnerabilities, note } = checkDependencies(dir);
    if (vulnerabilities) {
      console.log(`${CYAN}Dependency vulnerabilities:${RESET} ${JSON.stringify(vulnerabilities)}`);
    } else {
      console.log(`${DIM}${note || "No dependency audit data."}${RESET}`);
    }
    if (url) {
      console.log(`\n${CYAN}Checking live site: ${url}${RESET}`);
      const findings = await checkLiveSite(url);
      findings.length
        ? findings.forEach((f) => console.log(`  ${YELLOW}⚠ ${f}${RESET}`))
        : console.log(`${GREEN}No issues found in passive checks.${RESET}`);
    }
    printSupportFooter();
    return;
  }

  if (positional[0] === "monitor") {
    const url = positional[1];
    if (!url) {
      console.log("Usage: jagx monitor <url> [--interval seconds]");
      return;
    }
    return monitorUrl(url, flags.interval || 60);
  }

  if (positional[0] === "plugin") {
    const sub = positional[1];
    if (sub === "list") {
      const names = Object.keys(listPlugins());
      console.log(names.length ? names.join("\n") : "No plugins configured.");
      return;
    }
    if (sub === "remove") {
      removePlugin(positional[2]);
      console.log(`Removed plugin '${positional[2]}'.`);
      return;
    }
    if (sub === "add") {
      const name = positional[2];
      if (name === "resend") {
        if (!flags.key || !flags.from) {
          console.log(
            "Usage: jagx plugin add resend --key YOUR_RESEND_KEY --from you@yourdomain.com",
          );
          return;
        }
        setPlugin("resend", { key: flags.key, from: flags.from });
        console.log(
          "Resend plugin configured. The coding agent can now propose emails (still always confirmed before sending).",
        );
        return;
      }
      if (name === "supabase") {
        if (!flags.url || !flags.key) {
          console.log(
            "Usage: jagx plugin add supabase --url YOUR_SUPABASE_URL --key YOUR_SERVICE_KEY",
          );
          return;
        }
        setPlugin("supabase", { url: flags.url, key: flags.key });
        console.log("Supabase plugin configured.");
        return;
      }
      if (name === "x" || name === "twitter") {
        const token = flags.token || flags.key;
        if (!token) {
          console.log("Usage: jagx plugin add x --token YOUR_BEARER_TOKEN");
          return;
        }
        setPlugin("x", { token });
        console.log("X plugin configured. Posts still confirm unless --allow-social.");
        return;
      }
      if (name === "webhook") {
        if (!flags.url) {
          console.log("Usage: jagx plugin add webhook --url https://your-discord-or-slack-webhook");
          return;
        }
        setPlugin("webhook", { url: flags.url, token: flags.token || flags.key });
        console.log("Webhook plugin configured.");
        return;
      }
      console.log("Supported plugins: resend, supabase, x, webhook");
      return;
    }
    console.log("Usage: jagx plugin add|list|remove ...");
    return;
  }

  if (positional[0] === "providers") {
    console.log(`Available providers: ${PROVIDERS.join(", ")}`);
    console.log(
      `Set one with:   jagx config --provider <name> --key YOUR_KEY [--model MODEL_NAME]`,
    );
    console.log(`Back to default: jagx config --provider jagx`);
    return;
  }

  if (positional[0] === "config") {
    if (flags.provider) {
      if (!PROVIDERS.includes(flags.provider)) {
        console.log(`Unknown provider '${flags.provider}'. Available: ${PROVIDERS.join(", ")}`);
        return;
      }
      if (flags.provider !== "jagx" && !flags.key) {
        console.log(
          `Usage: jagx config --provider ${flags.provider} --key YOUR_KEY [--model MODEL_NAME]`,
        );
        return;
      }
      setProvider(flags.provider, flags.key, flags.model);
      console.log(
        `Provider set to ${flags.provider}${flags.model ? ` (model: ${flags.model})` : ""}.`,
      );
      const rec = recommendAfterConnect(flags.provider);
      if (rec && !flags.model) {
        console.log(`\nRecommended model for ${flags.provider}:`);
        console.log(`  ${rec.id}`);
        console.log(`  best for: ${rec.bestFor}`);
        console.log(`  (${rec.why})`);
        console.log(`\nApply it:`);
        console.log(`  jagx config --provider ${flags.provider} --key YOUR_KEY --model ${rec.id}`);
      }
      console.log(`\nAll picks: jagx models ${flags.provider}`);
      return;
    }
    if (flags.key) {
      saveConfig({ apiKey: flags.key });
      console.log("API key saved.");
    } else {
      console.log(
        "Usage: jagx config --key YOUR_API_KEY   or   jagx config --provider <name> --key YOUR_KEY",
      );
    }
    return;
  }

  if (positional[0] === "modes") {
    console.log(MODES.join("\n"));
    return;
  }

  if (positional[0] === "code") {
    const rest = positional.slice(1);
    if (rest[0] === "status") {
      const dir = flags.dir || process.cwd();
      const st = getSessionStatus(dir);
      if (!st) {
        console.log(`${DIM}No active agent session in ${dir}${RESET}`);
        return;
      }
      console.log(`${CYAN}Agent session${RESET} — ${dir}`);
      console.log(`  Task: ${st.task}`);
      console.log(`  Steps so far: ${st.totalSteps}`);
      console.log(`  History turns: ${st.historyTurns}`);
      if (st.hasPlan) console.log(`  Plan:\n${DIM}${st.planPreview}${RESET}`);
      console.log(`\n${DIM}jagx code "continue"  |  jagx code clear-session${RESET}`);
      return;
    }
    if (rest[0] === "clear-session") {
      const dir = flags.dir || process.cwd();
      const ok = clearSession(dir);
      console.log(
        ok
          ? `${GREEN}Cleared agent session in ${dir}${RESET}`
          : `${DIM}No session to clear in ${dir}${RESET}`,
      );
      return;
    }
    const task = rest.join(" ").trim();
    if (!task) {
      console.log(
        'Usage: jagx code "describe the task" [--dir path] [--max-steps n] [--approval mode] [--dry-run] [--review]',
      );
      return;
    }
    if (flags.approval && !APPROVAL_MODES.includes(flags.approval)) {
      console.log(
        `Unknown approval mode '${flags.approval}'. Use one of: ${APPROVAL_MODES.join(", ")}`,
      );
      return;
    }
    maybeNoticeDemoKey();
    if (flags.team) {
      return runGroupSession(task, {
        workdir: flags.dir || process.cwd(),
        groupName: flags.name || "jagx-project",
        maxSteps: flags.maxSteps || 10,
        auto: flags.auto,
        approval: flags.approval,
        dryRun: !!flags.dryRun,
      });
    }
    return runCodeAgent(task, {
      workdir: flags.dir || process.cwd(),
      maxSteps: flags.maxSteps,
      auto: flags.auto,
      approval: flags.approval,
      dryRun: !!flags.dryRun,
      review: !!flags.review,
      stream: !!flags.stream,
    });
  }

  const message = positional.join(" ").trim();
  if (message) {
    maybeNoticeDemoKey();
    return oneShot(message, mode, { stream: !!flags.stream });
  }
  return interactive(mode);
}

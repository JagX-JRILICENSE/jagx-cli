import readline from "node:readline";
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

export const DIM = "\x1b[2m";
export const CYAN = "\x1b[36m";
export const GREEN = "\x1b[32m";
export const RED = "\x1b[31m";
export const YELLOW = "\x1b[33m";
export const RESET = "\x1b[0m";

export const PROVIDERS = ["jagx", "anthropic", "openai", "nvidia", "openrouter", "groq"];
export const APPROVAL_MODES = ["suggest", "auto-edit", "full-auto"];

export function printHelp() {
  const v = getVersion();
  console.log(`
${CYAN}jagx-cli${RESET} v${v} — talk to JagX AI from your terminal

Usage:
  jagx                            Start an interactive session
  jagx "your message"             Ask a one-off question
  jagx --mode <name> "message"    Ask using a specific mode
  jagx config --key <apikey>      Save your JagX API key
  jagx config --provider <name> --key <key> [--model <model>]
                                   Use your own key (anthropic, openai, nvidia, openrouter, groq)
  jagx providers                  List supported providers
  jagx modes                      List available modes
  jagx version                    Print version
  jagx doctor                     Check environment, keys, tools, backend
  jagx init                       Scaffold AGENTS.md + jagx.config.json in cwd
  jagx models [provider]          Free/paid model picks (nvidia, openrouter, groq, …)
  jagx team "task"                Multi-agent team (legacy runner)
  jagx group "task"               Project GROUP (hands-off): scaffold first, done + rework
  jagx group chat                 Interactive group room (/run /board /last /@role)
  jagx group board                Show last work board
  jagx group last                 Print latest group transcript
  jagx features                   List shipped capabilities (100)
  jagx roadmap                    What still separates JagX from Cursor/Codex-class agents
  jagx blueprint "system"         Write docs/ARCHITECTURE.md
  jagx email --to a@b.c --subject "…" --text "…"
  jagx x "shipped v3"             Post to X (needs plugin)
  jagx supabase --table items     Query Supabase (needs plugin)
  jagx memory clear               Clear durable project memory in .jagx/memory
  jagx ledger                     Token/cost usage estimates
  jagx skills                     List skill packs (.jagx/skills/*.md)
  jagx skills init                Create example testing skill
  jagx image "prompt" [--name f]  Generate image into assets/
  jagx code status                Show saved agent session for this folder
  jagx code "task"                Coding agent: plans, then reads/writes files and runs commands
  jagx code "continue"            Resumes the saved session in this folder
  jagx code clear-session         Delete saved agent session in this folder
  jagx undo                       Reverts the last file the agent wrote in this folder
  jagx undo --list                Show write backup history
  jagx audit [url] [--dir path]   Scan for secrets, vulnerable deps, and (optionally) a live site
  jagx monitor <url> [--interval seconds]   Watch a URL's uptime/status live
  jagx plugin add resend --key <key> --from <email>
  jagx plugin add supabase --url <url> --key <key>
  jagx plugin list / remove <name>
  jagx theme [name]               Show or set the terminal color theme
  jagx support                    Show ways to support this project
  jagx --help                     Show this help

Coding agent flags:
  --dir <path>          Project folder (default: current directory)
  --max-steps <n>       Stop after n tool steps this run (default: 40, or jagx.config.json)
  --approval <mode>     suggest (default) | auto-edit | full-auto
  --auto                 Shorthand for --approval full-auto
  --dry-run              Show the plan, diffs, and commands — apply nothing
  --review               Read-only review: plan + inspect only (no writes, no shell)
  --team                 Alias: run multi-agent group for this task
  --stream               Stream tokens (chat) / show step timings (agent)
  --ask                  Group: require y/n (default is hands-off auto-approve)
  --hands-off            Group: agents approve their own writes (default)
  --allow-social         Allow email/X/webhook without extra prompt (still needs plugins)

Destructive commands and email sends are always confirmed, in every approval mode.

Drop an AGENTS.md or JAGX.md in your project root and the agent reads it automatically.

For reliable coding agent runs, prefer:
  jagx config --provider anthropic --key sk-ant-...

In an interactive chat session:
  /mode <name>   Switch mode
  /clear         Clear conversation history
  /help          Show commands
  /exit          Quit
`);
}

export function printSupport() {
  printSupportFull();
}

export function maybeNoticeDemoKey() {
  if (getProvider() === "jagx" && usingDemoKey()) {
    console.log(
      `${DIM}Using JagX's shared demo key (rate-limited). For your own key: jagx config --key YOUR_KEY${RESET}\n`,
    );
  }
}

export function parseArgs(argv) {
  const out = { mode: null, positional: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mode" || a === "-m") out.mode = argv[++i];
    else if (a === "--key") out.flags.key = argv[++i];
    else if (a === "--provider") out.flags.provider = argv[++i];
    else if (a === "--model") out.flags.model = argv[++i];
    else if (a === "--dir") out.flags.dir = argv[++i];
    else if (a === "--max-steps") out.flags.maxSteps = parseInt(argv[++i], 10);
    else if (a === "--approval") out.flags.approval = argv[++i];
    else if (a === "--auto") out.flags.auto = true;
    else if (a === "--dry-run") out.flags.dryRun = true;
    else if (a === "--review") out.flags.review = true;
    else if (a === "--stream") out.flags.stream = true;
    else if (a === "--team") out.flags.team = true;
    else if (a === "--name") out.flags.name = argv[++i];
    else if (a === "--ask") out.flags.ask = true;
    else if (a === "--hands-off") out.flags.handsOff = true;
    else if (a === "--skip-kickoff") out.flags.skipKickoff = true;
    else if (a === "--allow-social") out.flags.allowSocial = true;
    else if (a === "--to") out.flags.to = argv[++i];
    else if (a === "--subject") out.flags.subject = argv[++i];
    else if (a === "--text") out.flags.text = argv[++i];
    else if (a === "--table") out.flags.table = argv[++i];
    else if (a === "--token") out.flags.token = argv[++i];
    else if (a === "--query") out.flags.query = argv[++i];
    else if (a === "--method") out.flags.method = argv[++i];
    else if (a === "--in-reply-to") out.flags.inReplyTo = argv[++i];
    else if (a === "--force") out.flags.force = true;
    else if (a === "--list") out.flags.list = true;
    else if (a === "--interval") out.flags.interval = parseInt(argv[++i], 10);
    else if (a === "--from") out.flags.from = argv[++i];
    else if (a === "--url") out.flags.url = argv[++i];
    else if (a === "--help" || a === "-h") out.flags.help = true;
    else if (a === "--version" || a === "-v") out.flags.version = true;
    else out.positional.push(a);
  }
  return out;
}

export async function oneShot(message, mode, { stream = false } = {}) {
  const persona = mode && mode !== "core" ? `(Respond in ${mode} mode.) ` : "";
  if (stream) {
    process.stdout.write(`${DIM}streaming…${RESET}\n`);
    const system = "You are JagX AI, a helpful assistant by JagX & JRILICENSE.";
    const { response, quota } = await streamChat({
      system,
      messages: [{ role: "user", content: persona + message }],
      onToken: (chunk) => process.stdout.write(chunk),
    });
    process.stdout.write("\n");
    if (quota) console.log(`\n${DIM}${quota}${RESET}`);
    printSupportFooter();
    return;
  }
  process.stdout.write(`${DIM}thinking…${RESET}\r`);
  const { response, quota } = await sendMessage(persona + message, [], mode);
  process.stdout.write(" ".repeat(20) + "\r");
  console.log(response);
  if (quota) console.log(`\n${DIM}${quota}${RESET}`);
  printSupportFooter();
}

export async function interactive(initialMode) {
  let mode = initialMode || getDefaultMode();
  const history = [];

  printBanner();
  maybeNoticeDemoKey();
  console.log(
    `${CYAN}JagX AI${RESET} — provider: ${GREEN}${getProvider()}${RESET}, mode: ${GREEN}${mode}${RESET}. Type ${DIM}/help${RESET} for commands.\n`,
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${CYAN}you>${RESET} `,
  });
  rl.prompt();

  rl.on("line", async (line) => {
    const text = line.trim();
    if (!text) return rl.prompt();

    if (text.startsWith("/")) {
      const [cmd, ...rest] = text.slice(1).split(" ");
      if (cmd === "exit" || cmd === "quit") {
        rl.close();
        return;
      }
      if (cmd === "clear") {
        history.length = 0;
        console.log(`${DIM}history cleared${RESET}`);
        return rl.prompt();
      }
      if (cmd === "mode") {
        const next = rest.join(" ").trim();
        if (MODES.includes(next)) {
          mode = next;
          console.log(`${DIM}mode set to ${next}${RESET}`);
        } else console.log(`${DIM}unknown mode. Available: ${MODES.join(", ")}${RESET}`);
        return rl.prompt();
      }
      if (cmd === "help") {
        printHelp();
        return rl.prompt();
      }
      console.log(`${DIM}unknown command: /${cmd}${RESET}`);
      return rl.prompt();
    }

    rl.pause();
    try {
      const persona = mode !== "core" ? `(Respond in ${mode} mode.) ` : "";
      process.stdout.write(`${DIM}thinking…${RESET}\r`);
      const { response, quota } = await sendMessage(persona + text, history, mode);
      process.stdout.write(" ".repeat(20) + "\r");
      console.log(`${GREEN}jagx>${RESET} ${response}\n`);
      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: response });
      if (history.length > 24) history.splice(0, history.length - 24);
      if (quota) console.log(`${DIM}${quota}${RESET}`);
      printSupportFooter();
      console.log("");
    } catch (err) {
      console.log(`${RED}${err.message}${RESET}\n`);
    } finally {
      rl.resume();
      rl.prompt();
    }
  });

  rl.on("close", () => {
    console.log(`${DIM}goodbye${RESET}`);
    process.exit(0);
  });
}

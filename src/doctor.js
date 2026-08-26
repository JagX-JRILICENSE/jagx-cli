import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getProvider, getProviderKey, getApiKey, usingDemoKey, getBaseUrl, loadConfig } from "./config.js";
import { listPlugins } from "./plugins.js";

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function ok(msg) {
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}
function warn(msg) {
  console.log(`  ${YELLOW}!${RESET} ${msg}`);
}
function bad(msg) {
  console.log(`  ${RED}✗${RESET} ${msg}`);
}
function hasBinary(name) {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [name], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

export async function runDoctor() {
  console.log(`${CYAN}jagx doctor${RESET} — environment check\n`);

  // Node
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor >= 18) ok(`Node.js ${process.versions.node}`);
  else bad(`Node.js ${process.versions.node} (need >= 18)`);

  // Provider
  const provider = getProvider();
  console.log(`\n${DIM}Provider${RESET}`);
  ok(`Active provider: ${provider}`);
  if (provider === "jagx") {
    if (usingDemoKey()) warn("Using shared demo key (rate-limited). Set your own: jagx config --key YOUR_KEY");
    else ok("Custom JagX API key configured");
    ok(`Base URL: ${getBaseUrl()}`);
  } else {
    if (getProviderKey(provider)) ok(`${provider} API key present`);
    else bad(`No API key for ${provider}. Run: jagx config --provider ${provider} --key YOUR_KEY`);
    if (provider === "anthropic" || provider === "openai") {
      ok("Native tool calling available for coding agent (recommended)");
    } else {
      warn("This provider uses prompt-JSON tools — Anthropic/OpenAI are more reliable for jagx code");
    }
  }

  // Config dir
  console.log(`\n${DIM}Config${RESET}`);
  const cfgDir = path.join(os.homedir(), ".jagx");
  if (fs.existsSync(cfgDir)) ok(`Config dir: ${cfgDir}`);
  else warn(`No config dir yet (${cfgDir}) — will be created on first config save`);
  const cfg = loadConfig();
  if (cfg.theme) ok(`Theme: ${cfg.theme}`);

  // Tools
  console.log(`\n${DIM}System tools${RESET}`);
  if (hasBinary("rg")) ok("ripgrep (rg) — fast search_code");
  else if (hasBinary("grep")) warn("ripgrep not found — falling back to grep / JS search");
  else warn("No rg/grep — search_code uses pure JS walk");
  if (hasBinary("git")) ok("git available");
  else warn("git not found — commit offers disabled");
  try {
    await import("playwright");
    ok("playwright available — headless preview enabled");
  } catch {
    warn("playwright not installed — preview_url uses HTTP fetch (optional: npm i -D playwright)");
  }

  // Plugins
  console.log(`\n${DIM}Plugins${RESET}`);
  const plugins = listPlugins();
  const names = Object.keys(plugins);
  if (names.length) names.forEach((n) => ok(`Plugin: ${n}`));
  else console.log(`  ${DIM}(none configured)${RESET}`);

  // Network smoke (JagX only, short timeout)
  if (provider === "jagx") {
    console.log(`\n${DIM}Backend${RESET}`);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(getBaseUrl() + "/", { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) ok(`JagX backend reachable (${res.status})`);
      else warn(`JagX backend responded ${res.status}`);
    } catch (e) {
      bad(`JagX backend unreachable: ${e.message}`);
    }
  }

  // Agent recommendation
  console.log(`\n${DIM}Recommendation${RESET}`);
  if (provider === "jagx") {
    console.log(
      `  For coding agent reliability: ${CYAN}jagx config --provider anthropic --key sk-ant-...${RESET}`,
    );
  } else {
    console.log(`  ${GREEN}Provider looks good for jagx code.${RESET}`);
  }
  console.log("");
}

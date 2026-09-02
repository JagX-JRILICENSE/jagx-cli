import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getProvider, getProviderKey, usingDemoKey, getBaseUrl, loadConfig } from "./config.js";
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

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor >= 18) ok(`Node.js ${process.versions.node}`);
  else bad(`Node.js ${process.versions.node} (need >= 18)`);

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

  console.log(`\n${DIM}Free / cheap providers${RESET}`);
  for (const p of ["groq", "openrouter", "nvidia"]) {
    if (getProviderKey(p)) ok(`${p} key present`);
    else console.log(`  ${DIM}· ${p} — jagx config --provider ${p} --key YOUR_KEY${RESET}`);
  }
  console.log(`  ${DIM}After connect: jagx models <provider>${RESET}`);

  console.log(`\n${DIM}Config${RESET}`);
  const cfgDir = path.join(os.homedir(), ".jagx");
  if (fs.existsSync(cfgDir)) ok(`Config dir: ${cfgDir}`);
  else warn(`No config dir yet (${cfgDir}) — will be created on first config save`);
  const cfg = loadConfig();
  if (cfg.theme) ok(`Theme: ${cfg.theme}`);

  console.log(`\n${DIM}Modules${RESET}`);
  try {
    const g = await import("./group.js");
    if (typeof g.runGroupSession === "function") ok("group multi-agent module loaded");
    else warn("group module missing runGroupSession");
  } catch (e) {
    bad(`group module: ${e.message}`);
  }
  try {
    const c = await import("./code.js");
    if (typeof c.runCodeAgent === "function") ok("code agent module loaded");
  } catch (e) {
    bad(`code module: ${e.message}`);
  }

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

  console.log(`\n${DIM}Plugins${RESET}`);
  const plugins = listPlugins();
  const names = Object.keys(plugins);
  if (names.length) names.forEach((n) => ok(`Plugin: ${n}`));
  else console.log(`  ${DIM}(none configured)${RESET}`);

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

  console.log(`\n${DIM}Recommendation${RESET}`);
  if (provider === "jagx") {
    console.log(
      `  Coding reliability: ${CYAN}jagx config --provider anthropic --key sk-ant-...${RESET}`,
    );
    console.log(
      `  Free tier try:     ${CYAN}jagx config --provider groq --key gsk_...${RESET}`,
    );
  } else {
    console.log(`  ${GREEN}Provider looks good for jagx code / group.${RESET}`);
  }
  console.log(`  Hands-off build:  ${CYAN}jagx group "your goal"${RESET}`);
  console.log("");
}

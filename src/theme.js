import { loadConfig, saveConfig } from "./config.js";
import { getVersion } from "./version.js";

const THEMES = {
  classic: { primary: "\x1b[36m", accent: "\x1b[32m" },
  matrix: { primary: "\x1b[32m", accent: "\x1b[92m" },
  sunset: { primary: "\x1b[35m", accent: "\x1b[33m" },
  mono: { primary: "\x1b[37m", accent: "\x1b[90m" },
};

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

export function getTheme() {
  const name = loadConfig().theme || "classic";
  return { name, ...(THEMES[name] || THEMES.classic) };
}

export function setTheme(name) {
  if (!THEMES[name]) throw new Error(`Unknown theme '${name}'. Available: ${Object.keys(THEMES).join(", ")}`);
  saveConfig({ theme: name });
  return name;
}

export function listThemes() {
  return Object.keys(THEMES);
}

const BANNER_WIDE = `
     ██╗ █████╗  ██████╗ ██╗  ██╗     █████╗ ██╗
     ██║██╔══██╗██╔════╝ ╚██╗██╔╝    ██╔══██╗██║
     ██║███████║██║  ███╗ ╚███╔╝     ███████║██║
██   ██║██╔══██║██║   ██║ ██╔██╗     ██╔══██║██║
╚█████╔╝██║  ██║╚██████╔╝██╔╝ ██╗    ██║  ██║██║
 ╚════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝`;

export function printBanner() {
  const cfg = loadConfig();
  if (cfg.noBanner) return;
  const { primary } = getTheme();
  const width = process.stdout.columns || 80;
  if (width >= 52) {
    console.log(`${primary}${BANNER_WIDE}${RESET}`);
    console.log(`${DIM}      built by JagX & JRILICENSE — v${getVersion()}${RESET}\n`);
  } else {
    console.log(`${primary}JagX AI${RESET} ${DIM}— built by JagX & JRILICENSE${RESET}\n`);
  }
}

let supportShownThisProcess = false;

const SUPPORT_WALLETS = `
Support JagX AI — built by JagX & JRILICENSE

  USDT / USDC (BEP20): 0x4AAd8C9bb6d83AD67C784dB54F9529F9ADc540aE
  USDT (TRC20):        THZTf29kwrLgv3ydwqbuZbbNPcWvw4JVn1

Thank you. jagx support
`;

/** Print once per process — full account details in the terminal. */
export function printSupportFooter(force = false) {
  if (!force && supportShownThisProcess) return;
  supportShownThisProcess = true;
  console.log(`${DIM}${SUPPORT_WALLETS}${RESET}`);
}

export function printSupportFull() {
  const { primary } = getTheme();
  console.log(`
${primary}Support JagX AI${RESET}
${DIM}built by JagX & JRILICENSE${RESET}

If this CLI helps you ship, you can support the project here:

  ${primary}USDT / USDC (BEP20)${RESET}
  0x4AAd8C9bb6d83AD67C784dB54F9529F9ADc540aE

  ${primary}USDT (TRC20)${RESET}
  THZTf29kwrLgv3ydwqbuZbbNPcWvw4JVn1

Thank you for using JagX AI.
`);
}
